// 📁 flashmind-ai/src/server/ai/tasks/scannerAnalyze.ts
import { Type } from '@google/genai';
import { aiOrchestrator } from '../index';
import { extractArrayField } from '../jsonUtils';

export interface ScannerAnalysisResult {
  subject: string;
  subjectDescription: string;
  topics: Array<{
    id: string;
    title: string;
    description: string;
    cardEstimate: number;
  }>;
  totalEstimate: number;
  providerUsed?: string;
}

/**
 * Analisa o conteúdo extraído de um documento e retorna:
 *  - Matéria/disciplina identificada automaticamente
 *  - Lista de tópicos encontrados no conteúdo
 *  - Estimativa de flashcards por tópico
 */
export async function scannerAnalyzeTask(args: {
  content: string;
  subjectHint?: string;
  language?: string;
}): Promise<ScannerAnalysisResult> {
  const { content, subjectHint = '', language = 'pt' } = args;

  const langInstruction = language === 'pt' ? 'em Português Brasileiro' : `in ${language}`;

  const systemPrompt = `Você é um especialista pedagógico em análise de materiais educacionais.
Sua tarefa é analisar o conteúdo de um documento e:
1. Identificar a matéria/disciplina principal
2. Extrair os tópicos e subtópicos presentes no conteúdo
3. Estimar quantos flashcards cada tópico pode gerar

REGRAS CRÍTICAS:
- Identifique a matéria com base no conteúdo real, não em suposições
- Liste APENAS tópicos que realmente aparecem no documento
- Seja específico: "Mitose e Meiose" em vez de "Biologia Celular"
- Estime de forma realista (5-20 cards por tópico)
- Responda ${langInstruction}`;

  const truncatedContent = content.slice(0, 12000);
  const subjectContext = subjectHint ? `\nMatéria informada pelo usuário (use como dica): "${subjectHint}"` : '';

  const userPrompt = `Analise o seguinte conteúdo de documento e retorne a estrutura JSON solicitada.${subjectContext}

CONTEÚDO DO DOCUMENTO:
${truncatedContent}

Retorne um JSON com:
- subject: nome da matéria/disciplina identificada (ex: "Biologia", "Direito Constitucional", "Cálculo")
- subjectDescription: breve descrição do que o material cobre (1-2 frases)
- topics: array de tópicos encontrados, cada um com:
  - id: identificador único (slug, ex: "mitose-meiose")
  - title: título do tópico
  - description: o que este tópico aborda no documento (1 frase)
  - cardEstimate: estimativa de flashcards que este tópico pode gerar (5-20)
- totalEstimate: soma total de cards estimados`;

  const schemaHint = `{
  "subject": string,
  "subjectDescription": string,
  "topics": [{ "id": string, "title": string, "description": string, "cardEstimate": number }],
  "totalEstimate": number
}`;

  const geminiSchema = {
    type: Type.OBJECT,
    properties: {
      subject: { type: Type.STRING },
      subjectDescription: { type: Type.STRING },
      topics: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            cardEstimate: { type: Type.NUMBER },
          },
          required: ['id', 'title', 'description', 'cardEstimate'],
        },
        minItems: 2,
        maxItems: 15,
      },
      totalEstimate: { type: Type.NUMBER },
    },
    required: ['subject', 'subjectDescription', 'topics', 'totalEstimate'],
  };

  const { data, providerUsed } = await aiOrchestrator.generateJSON({
    systemPrompt,
    userPrompt,
    schemaHint,
    geminiSchema,
  });

  const d = data as any;

  // Normaliza e valida
  const topics: ScannerAnalysisResult['topics'] = Array.isArray(d?.topics)
    ? d.topics.map((t: any, i: number) => ({
        id: t.id || `topic-${i}`,
        title: t.title || `Tópico ${i + 1}`,
        description: t.description || '',
        cardEstimate: Math.max(5, Math.min(30, Number(t.cardEstimate) || 10)),
      }))
    : [];

  const totalEstimate = topics.reduce((sum, t) => sum + t.cardEstimate, 0);

  return {
    subject: d?.subject || subjectHint || 'Conteúdo do Documento',
    subjectDescription: d?.subjectDescription || '',
    topics,
    totalEstimate,
    providerUsed,
  };
}
