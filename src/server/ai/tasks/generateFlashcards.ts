import { Type } from '@google/genai';
import { aiOrchestrator } from '../index';
import { withCache, CACHE_TTL } from '../cache/aiCache';
import { extractArrayField } from '../jsonUtils';

/**
 * Normaliza uma pergunta para comparação de duplicatas: minúsculas, sem
 * acentuação, sem pontuação/espaços extras. Duas perguntas quase idênticas
 * (variando só maiúscula/pontuação) caem na mesma chave.
 */
export function normalizeForDedup(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Rede de segurança determinística para a regra 6 do prompt: apesar da
 * instrução explícita, modelos às vezes ainda geram "explanation" que só
 * repete/parafraseia "back" (ex.: back="Paris" / explanation="A capital da
 * França é Paris."). Quando isso é detectado — o texto de "back" aparece
 * quase inteiro dentro de "explanation" sem nada além disso — substituímos
 * por um aviso didático em vez de mostrar uma explicação vazia de conteúdo.
 */
export function explanationJustRepeatsAnswer(back: string, explanation: string): boolean {
  const normBack = normalizeForDedup(back);
  // Remove os rótulos fixos que nós mesmos injetamos no prompt (regra 4) —
  // "explicacao"/"curiosidade" não são conteúdo gerado pelo modelo, então
  // não devem contar como "texto novo" ao medir o quanto sobra além da
  // resposta.
  const normExpl = normalizeForDedup(explanation)
    .replace(/\bexplicacao\b/g, '')
    .replace(/\bcuriosidade\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normBack || !normExpl) return false;

  // Resposta curta repetida 2+ vezes na explicação: forte sinal de que o
  // modelo só ficou reafirmando a resposta em vez de explicar algo novo.
  const occurrences = normExpl.split(normBack).length - 1;
  if (occurrences >= 2 && normBack.length >= 2) return true;

  // Caso geral: quanto sobra da explicação depois de remover o texto da
  // resposta? Se sobrar muito pouco, a "explicação" é essencialmente só a
  // resposta com enfeites, sem conteúdo didático novo.
  const remainder = normExpl.split(normBack).join(' ').replace(/\s+/g, ' ').trim();
  const remainderRatio = remainder.length / Math.max(normExpl.length, 1);
  const containsBack = normExpl.includes(normBack);
  return containsBack && remainderRatio < 0.35;
}

export type EducationLevel = 'escola' | 'faculdade' | 'concurso' | 'tecnico';

const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  escola: 'Educação Básica / Escola (Ensino Fundamental e Médio) — linguagem simples, clara e didática, sem jargão técnico avançado',
  faculdade: 'Ensino Superior / Faculdade — linguagem técnica e aprofundada, nível de graduação',
  concurso: 'Preparação para Concurso Público — foco em precisão de lei seca, jurisprudência/entendimento consolidado e pegadinhas comuns de banca examinadora (estilo CESPE/FGV/FCC), redigido como questão objetiva de prova',
  tecnico: 'Curso Técnico / Ensino Técnico Profissionalizante — foco prático, aplicado e voltado para procedimentos e uso real no dia a dia de trabalho, evitando teoria excessiva',
};

export async function generateFlashcardsTask(args: {
  prompt: string;
  count?: number;
  language?: string;
  difficulty?: string;
  selectedTopics?: string[];
  educationLevel?: EducationLevel;
}) {
  const {
    prompt,
    count = 6,
    language = 'pt',
    difficulty = 'medium',
    selectedTopics = [],
    educationLevel = 'escola',
  } = args;

  const langInstruction = language === 'pt' ? 'em Português' : `in ${language}`;
  const levelLabel = EDUCATION_LEVEL_LABELS[educationLevel] || EDUCATION_LEVEL_LABELS.escola;

  const difficultyGuide =
    "'easy' = conceito fundamental/definição básica; 'medium' = aplicação prática/relação entre conceitos; " +
    "'hard' = exceção, pegadinha comum ou caso-limite; 'expert' = nível de banca de concurso/prova avançada.";

  const topicsInstruction =
    selectedTopics.length > 0
      ? `\nSubtópicos prioritários (distribua os ${count} cards de forma EQUILIBRADA entre eles — não concentre tudo em apenas um): ${selectedTopics.join(', ')}.`
      : '';

  // ── Um único prompt coeso (system define o papel/regras fixas; user traz
  // os parâmetros concretos do pedido). Evitar duplicar a mesma instrução
  // nos dois lugares reduz o risco do modelo "misturar" versões levemente
  // diferentes da mesma regra e economiza tokens de contexto.
  const systemPrompt = `Você é o MemoriaFlash, especialista em criar flashcards educativos de alta retenção para o método de repetição espaçada (SRS SM-2).

REGRAS OBRIGATÓRIAS PARA CADA FLASHCARD:
1. "front" é sempre uma PERGUNTA clara e direta. "back" é sempre a RESPOSTA correspondente. Nunca inverta os dois, e nunca deixe front e back com o mesmo texto ou paráfrases óbvias um do outro.
   ❌ Errado: front="Mitocôndria" / back="Mitocôndria é a organela responsável pela respiração celular."
   ✅ Certo: front="Qual organela é responsável pela respiração celular e produção de ATP?" / back="A mitocôndria."
2. Nenhum card pode repetir a pergunta de outro card do mesmo lote, nem reformular a mesma pergunta com palavras diferentes ("card espelho"). Cada card deve testar um FATO ou RELAÇÃO distinta do conteúdo.
3. "difficulty" reflete a dificuldade REAL daquele card específico, não um valor fixo repetido em todos: ${difficultyGuide}
4. "explanation" é uma explicação didática do "back", começando com "📘 Explicação:" e incluindo uma curiosidade real e verificável do mundo real com "💡 Curiosidade:" — nunca invente fatos, datas ou números; se não tiver uma curiosidade genuína, foque em aprofundar a explicação do conceito em vez de inventar uma.
5. "topic" é o subtópico específico do conteúdo abordado por aquele card (não repita o nome da matéria inteira).
6. PROIBIDO copiar ou apenas reformular o texto de "back" dentro de "explanation": a explicação e a curiosidade devem acrescentar informação NOVA que não está em "back" (contexto, mecanismo, exemplo aplicado, dado histórico, comparação, consequência prática). Se "explanation" repetir o mesmo conteúdo de "back" com outras palavras, o card é considerado inválido.
   ❌ Errado: back="Paris" / explanation="📘 Explicação: A capital da França é Paris. 💡 Curiosidade: Paris é a capital da França."
   ✅ Certo: back="Paris" / explanation="📘 Explicação: Paris é sede do governo francês desde o século III. 💡 Curiosidade: A Torre Eiffel, símbolo da cidade, foi construída em 1889 para a Exposição Universal e era originalmente vista como provisória."
7. Todo o conteúdo (pergunta, resposta e explicação) deve respeitar o nível de ensino informado: ${levelLabel}. Não use conceitos, fórmulas ou vocabulário de um nível mais avançado do que o pedido, nem trate o aluno como se fosse mais novo/menos preparado do que o nível indicado.

Responda sempre ${langInstruction}.`;

  const userPrompt = `Assunto: "${prompt}"${topicsInstruction}
Nível de ensino do aluno: ${levelLabel}.
Nível-alvo de dificuldade do conjunto: ${difficulty} (varie individualmente ao redor desse nível conforme a regra 3, mas mantenha a maioria dos cards nesse patamar — sempre dentro do que é esperado para o nível de ensino informado).
Gere exatamente ${count} flashcards distintos entre si, cobrindo os conceitos, definições, fórmulas e relações mais importantes do assunto acima que fazem parte do currículo desse nível de ensino.`;

  const schemaHint = `[{ "front": string, "back": string, "explanation": string, "topic": string, "difficulty": "easy"|"medium"|"hard"|"expert" }, ...] — um array com exatamente ${count} objetos ("cards"), cada um com todos os 5 campos preenchidos.`;

  const geminiSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        front: { type: Type.STRING },
        back: { type: Type.STRING },
        explanation: { type: Type.STRING },
        topic: { type: Type.STRING },
        difficulty: { type: Type.STRING },
      },
      required: ['front', 'back', 'topic', 'explanation', 'difficulty'],
    },
  };

  const result = await withCache(
    'generateFlashcards',
    { prompt, count, language, difficulty, selectedTopics, educationLevel },
    CACHE_TTL.FLASHCARDS,
    async () => {
      const { data, providerUsed } = await aiOrchestrator.generateJSON({
        systemPrompt,
        userPrompt,
        schemaHint,
        geminiSchema,
        // Gerações maiores (25/50/100 cards) precisam de mais tokens de saída
        // para não truncar o JSON — senão o parser retorna 0 cards.
        maxOutputTokens: Math.max(8192, count * 350),
      });
      const rawCards = extractArrayField(data, ['cards', 'flashcards']) as Array<Record<string, unknown>>;

      // Rede de segurança determinística: a instrução no prompt (regra 2)
      // reduz duplicatas, mas modelos gratuitos/menores nem sempre obedecem
      // à risca em lotes grandes (25–100 cards). Removemos aqui qualquer
      // card cuja pergunta normalizada já apareceu antes no mesmo lote,
      // mantendo a primeira ocorrência.
      const seen = new Set<string>();
      const cards = rawCards.filter((card) => {
        const front = typeof card?.front === 'string' ? card.front : '';
        const key = normalizeForDedup(front);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const removedCount = rawCards.length - cards.length;
      if (removedCount > 0) {
        console.warn(`[generateFlashcards] ${removedCount} card(s) duplicado(s) removido(s) do lote (provider: ${providerUsed}).`);
      }

      // Rede de segurança para a regra 6 (explicação não pode só repetir a
      // resposta). Não descartamos o card — ele continua válido como
      // pergunta/resposta — só substituímos a explicação por um aviso
      // honesto em vez de exibir um texto que não agrega nada.
      let fixedExplanationCount = 0;
      const finalCards = cards.map((card) => {
        const back = typeof card?.back === 'string' ? card.back : '';
        const explanation = typeof card?.explanation === 'string' ? card.explanation : '';
        if (explanationJustRepeatsAnswer(back, explanation)) {
          fixedExplanationCount++;
          return { ...card, explanation: '📘 Explicação: revise este conceito com suas próprias palavras para fixar melhor o conteúdo.' };
        }
        return card;
      });
      if (fixedExplanationCount > 0) {
        console.warn(`[generateFlashcards] ${fixedExplanationCount} explicação(ões) substituída(s) por repetir a resposta (provider: ${providerUsed}).`);
      }

      return { cards: finalCards, providerUsed };
    }
  );

  return { ...result, providerUsed: result.cacheHit ? 'cache' : result.providerUsed };
}
