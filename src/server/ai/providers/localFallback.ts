import { AIProvider, GenerateJSONParams } from '../types';

// Último recurso: nunca falha, não depende de rede. Garante que o app
// SEMPRE responde algo utilizável mesmo se todas as APIs de nuvem estiverem
// indisponíveis (limite atingido, sem internet no servidor, chaves ausentes).
// Não usa IA de verdade — gera conteúdo estruturado heurístico a partir do
// próprio prompt do usuário, apenas para nunca deixar a UI travada/quebrada.
export const localFallbackProvider: AIProvider = {
  id: 'local',
  label: 'Gerador local (offline, sem IA)',
  tier: 'local',
  isConfigured: () => true,

  async generateJSON(params: GenerateJSONParams): Promise<unknown> {
    // A "tarefa" é inferida pelo texto do schemaHint, que cada task-builder
    // preenche com uma palavra-chave reconhecível (ver src/server/ai/tasks/*).
    const hint = params.schemaHint.toLowerCase();
    const topic = params.userPrompt.slice(0, 120);

    if (hint.includes('"cards"') || hint.includes('front') && hint.includes('back')) {
      return buildFlashcardsFallback(topic);
    }
    if (hint.includes('topics')) {
      return {
        topics: [
          `Fundamentos e Conceitos de ${topic}`,
          `Principais Regras e Diretrizes`,
          `Aplicações Práticas e Estudo de Caso`,
          `Exceções e Casos Especiais`,
          `Revisão Geral e Questões Frequentes`,
        ],
      };
    }
    if (hint.includes('diagnosticsummary')) {
      return {
        diagnosticSummary: `Não foi possível conectar aos provedores de IA no momento. Continue estudando — seu progresso local foi salvo e a análise completa será recalculada automaticamente assim que a conexão for restabelecida.`,
        masteredTopics: [],
        weakTopics: [topic],
        cards: buildFlashcardsFallback(topic).slice ? buildFlashcardsFallback(topic) : [],
      };
    }
    if (hint.includes('answer') && hint.includes('aiinsight')) {
      return {
        answer: `No momento estou sem conexão com os servidores de IA. Tente novamente em instantes — enquanto isso, revise seus flashcards já salvos sobre "${topic}".`,
        aiInsight: 'Dica: revisar cartões logo antes de dormir melhora a retenção (consolidação de memória durante o sono).',
      };
    }
    if (hint.includes('correctindex')) {
      return buildQuizFallback(topic);
    }
    if (hint.includes('estimatedsuccessrate')) {
      return buildRecoveryPlanFallback(topic);
    }

    // fallback genérico
    return { message: 'Serviço de IA temporariamente indisponível. Tente novamente em instantes.' };
  },
};

function buildFlashcardsFallback(topic: string) {
  return Array.from({ length: 6 }).map((_, i) => ({
    front: `Pergunta ${i + 1} sobre "${topic}"? (gerado localmente — sem IA disponível no momento)`,
    back: `Resposta conceitual básica sobre ${topic}.\n\n• Ponto chave 1: revise o material original.\n• Ponto chave 2: tente gerar novamente quando a conexão de IA voltar.`,
    topic,
    difficulty: 'medium',
  }));
}

function buildQuizFallback(topic: string) {
  return Array.from({ length: 5 }).map((_, i) => ({
    question: `[Offline] Pergunta ${i + 1} sobre ${topic}?`,
    options: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
    correctIndex: 0,
    explanation: 'Geração offline: reconecte-se para perguntas geradas por IA de verdade.',
  }));
}

function buildRecoveryPlanFallback(topic: string) {
  return {
    estimatedSuccessRate: 60,
    aiInsightMessage: `Plano genérico gerado offline sobre ${topic}. Reconecte-se para um plano personalizado por IA.`,
    days: [1, 2, 3].map((d) => ({
      dayNumber: d,
      dayLabel: `Dia ${d}`,
      title: `Revisão de ${topic}`,
      focusBadge: 'Revisão geral',
      description: 'Revise os cartões marcados como difíceis e repita o quiz diagnóstico.',
      cardCount: 5,
    })),
  };
}
