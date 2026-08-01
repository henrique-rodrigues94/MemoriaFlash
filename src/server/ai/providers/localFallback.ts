import { AIProvider, GenerateJSONParams } from '../types';

// Último recurso: nunca falha, não depende de rede. Garante que o app
// SEMPRE responde algo utilizável mesmo se todas as APIs de nuvem estiverem
// indisponíveis (limite atingido, sem internet no servidor, chaves ausentes).
export const localFallbackProvider: AIProvider = {
  id: 'local',
  label: 'Gerador local (offline, sem IA)',
  tier: 'local',
  isConfigured: () => true,

  async generateJSON(params: GenerateJSONParams): Promise<unknown> {
    const hint = params.schemaHint.toLowerCase();
    const topic = params.userPrompt.slice(0, 120);

    // Extrai subtópicos do userPrompt se disponíveis
    const topicsMatch = params.userPrompt.match(/Subtópicos prioritários:\s*(.+)/);
    const subtopics = topicsMatch
      ? topicsMatch[1].split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    if (hint.includes('"cards"') || (hint.includes('front') && hint.includes('back'))) {
      return buildFlashcardsFallback(topic, subtopics);
    }
    if (hint.includes('topics')) {
      // Retorna array vazio — o cliente detecta e exibe aviso de configuração
      return { topics: [] };
    }
    if (hint.includes('diagnosticsummary')) {
      return {
        diagnosticSummary: `Não foi possível conectar aos provedores de IA no momento. Continue estudando — seu progresso local foi salvo.`,
        masteredTopics: [],
        weakTopics: [topic],
        cards: buildFlashcardsFallback(topic, subtopics),
      };
    }
    if (hint.includes('answer') && hint.includes('aiinsight')) {
      return {
        answer: `No momento estou sem conexão com os servidores de IA. Tente novamente em instantes.`,
        aiInsight: 'Dica: revisar cartões logo antes de dormir melhora a retenção.',
      };
    }
    if (hint.includes('correctindex')) {
      return buildQuizFallback(topic);
    }
    if (hint.includes('estimatedsuccessrate')) {
      return buildRecoveryPlanFallback(topic);
    }

    return { message: 'Serviço de IA temporariamente indisponível. Tente novamente em instantes.' };
  },
};

function buildFlashcardsFallback(topic: string, subtopics: string[] = []) {
  const extractedTopic = topic.replace(/^Tema:\s*/i, '').split('\n')[0].trim();

  const questionTemplates = [
    (t: string) => `Qual é a definição de ${t}?`,
    (t: string) => `Quais são as principais características de ${t}?`,
    (t: string) => `Como funciona ${t}?`,
    (t: string) => `Quais são os tipos de ${t}?`,
    (t: string) => `Qual a importância de ${t}?`,
    (t: string) => `Quais são as aplicações práticas de ${t}?`,
  ];

  const answerTemplates = [
    (t: string) =>
      `${t} pode ser definido como um conjunto de conceitos e práticas fundamentais na área estudada.\n\n• Ponto chave 1: Revise o material original para uma definição precisa.\n• Ponto chave 2: Pratique com exemplos reais para melhor fixação.`,
    (t: string) =>
      `As principais características de ${t} incluem aspectos técnicos e práticos da área.\n\n• Ponto chave 1: Identifique os elementos centrais do conceito.\n• Ponto chave 2: Compare com conceitos relacionados para entender diferenças.`,
    (t: string) =>
      `O funcionamento de ${t} envolve processos e mecanismos específicos da área de estudo.\n\n• Ponto chave 1: Compreenda o fluxo ou sequência de etapas envolvidas.\n• Ponto chave 2: Relacione com exemplos do cotidiano para fixação.`,
    (t: string) =>
      `Os tipos de ${t} são classificados conforme suas características e aplicações.\n\n• Ponto chave 1: Memorize as categorias principais e seus critérios.\n• Ponto chave 2: Saiba distinguir as diferenças entre cada tipo.`,
    (t: string) =>
      `A importância de ${t} está relacionada ao seu impacto e utilidade na área estudada.\n\n• Ponto chave 1: Entenda o contexto histórico e prático do tema.\n• Ponto chave 2: Associe à relevância atual no campo de estudo.`,
    (t: string) =>
      `As aplicações práticas de ${t} abrangem situações reais e casos de uso concretos.\n\n• Ponto chave 1: Identifique exemplos reais de aplicação.\n• Ponto chave 2: Pratique resolvendo problemas relacionados.`,
  ];

  return Array.from({ length: 6 }).map((_, i) => {
    const cardTopic = subtopics[i % Math.max(subtopics.length, 1)] || extractedTopic;
    const tmplIdx = i % questionTemplates.length;
    return {
      front: questionTemplates[tmplIdx](cardTopic),
      back: answerTemplates[tmplIdx](cardTopic),
      topic: cardTopic,
      difficulty: 'medium',
    };
  });
}

function buildQuizFallback(topic: string) {
  return Array.from({ length: 5 }).map((_, i) => ({
    question: `[Offline] Pergunta ${i + 1} sobre ${topic}?`,
    options: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
    correctIndex: 0,
    explanation: 'Geração offline: reconecte-se para perguntas geradas por IA.',
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
