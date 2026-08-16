// 📁 flashmind-ai/src/server/ai/tasks/generateCurriculum.ts
import { Type } from '@google/genai';
import { aiOrchestrator } from '../index';
import { getCurriculum, saveCurriculum } from '../../db/db';

export type EducationLevel = 'fundamental' | 'medio' | 'faculdade' | 'concurso' | 'tecnico';

export interface CurriculumCategory {
  category: string;
  topics: string[];
}

const CURRICULUM_VERSION = 2;

const LEVEL_SYSTEM_SUFFIX: Record<EducationLevel, string> = {
  fundamental: `- Linguagem simples e clara. Conteúdo alinhado à BNCC (1º ao 9º ano).
- Subtópicos devem ser concretos e acessíveis para crianças e adolescentes.`,
  medio: `- Linguagem formal porém acessível. Conteúdo da BNCC para Ensino Médio.
- Priorize tópicos cobrados no ENEM e principais vestibulares brasileiros.`,
  faculdade: `- Linguagem técnica, nível de graduação universitária.
- Subtópicos devem refletir a ementa típica de cursos de graduação no Brasil.
- Inclua fundamentos teóricos, metodologias e aplicações práticas da área.`,
  tecnico: `- Foco em competências práticas e aplicadas.
- Inclua normas técnicas, procedimentos, equipamentos e situações reais de trabalho.
- Conteúdo alinhado ao ensino técnico profissionalizante (SENAI, SENAC, ETECs etc.).`,
  concurso: `- ATENÇÃO ESPECIAL: você está gerando conteúdo para preparação de CONCURSO PÚBLICO.
- Base nos editais reais das principais bancas brasileiras: CESPE/CEBRASPE, FGV, FCC, VUNESP, IBFC, NUCEPE, UEG, FUNRIO.
- Para cargos específicos (Perito Criminal, Delegado, Auditor, Analista, etc.), use o programa dos concursos mais recentes desse cargo.
- Os tópicos devem refletir o conteúdo efetivamente cobrado, com lei seca, jurisprudência, súmulas e pontos de prova.
- Organize por área de conhecimento da forma como aparece nos editais.
- NÃO inclua conteúdos raramente cobrados ou de nível muito teórico/acadêmico.`,
};

function getConcursoContext(subject: string): string {
  const s = subject.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/perito|criminalistica|pericia/.test(s)) return `CONTEXTO ESPECÍFICO — PERITO CRIMINAL:
Considere editais recentes de Perito Criminal das principais Polícias Civis e Federal, cobrindo Criminalística, Documentoscopia, Balística, Toxicologia, Medicina Legal, Informática Forense, Incêndios e Explosões, Química/Biologia Forense, legislação e laudo pericial.`;
  if (/delegado/.test(s)) return `CONTEXTO ESPECÍFICO — DELEGADO DE POLÍCIA:
Considere editais recentes de Polícia Civil e Federal, cobrindo Direito Penal, Processo Penal, Constitucional, Administrativo, legislação especial, Medicina Legal, Criminalística e Direitos Humanos.`;
  if (/auditor|fiscal|receita|tributar/.test(s)) return `CONTEXTO ESPECÍFICO — AUDITOR FISCAL / RECEITA:
Considere editais recentes de Receita Federal, SEFAZ, TCU e TCE, cobrindo Direito Tributário, legislação tributária, contabilidade, auditoria, administrativo, raciocínio lógico e TI quando aplicável.`;
  if (/judiciario|judici|tribunal|trf|tjsp|stj|stf/.test(s)) return `CONTEXTO ESPECÍFICO — JUDICIÁRIO:
Considere editais recentes de STJ, STF, TRF, TRT, TRE e Tribunais estaduais, cobrindo Direito Constitucional, Administrativo, Processual, Português, Raciocínio Lógico, Informática e regimentos.`;
  if (/agente|escrivao|escrivão|investigador/.test(s)) return `CONTEXTO ESPECÍFICO — POLÍCIA:
Considere editais recentes para Agente, Escrivão e Investigador, cobrindo Direito Penal, Processo Penal, Constitucional, legislação especial, Português, Raciocínio Lógico e Informática.`;
  return `CONTEXTO: Use como referência programas e editais recentes da área "${subject}". Gere uma grade ampla e realmente estudável.`;
}

