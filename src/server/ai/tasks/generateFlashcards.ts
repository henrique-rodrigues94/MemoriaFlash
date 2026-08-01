import { Type } from '@google/genai';
import { aiOrchestrator } from '../index';
import { withCache, CACHE_TTL } from '../cache/aiCache';

/**
 * Por que lotes de 25?
 * ─────────────────────────────────────────────────────────────────────────────
 * Cada card com explanation + curiosity gera ~350-500 tokens de saída.
 * • 25 cards ≈ 10k tokens → dentro do limite seguro de qualquer modelo.
 * • 100 cards de uma vez ≈ 40k tokens → modelos truncam silenciosamente
 *   e retornam só ~54 cards (bug reportado pelo usuário).
 * • Com lotes paralelos de 25, 4 chamadas simultâneas entregam 100 cards.
 */
const BATCH_SIZE = 25;

function buildBatchParams(
  prompt: string,
  batchCount: number,
  langInstruction: string,
  topicsStr: string,
  batchLabel: string,
  customSystemPrompt?: string
) {
  let systemPrompt: string;

  if (customSystemPrompt && customSystemPrompt.trim()) {
    systemPrompt = customSystemPrompt
      .replace(/\{count\}/g, String(batchCount))
      .replace(/\{prompt\}/g, prompt)
      .replace(/\{topics\}/g, topicsStr)
      .replace(/\{language\}/g, langInstruction);
    systemPrompt += `\n\nIMPORTANTE: Retorne EXATAMENTE ${batchCount} flashcards no array JSON.${batchLabel}`;
  } else {
    systemPrompt =
      `Você é o FlashMind AI, especialista em criar flashcards educativos de alta retenção (SRS SM-2).\n` +
      `Crie EXATAMENTE ${batchCount} flashcards sobre "${prompt}" ${langInstruction}.${topicsStr}\n\n` +
      `Cada flashcard deve ter:\n` +
      `- front: pergunta clara, concisa e instigante.\n` +
      `- back: resposta com 2-3 pontos-chave em tópicos para memorização.\n` +
      `- explanation: explicação detalhada + exemplo prático real. Inicie com "📘 Explicação:" e "💡 Exemplo Prático:".\n` +
      `- curiosity: curiosidade fascinante sobre o tema. Inicie com "🌟 Curiosidade:".\n` +
      `- topic: subtópico específico do assunto.\n` +
      `- difficulty: "easy", "medium", "hard" ou "expert" conforme a complexidade.\n\n` +
      `REGRA CRÍTICA: O array JSON deve ter EXATAMENTE ${batchCount} objetos. Não retorne menos.${batchLabel}`;
  }

  const schemaHint =
    `Array JSON com EXATAMENTE ${batchCount} objetos:\n` +
    `[{"front":string,"back":string,"explanation":string,"curiosity":string,"topic":string,"difficulty":string},...]`;

  const geminiSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        front:       { type: Type.STRING },
        back:        { type: Type.STRING },
        explanation: { type: Type.STRING },
        curiosity:   { type: Type.STRING },
        topic:       { type: Type.STRING },
        difficulty:  { type: Type.STRING },
      },
      required: ['front', 'back', 'topic', 'explanation', 'curiosity'],
    },
  };

  // ~450 tokens/card + 20% de margem, máx 32768
  const maxOutputTokens = Math.min(32768, Math.ceil(batchCount * 450 * 1.2));

  return { systemPrompt, schemaHint, geminiSchema, maxOutputTokens };
}

async function runBatch(
  prompt: string,
  batchCount: number,
  langInstruction: string,
  topicsStr: string,
  batchIndex: number,
  totalBatches: number,
  startCardNum: number,
  customSystemPrompt?: string
): Promise<any[]> {
  const batchLabel =
    totalBatches > 1
      ? `\n[LOTE ${batchIndex + 1}/${totalBatches}] Gere os cards de #${startCardNum} a #${startCardNum + batchCount - 1}. NÃO repita perguntas de outros lotes.`
      : '';

  const { systemPrompt, schemaHint, geminiSchema, maxOutputTokens } = buildBatchParams(
    prompt, batchCount, langInstruction, topicsStr, batchLabel, customSystemPrompt
  );

  const { data } = await aiOrchestrator.generateJSON({
    systemPrompt,
    userPrompt: prompt,
    schemaHint,
    geminiSchema,
    maxOutputTokens,
  });

  const cards = Array.isArray(data) ? data : (data as any)?.cards ?? [];
  console.log(
    `[generateFlashcards] Lote ${batchIndex + 1}/${totalBatches}: ${cards.length}/${batchCount} cards recebidos`
  );
  return cards;
}

export async function generateFlashcardsTask(args: {
  prompt: string;
  count?: number;
  language?: string;
  difficulty?: string;
  selectedTopics?: string[];
  customSystemPrompt?: string;
}) {
  const {
    prompt,
    count = 25,
    language = 'pt',
    difficulty = 'medium',
    selectedTopics = [],
    customSystemPrompt,
  } = args;

  const langInstruction = language === 'pt' ? 'em Português' : `in ${language}`;
  const topicsStr =
    selectedTopics.length > 0
      ? ` Priorize os subtópicos: ${selectedTopics.join(', ')}.`
      : '';

  const generate = async () => {
    if (count <= BATCH_SIZE) {
      // Geração única
      const cards = await runBatch(
        prompt, count, langInstruction, topicsStr, 0, 1, 1, customSystemPrompt
      );
      return { cards, providerUsed: 'gemini' };
    }

    // Divide em lotes e executa em paralelo
    const batches: number[] = [];
    let remaining = count;
    while (remaining > 0) {
      const n = Math.min(BATCH_SIZE, remaining);
      batches.push(n);
      remaining -= n;
    }

    console.log(
      `[generateFlashcards] Gerando ${count} cards em ${batches.length} lotes paralelos: [${batches.join(', ')}]`
    );

    const batchResults = await Promise.all(
      batches.map((batchCount, idx) => {
        const startNum = batches.slice(0, idx).reduce((a, b) => a + b, 0) + 1;
        return runBatch(
          prompt, batchCount, langInstruction, topicsStr,
          idx, batches.length, startNum, customSystemPrompt
        );
      })
    );

    const allCards = batchResults.flat();
    console.log(`[generateFlashcards] Total: ${allCards.length}/${count} cards`);
    return { cards: allCards, providerUsed: 'gemini' };
  };

  // Não usa cache quando há prompt customizado (edições devem sempre refletir)
  if (customSystemPrompt && customSystemPrompt.trim()) {
    return generate();
  }

  // v3: chave de versão invalida caches antigos com truncamentos
  const result = await withCache(
    'generateFlashcards',
    { prompt, count, language, difficulty, selectedTopics, _v: 3 },
    CACHE_TTL.FLASHCARDS,
    generate
  );

  return { ...result, providerUsed: result.cacheHit ? 'cache' : result.providerUsed };
}
