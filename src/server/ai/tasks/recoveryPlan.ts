import { Type } from '@google/genai';
import { aiOrchestrator } from '../index';
import { withCache, CACHE_TTL } from '../cache/aiCache';

export async function recoveryPlanTask(args: { weakTopics?: string[]; studentName?: string; language?: string }) {
  const { weakTopics = [], studentName = 'Estudante', language = 'pt' } = args;
  const langInstruction = language === 'pt' ? 'em Português' : `in ${language}`;

  const systemPrompt = `Você é o especialista do MemoriaFlash em Neurociência e Planos de Recuperação Personalizados.
Analise os tópicos fracos do aluno (${weakTopics.join(', ') || 'Geral'}) e crie um plano de estudo estruturado de 5 a 7 dias para fechar essas lacunas de conhecimento ${langInstruction}.`;

  const schemaHint = `{ "estimatedSuccessRate": number, "aiInsightMessage": string, "days": [{ "dayNumber": number, "dayLabel": string, "title": string, "focusBadge": string, "description": string, "cardCount"?: number }] }`;

  const geminiSchema = {
    type: Type.OBJECT,
    properties: {
      estimatedSuccessRate: { type: Type.INTEGER },
      aiInsightMessage: { type: Type.STRING },
      days: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            dayNumber: { type: Type.INTEGER },
            dayLabel: { type: Type.STRING },
            title: { type: Type.STRING },
            focusBadge: { type: Type.STRING },
            description: { type: Type.STRING },
            cardCount: { type: Type.INTEGER },
          },
          required: ['dayNumber', 'dayLabel', 'title', 'focusBadge', 'description'],
        },
      },
    },
    required: ['estimatedSuccessRate', 'aiInsightMessage', 'days'],
  };

  // Note: `studentName` fica DE FORA da chave de cache de propósito — o
  // plano em si depende só dos tópicos fracos, não de quem está pedindo,
  // então dois alunos com as mesmas dificuldades reaproveitam o mesmo plano.
  const result = await withCache(
    'recoveryPlan',
    { weakTopics: [...weakTopics].sort(), language },
    CACHE_TTL.RECOVERY_PLAN,
    async () => {
      const { data, providerUsed } = await aiOrchestrator.generateJSON({
        systemPrompt,
        userPrompt: `Gere um plano de recuperação de 5 dias para o aluno ${studentName} focado em: ${weakTopics.join(', ')}.`,
        schemaHint,
        geminiSchema,
      });
      return { plan: data, providerUsed };
    }
  );

  return { ...result, providerUsed: result.cacheHit ? 'cache' : result.providerUsed };
}