function isLegacyLimited(categories: CurriculumCategory[]): boolean {
  const totalTopics = categories.reduce((sum, category) => sum + category.topics.length, 0);
  // Currículos gerados pela versão anterior tinham no máximo 10 categorias e 8 subtópicos.
  // Reprocessamos os casos pequenos para não perpetuar uma grade artificialmente truncada.
  return categories.length <= 10 && totalTopics <= 40;
}

export async function generateCurriculumTask(args: {
  subject: string;
  educationLevel: EducationLevel;
  language?: string;
}): Promise<{ categories: CurriculumCategory[]; providerUsed: string; cacheHit?: boolean }> {
  const { subject, educationLevel, language = 'pt' } = args;
  const langInstruction = language === 'pt' ? 'em Português do Brasil' : `in ${language}`;
  const levelSuffix = LEVEL_SYSTEM_SUFFIX[educationLevel] ?? LEVEL_SYSTEM_SUFFIX.medio;
  const concursoContext = educationLevel === 'concurso' ? getConcursoContext(subject) : '';

  const systemPrompt = `Você é um especialista em currículo educacional e preparação para concursos públicos brasileiros.
Sua tarefa é gerar uma grade curricular COMPLETA, AMPLA e PRECISA para a matéria/cargo indicado, baseada em conteúdo REAL.

REGRAS OBRIGATÓRIAS:
- Retorne APENAS JSON válido. Sem markdown, sem texto fora do JSON.
- NÃO existe limite artificial de categorias ou subtópicos. Cubra TODOS os assuntos relevantes que um aluno/candidato realmente precisa estudar.
- Organize em categorias/tópicos hierárquicos e não omita subáreas importantes apenas para reduzir a resposta.
- Cada categoria deve conter tantos subtópicos quanto forem necessários para cobrir a área, preferencialmente 5 a 20 quando houver conteúdo suficiente.
- Evite duplicidades e subtópicos vagos como "Revisão Geral", "Introdução a X" ou "Outros temas".
- Cada subtópico deve ser específico e estudável diretamente.

DIRETRIZES DO NÍVEL:
${levelSuffix}
${concursoContext ? '\n' + concursoContext : ''}`;

  const userPrompt = `Gere a grade curricular COMPLETA para: "${subject}"
${educationLevel === 'concurso' ? 'Modalidade: Concurso Público. Considere os conteúdos efetivamente cobrados nos editais recentes.' : ''}

Formato JSON obrigatório:
{
  "categories": [
    {
      "category": "Nome do Tópico",
      "topics": ["Subtópico específico 1", "Subtópico específico 2", "... todos os subtópicos relevantes ..."]
    }
  ]
}

${langInstruction}. Não reduza a quantidade por economia de tokens: a prioridade é cobertura completa da grade.`;

  const geminiSchema = {
    type: Type.OBJECT,
    properties: {
      categories: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            topics: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['category', 'topics'],
        },
      },
    },
    required: ['categories'],
  };

  const cached = await getCurriculum(subject, educationLevel);
  if (cached && !isLegacyLimited(cached.data.categories)) {
    return { categories: cached.data.categories, providerUsed: 'db-cache', cacheHit: true };
  }

  const { data, providerUsed } = await aiOrchestrator.generateJSON({
    systemPrompt,
    userPrompt,
    schemaHint: `{ "categories": [{ "category": string, "topics": string[] }] }`,
    geminiSchema,
  });

  let categories: CurriculumCategory[] = [];
  if (Array.isArray((data as any)?.categories)) {
    categories = (data as any).categories
      .map((category: any) => ({
        category: String(category?.category || '').trim(),
        topics: Array.isArray(category?.topics)
          ? Array.from(new Set(category.topics.filter((topic: unknown): topic is string => typeof topic === 'string' && topic.trim().length > 0).map((topic: string) => topic.trim())))
          : [],
      }))
      .filter((category: CurriculumCategory) => category.category && category.topics.length > 0);
  }

  if (categories.length === 0) throw new Error('IA não retornou categorias válidas para o currículo.');

  // A versão fica registrada para futuras migrações; não limita a quantidade retornada.
  void CURRICULUM_VERSION;
  saveCurriculum(subject, educationLevel, categories, providerUsed).catch(() => {});
  return { categories, providerUsed, cacheHit: false };
}
