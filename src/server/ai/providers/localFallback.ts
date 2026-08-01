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
  const fallbackTopics = subtopics.length > 0 ? subtopics : [extractedTopic];

  // Templates combinados: pergunta ↔ resposta ↔ explicação(exemplo) coerentes,
  // específicos do tópico — nunca respostas genéricas desconexas.
  const cardTemplates = [
    {
      question: (t: string) => `O que é ${t}?`,
      answer: (t: string) =>
        `${t} é um conceito essencial da área, definido por características e regras próprias que precisam ser estudadas com atenção.`,
      explanation: (t: string) =>
        `📘 Explicação: ${t} é um conceito fundamental que se aplica em diversos contextos práticos.\n💡 Exemplo: Ao estudar ${t}, procure relacionar com situações reais do dia a dia para fixar melhor o conteúdo.`,
    },
    {
      question: (t: string) => `Quais são as principais características de ${t}?`,
      answer: (t: string) =>
        `As principais características de ${t} incluem: definição clara, exemplos de aplicação, regras principais e casos especiais que diferenciam o conceito.`,
      explanation: (t: string) =>
        `📘 Explicação: Para entender ${t}, analise primeiro sua definição, depois as características que o distinguem de conceitos semelhantes.\n💡 Exemplo: Compare ${t} com um caso prático do seu cotidiano para enxergar suas características na prática.`,
    },
    {
      question: (t: string) => `Como funciona ${t} na prática?`,
      answer: (t: string) =>
        `Na prática, ${t} funciona através de etapas e mecanismos próprios: identificação do contexto, aplicação das regras do conceito e verificação do resultado obtido.`,
      explanation: (t: string) =>
        `📘 Explicação: O funcionamento de ${t} envolve um processo com passos bem definidos.\n💡 Exemplo: Pense em ${t} como uma receita: siga cada passo em ordem e o resultado será previsível e correto.`,
    },
    {
      question: (t: string) => `Quais são os tipos de ${t}?`,
      answer: (t: string) =>
        `Os tipos de ${t} variam conforme o contexto, mas podem ser organizados em categorias principais, cada uma com características e finalidades específicas.`,
      explanation: (t: string) =>
        `📘 Explicação: Classificar ${t} em tipos ajuda a memorizar as variações e saber quando aplicar cada um.\n💡 Exemplo: Assim como os animais são classificados em grupos, ${t} pode ser dividido em categorias para facilitar o estudo.`,
    },
    {
      question: (t: string) => `Qual a importância de ${t}?`,
      answer: (t: string) =>
        `A importância de ${t} está no seu papel central dentro da área: é a base para entender tópicos mais avançados e para resolver problemas práticos.`,
      explanation: (t: string) =>
        `📘 Explicação: ${t} é importante porque conecta a teoria à prática e fundamenta o restante da matéria.\n💡 Exemplo: Dominar ${t} é como dominar o alfabeto antes de formar palavras e frases completas.`,
    },
    {
      question: (t: string) => `Quais são as aplicações práticas de ${t}?`,
      answer: (t: string) =>
        `As aplicações práticas de ${t} incluem seu uso em situações reais: resolução de problemas, tomada de decisão e embasamento de tópicos mais avançados.`,
      explanation: (t: string) =>
        `📘 Explicação: ${t} se aplica diretamente em cenários reais da profissão ou dos estudos.\n💡 Exemplo: Profissionais usam ${t} diariamente para resolver problemas e tomar decisões mais assertivas.`,
    },
  ];

  return Array.from({ length: 6 }).map((_, i) => {
    const cardTopic = fallbackTopics[i % Math.max(fallbackTopics.length, 1)];
    const tmpl = cardTemplates[i % cardTemplates.length];
    return {
      front: tmpl.question(cardTopic),
      back: tmpl.answer(cardTopic),
      explanation: tmpl.explanation(cardTopic),
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
