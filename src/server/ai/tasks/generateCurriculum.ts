// 📁 flashmind-ai/src/server/ai/tasks/generateCurriculum.ts
import { Type } from '@google/genai';
import { aiOrchestrator } from '../index';
import { getCurriculum, saveCurriculum } from '../../db/db';

export type EducationLevel = 'fundamental' | 'medio' | 'faculdade' | 'concurso' | 'tecnico';
export interface CurriculumCategory { category: string; topics: string[]; }
const CURRICULUM_VERSION = 2;

const LEVEL_SYSTEM_SUFFIX: Record<EducationLevel, string> = {
  fundamental: '- Linguagem simples e clara. Conteúdo alinhado à BNCC (1º ao 9º ano).',
  medio: '- Linguagem formal porém acessível. Conteúdo da BNCC para Ensino Médio. Priorize ENEM e vestibulares.',
  faculdade: '- Linguagem técnica de graduação. Inclua fundamentos, metodologias e aplicações práticas.',
  tecnico: '- Foco prático. Inclua normas, procedimentos, equipamentos e situações reais de trabalho.',
  concurso: '- Base em editais reais das principais bancas brasileiras. Inclua lei seca, jurisprudência, súmulas, pegadinhas e pontos efetivamente cobrados.',
};

function getConcursoContext(subject: string): string {
  const s = subject.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/perito|criminalistica|pericia/.test(s)) return 'PERITO CRIMINAL: cubra Criminalística, Documentoscopia, Balística, Toxicologia, Medicina Legal, Informática Forense, Incêndios/Explosões, Química/Biologia Forense, legislação e laudo pericial.';
  if (/delegado/.test(s)) return 'DELEGADO: cubra Direito Penal, Processo Penal, Constitucional, Administrativo, legislação especial, Medicina Legal, Criminalística e Direitos Humanos.';
  if (/auditor|fiscal|receita|tributar/.test(s)) return 'AUDITOR/RECEITA: cubra Direito Tributário, legislação tributária, contabilidade, auditoria, administrativo, raciocínio lógico e TI quando aplicável.';
  if (/judiciario|judici|tribunal|trf|tjsp|stj|stf/.test(s)) return 'JUDICIÁRIO: cubra Direito Constitucional, Administrativo, Processual, Português, Raciocínio Lógico, Informática e regimentos.';
  if (/agente|escrivao|escrivão|investigador/.test(s)) return 'POLÍCIA: cubra Direito Penal, Processo Penal, Constitucional, legislação especial, Português, Raciocínio Lógico e Informática.';
  return `Use programas e editais recentes da área "${subject}" e cubra toda a extensão relevante.`;
}

export async function generateCurriculumTask(args: { subject: string; educationLevel: EducationLevel; language?: string }): Promise<{ categories: CurriculumCategory[]; providerUsed: string; cacheHit?: boolean }> {
  const { subject, educationLevel, language = 'pt' } = args;
  const levelSuffix = LEVEL_SYSTEM_SUFFIX[educationLevel] ?? LEVEL_SYSTEM_SUFFIX.medio;
  const concursoContext = educationLevel === 'concurso' ? getConcursoContext(subject) : '';
  const langInstruction = language === 'pt' ? 'em Português do Brasil' : `in ${language}`;

  const systemPrompt = `Você é especialista em currículo educacional brasileiro. Gere uma grade COMPLETA, AMPLA e PRECISA para a matéria/cargo indicado.

REGRAS OBRIGATÓRIAS:
- Retorne apenas JSON válido.
- NÃO existe limite artificial de categorias ou subtópicos. Cubra TODOS os assuntos relevantes.
- Organize por tópicos principais (categories) e subtópicos (topics).
- Não omita subáreas importantes para economizar tokens.
- Use tantos subtópicos quanto forem necessários; em matérias amplas, normalmente 5–20 por tópico.
- Não use "Revisão Geral", "Introdução", "Outros temas" ou itens vagos.
- Não repita o mesmo subtópico.

NÍVEL:
${levelSuffix}
${concursoContext ? `\nCONTEXTO: ${concursoContext}` : ''}`;

  const userPrompt = `Gere a grade curricular COMPLETA para "${subject}".
${educationLevel === 'concurso' ? 'Modalidade: Concurso Público. Considere conteúdos efetivamente cobrados em editais recentes.' : ''}
Formato:
{"categories":[{"category":"Tópico principal","topics":["Subtópico 1","Subtópico 2","...todos os subtópicos relevantes..."]}]}

Idioma: ${langInstruction}. Priorize cobertura completa, não quantidade mínima.`;

  const geminiSchema = {
    type: Type.OBJECT,
    properties: {
      categories: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, topics: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['category', 'topics'] } },
    },
    required: ['categories'],
  };

  const cached = await getCurriculum(subject, educationLevel);
  // Somente currículos gravados pela versão 2 são considerados completos.
  // Currículos antigos sem version são regenerados uma vez e migrados.
  if (cached && cached.data.version === CURRICULUM_VERSION) {
    return { categories: cached.data.categories, providerUsed: 'db-cache', cacheHit: true };
  }

  const { data, providerUsed } = await aiOrchestrator.generateJSON({ systemPrompt, userPrompt, schemaHint: '{ "categories": [{ "category": string, "topics": string[] }] }', geminiSchema });
  const categories: CurriculumCategory[] = Array.isArray((data as any)?.categories)
    ? (data as any).categories.map((c: any) => ({
        category: String(c?.category || '').trim(),
        topics: Array.from(new Set(Array.isArray(c?.topics) ? c.topics.filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0).map((t: string) => t.trim()) : [])),
      })).filter((c: CurriculumCategory) => c.category && c.topics.length)
    : [];
  if (!categories.length) throw new Error('IA não retornou categorias válidas para o currículo.');
  await saveCurriculum(subject, educationLevel, categories, providerUsed);
  return { categories, providerUsed, cacheHit: false };
}
