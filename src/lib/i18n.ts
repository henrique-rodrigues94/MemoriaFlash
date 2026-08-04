export type SupportedLanguage = 'pt' | 'en' | 'es' | 'fr' | 'de';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  flag: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'pt', name: 'Português', nativeName: 'Português (BR)', flag: '🇧🇷' },
  { code: 'en', name: 'English', nativeName: 'English (US)', flag: '🇺🇸' },
  { code: 'es', name: 'Español', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', nativeName: 'Deutsch', flag: '🇩🇪' },
];

export function detectBrowserLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem('flashmind_lang');
    if (saved && ['pt', 'en', 'es', 'fr', 'de'].includes(saved)) {
      return saved as SupportedLanguage;
    }

    const browserLang = (navigator.language || (navigator as any).userLanguage || 'pt').toLowerCase();
    if (browserLang.startsWith('en')) return 'en';
    if (browserLang.startsWith('es')) return 'es';
    if (browserLang.startsWith('fr')) return 'fr';
    if (browserLang.startsWith('de')) return 'de';
    if (browserLang.startsWith('pt')) return 'pt';
  } catch (e) {
    // ignore
  }
  return 'pt';
}

export const translations = {
  pt: {
    // Header & Tabs
    home: 'Início',
    decks: 'Baralhos',
    aiStudio: 'Estúdio IA',
    stats: 'Estatísticas',
    login: 'Entrar',
    credits: 'Créditos',
    proPlan: 'Plano PRO',
    
    // Home Dashboard
    welcome: 'Bem-vindo de volta',
    welcomeSub: 'Aprenda 3x mais rápido com Repetição Espaçada (SRS) e Inteligência Artificial',
    quickStart: 'Início Rápido',
    studyNow: 'Estudar Agora',
    createDeck: 'Criar Baralho',
    aiGenerator: 'Gerador IA',
    dailyGoal: 'Meta Diária de Estudo',
    streakDays: 'Dias Seguidos',
    masteredCards: 'Cards Dominados',
    hoursStudied: 'Horas Estudadas',
    retention: 'Taxa de Retenção',

    // Deck & Cards
    deckTitle: 'Meus Baralhos de Estudo',
    newDeck: 'Novo Baralho',
    cardsCount: 'cards',
    reviewDue: 'Para revisar hoje',
    studyDeck: 'Estudar Baralho',
    explainQuestionAndExample: 'Explicar Pergunta & Dar Exemplo',
    explainTitle: 'Explicação Detalhada do Conceito',
    practicalExample: 'Exemplo Prático do Mundo Real',
    generatingExplanation: 'Gerando explicação e exemplo com Gemini IA...',

    // AdMob / Monetização
    adLabel: 'Anúncio',
    adRewardedLabel: 'Vídeo Recompensado',
    adClose: 'Fechar',
    adPlaying: 'Reproduzindo Anúncio ({s}s)...',
    adNetworkName: 'MemoriaFlash Network',
    adNetworkTagline: 'Potencialize sua memória com Repetição Espaçada e IA.',
    adCompleted: 'Anúncio Concluído!',
    adCompletedMsg: 'Você ganhou +{credits} Créditos de IA',
    adStreakBonus: '(bônus de streak de {days} dias!)',
    adWatchTitle: 'Assista ao Vídeo Patrocinado',
    adWatchSub: 'Ganhe +{credits} Créditos de IA gratuitamente',
    adClaim: 'Resgatar +{credits} Créditos de IA Agora',
    adReplay: 'Replay',
    adRemainingToday: 'Restam {remaining} vídeos hoje (limite de {max}/dia).',
    adStreakHint: 'Assista dias seguidos para aumentar sua recompensa.',
    // Banner
    adBannerTitle: 'Mantenha o MemoriaFlash 100% Grátis',
    adBannerWatch: 'Assista a um vídeo curto para ganhar +{credits} Créditos de IA · {remaining} restantes hoje',
    adBannerLimitReached: 'Limite diário atingido. Volte amanhã ou indique um amigo para ganhar créditos.',
    adBannerWatchBtn: 'Assistir (+{credits})',
    adBannerLimitBtn: 'Limite atingido',
    adBannerReferBtn: 'Indicar',
    // Interstitial
    adInterstitialTitle: 'MemoriaFlash Network',
    adInterstitialBody: 'Continue estudando com repetição espaçada e IA. Considere o plano PRO para remover anúncios.',
    // Toast de recompensa
    adRewardToast: '+{credits} Créditos de IA adicionados!',

    // Common
    save: 'Salvar',
    cancel: 'Cancelar',
    close: 'Fechar',
    language: 'Idioma do App',
    autoDetected: 'Detectado Automaticamente',

    // Aba Ajuda (help)
    help: {
      title: 'Ajuda',
      subtitle: 'Como usar o MemoriaFlash e envie seu feedback.',
      sections: {
        study: {
          title: 'Estudar',
          description:
            'Sua área de estudo com Repetição Espaçada (SRS/SM-2). Cada card é revisado no momento certo para fixar o conteúdo na memória de longo prazo.',
          items: [
            'A Home mostra os decks e os cards pendentes de revisão.',
            'Toque em "Estudar" para iniciar uma sessão de flashcards.',
            'Avalie cada card como Difícil / Bom / Fácil — o algoritmo ajusta os intervalos.',
            'Quanto mais você estuda, maior sua sequência (streak) e dominância.',
          ],
        },
        cards: {
          title: 'Cards',
          description:
            'O gerador inteligente de flashcards. Digite uma matéria e a IA cria cards completos com explicações e exemplos práticos.',
          items: [
            'Digite a matéria (ex.: Direito Penal, Biologia, Python).',
            'Selecione os tópicos e a quantidade de cards (25/50/100).',
            'Cada card gerado inclui pergunta, resposta, explicação e curiosidade.',
            'Você também pode criar cards manualmente com o botão "Criar Card".',
          ],
        },
        scanner: {
          title: 'Scanner & Upload',
          description:
            'Tire uma foto da página ou envie um PDF/imagem. O app extrai o texto (OCR) e transforma em flashcards automaticamente.',
          items: [
            'Toque em "Tirar Foto da Página" ou envie um arquivo.',
            'A IA extrai o conteúdo das imagens e monta os cards.',
            'Confira o texto extraído antes de gerar o deck.',
          ],
        },
        stats: {
          title: 'Estatísticas',
          description:
            'Acompanhe seu desempenho: streak, cards dominados, horas estudadas, retenção e histórico de atividade.',
          items: [
            'Veja sua sequência de dias e a meta diária de estudo.',
            'O heatmap mostra sua constância ao longo do tempo.',
            'Acompanhe o percentual de dominância de cada deck.',
          ],
        },
        ai: {
          title: 'Inteligência Artificial',
          description:
            'O MemoriaFlash usa IA para gerar flashcards, explicações com exemplos, sugestões de tópicos e análise do seu desempenho.',
          items: [
            'A IA gera cards completos com pergunta, resposta, explicação e curiosidade.',
            'Durante o estudo, use "Explicar Pergunta & Ver Exemplo" para ver o conteúdo didático.',
            'As sugestões de tópicos ajudam a detalhar melhor o assunto antes de gerar.',
          ],
        },
        credits: {
          title: 'Créditos & PRO',
          description:
            'Gere flashcards com IA usando créditos. Assista a vídeos recompensados para ganhar mais, ou assine o PRO.',
          items: [
            'Você ganha créditos grátis diariamente.',
            'Assista a um vídeo curto para ganhar +10 créditos.',
            'O plano PRO remove anúncios e libera recursos exclusivos.',
          ],
        },
      },
      feedback: {
        heading: 'Envie seu feedback',
        intro:
          'Encontrou um problema ou quer sugerir uma melhoria? Conte pra gente. Sua opinião chega diretamente aos desenvolvedores.',
        typeBug: '🐞 Relatar um problema',
        typeSuggestion: '💡 Sugerir uma melhoria',
        typePraise: '❤️ Elogio',
        typeOther: '✉️ Outro',
        placeholder: 'Descreva seu feedback, problema ou sugestão...',
        contactPlaceholder: 'Seu e-mail (opcional — para retornarmos)',
        send: 'Enviar',
        sentTitle: 'Feedback enviado!',
        sentBody: 'Obrigado por ajudar a melhorar o MemoriaFlash. 💜',
        sendAnother: 'Enviar outro feedback',
        errorEmpty: 'Escreva uma mensagem antes de enviar.',
        errorShort: 'Conte um pouco mais — sua mensagem está muito curta.',
        errorEmail: 'O e-mail informado parece inválido. Deixe em branco ou corrija.',
        errorGeneric: 'Não foi possível enviar seu feedback agora. Verifique sua conexão e tente novamente.',
      },
    },
  },
  en: {
    // Header & Tabs
    home: 'Home',
    decks: 'Decks',
    aiStudio: 'AI Studio',
    stats: 'Analytics',
    login: 'Sign In',
    credits: 'Credits',
    proPlan: 'PRO Plan',

    // Home Dashboard
    welcome: 'Welcome back',
    welcomeSub: 'Learn 3x faster with Spaced Repetition (SRS) & Artificial Intelligence',
    quickStart: 'Quick Start',
    studyNow: 'Study Now',
    createDeck: 'Create Deck',
    aiGenerator: 'AI Generator',
    dailyGoal: 'Daily Study Goal',
    streakDays: 'Streak Days',
    masteredCards: 'Mastered Cards',
    hoursStudied: 'Hours Studied',
    retention: 'Retention Rate',

    // Deck & Cards
    deckTitle: 'My Study Decks',
    newDeck: 'New Deck',
    cardsCount: 'cards',
    reviewDue: 'Due today',
    studyDeck: 'Study Deck',
    explainQuestionAndExample: 'Explain Question & Give Example',
    explainTitle: 'Detailed Concept Explanation',
    practicalExample: 'Practical Real-World Example',
    generatingExplanation: 'Generating explanation & example with Gemini AI...',

    // AdMob / Monetization
    adLabel: 'Ad',
    adRewardedLabel: 'Rewarded Video',
    adClose: 'Close',
    adPlaying: 'Playing Ad ({s}s)...',
    adNetworkName: 'MemoriaFlash Network',
    adNetworkTagline: 'Boost your memory with Spaced Repetition & AI.',
    adCompleted: 'Ad Completed!',
    adCompletedMsg: 'You earned +{credits} AI Credits',
    adStreakBonus: '({days}-day streak bonus!)',
    adWatchTitle: 'Watch Sponsored Video',
    adWatchSub: 'Earn +{credits} AI Credits for free',
    adClaim: 'Claim +{credits} AI Credits Now',
    adReplay: 'Replay',
    adRemainingToday: '{remaining} videos left today (limit: {max}/day).',
    adStreakHint: 'Watch daily to increase your reward.',
    // Banner
    adBannerTitle: 'Keep MemoriaFlash 100% Free',
    adBannerWatch: 'Watch a short video to earn +{credits} AI Credits · {remaining} left today',
    adBannerLimitReached: 'Daily ad limit reached. Come back tomorrow or refer a friend to earn more credits.',
    adBannerWatchBtn: 'Watch (+{credits})',
    adBannerLimitBtn: 'Limit reached',
    adBannerReferBtn: 'Refer',
    // Interstitial
    adInterstitialTitle: 'MemoriaFlash Network',
    adInterstitialBody: 'Keep learning with spaced repetition & AI. Consider the PRO plan to remove ads.',
    // Reward toast
    adRewardToast: '+{credits} AI Credits added!',

    // Common
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    language: 'App Language',
    autoDetected: 'Auto-Detected',

    // Help tab
    help: {
      title: 'Help',
      subtitle: 'How to use MemoriaFlash and send your feedback.',
      sections: {
        study: {
          title: 'Study',
          description:
            'Your study area powered by Spaced Repetition (SRS/SM-2). Each card is reviewed at the right moment to lock it into long-term memory.',
          items: [
            'Home shows your decks and the cards due for review.',
            'Tap "Study" to start a flashcard session.',
            'Rate each card as Hard / Good / Easy — the algorithm adjusts the intervals.',
            'The more you study, the higher your streak and mastery.',
          ],
        },
        cards: {
          title: 'Cards',
          description:
            'The smart flashcard generator. Type a subject and AI creates complete cards with explanations and practical examples.',
          items: [
            'Type the subject (e.g. Criminal Law, Biology, Python).',
            'Select the topics and the number of cards (25/50/100).',
            'Every generated card includes a question, answer, explanation and fun fact.',
            'You can also create cards manually with the "Create Card" button.',
          ],
        },
        scanner: {
          title: 'Scanner & Upload',
          description:
            'Take a photo of a page or upload a PDF/image. The app extracts the text (OCR) and turns it into flashcards automatically.',
          items: [
            'Tap "Take Photo of Page" or upload a file.',
            'AI extracts the content from the images and builds the cards.',
            'Review the extracted text before generating the deck.',
          ],
        },
        stats: {
          title: 'Analytics',
          description:
            'Track your performance: streak, mastered cards, hours studied, retention and activity history.',
          items: [
            'See your day streak and daily study goal.',
            'The heatmap shows your consistency over time.',
            'Track the mastery percentage of each deck.',
          ],
        },
        ai: {
          title: 'Artificial Intelligence',
          description:
            'MemoriaFlash uses AI to generate flashcards, explanations with examples, topic suggestions and performance analysis.',
          items: [
            'AI generates complete cards with question, answer, explanation and fun fact.',
            'While studying, use "Explain Question & Give Example" to see the teaching content.',
            'Topic suggestions help you narrow down the subject before generating.',
          ],
        },
        credits: {
          title: 'Credits & PRO',
          description:
            'Generate AI flashcards using credits. Watch rewarded videos to earn more, or subscribe to PRO.',
          items: [
            'You earn free credits every day.',
            'Watch a short video to earn +10 credits.',
            'The PRO plan removes ads and unlocks exclusive features.',
          ],
        },
      },
      feedback: {
        heading: 'Send your feedback',
        intro: 'Found a problem or want to suggest an improvement? Tell us. Your feedback goes straight to the developers.',
        typeBug: '🐞 Report a problem',
        typeSuggestion: '💡 Suggest an improvement',
        typePraise: '❤️ Compliment',
        typeOther: '✉️ Other',
        placeholder: 'Describe your feedback, problem or suggestion...',
        contactPlaceholder: 'Your email (optional — so we can reply)',
        send: 'Send',
        sentTitle: 'Feedback sent!',
        sentBody: 'Thanks for helping improve MemoriaFlash. 💜',
        sendAnother: 'Send another feedback',
        errorEmpty: 'Write a message before sending.',
        errorShort: 'Tell us a bit more — your message is too short.',
        errorEmail: 'The email you entered looks invalid. Leave it blank or fix it.',
        errorGeneric: 'Could not send your feedback right now. Check your connection and try again.',
      },
    },
  },
  es: {
    // Header & Tabs
    home: 'Inicio',
    decks: 'Mazos',
    aiStudio: 'Estudio IA',
    stats: 'Estadísticas',
    login: 'Acceder',
    credits: 'Créditos',
    proPlan: 'Plan PRO',

    // Home Dashboard
    welcome: 'Bienvenido de nuevo',
    welcomeSub: 'Aprende 3 veces más rápido con Repetición Espaciada (SRS) e IA',
    quickStart: 'Inicio Rápido',
    studyNow: 'Estudiar Ahora',
    createDeck: 'Crear Mazo',
    aiGenerator: 'Generador IA',
    dailyGoal: 'Meta Diaria',
    streakDays: 'Días Seguidos',
    masteredCards: 'Tarjetas Dominadas',
    hoursStudied: 'Horas Estudiadas',
    retention: 'Tasa de Retención',

    // Deck & Cards
    deckTitle: 'Mis Mazos de Estudio',
    newDeck: 'Nuevo Mazo',
    cardsCount: 'tarjetas',
    reviewDue: 'Para repasar hoy',
    studyDeck: 'Estudiar Mazo',
    explainQuestionAndExample: 'Explicar Pregunta y Dar Ejemplo',
    explainTitle: 'Explicación Detallada del Concepto',
    practicalExample: 'Ejemplo Práctico del Mundo Real',
    generatingExplanation: 'Generando explicación y ejemplo con Gemini IA...',

    // AdMob / Monetización
    adLabel: 'Anuncio',
    adRewardedLabel: 'Video Premiado',
    adClose: 'Cerrar',
    adPlaying: 'Reproduciendo Anuncio ({s}s)...',
    adNetworkName: 'MemoriaFlash Network',
    adNetworkTagline: 'Potencia tu memoria con Repetición Espaciada e IA.',
    adCompleted: '¡Anuncio Completado!',
    adCompletedMsg: 'Ganaste +{credits} Créditos de IA',
    adStreakBonus: '(¡bono de racha de {days} días!)',
    adWatchTitle: 'Ver Video Patrocinado',
    adWatchSub: 'Gana +{credits} Créditos de IA gratis',
    adClaim: 'Reclamar +{credits} Créditos de IA Ahora',
    adReplay: 'Repetir',
    adRemainingToday: 'Quedan {remaining} videos hoy (límite: {max}/día).',
    adStreakHint: 'Mira días seguidos para aumentar tu recompensa.',
    adBannerTitle: 'Mantén MemoriaFlash 100% Gratis',
    adBannerWatch: 'Mira un video corto para ganar +{credits} Créditos de IA · {remaining} restantes hoy',
    adBannerLimitReached: 'Límite diario alcanzado. Vuelve mañana o refiere un amigo para ganar más créditos.',
    adBannerWatchBtn: 'Ver (+{credits})',
    adBannerLimitBtn: 'Límite alcanzado',
    adBannerReferBtn: 'Referir',
    adInterstitialTitle: 'MemoriaFlash Network',
    adInterstitialBody: 'Sigue estudiando con repetición espaciada e IA. Considera el plan PRO para quitar anuncios.',
    adRewardToast: '+{credits} Créditos de IA añadidos!',

    // Common
    save: 'Guardar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    language: 'Idioma de la App',
    autoDetected: 'Detectado Automáticamente',

    // Pestaña de Ayuda
    help: {
      title: 'Ayuda',
      subtitle: 'Cómo usar MemoriaFlash y enviar tu feedback.',
      sections: {
        study: {
          title: 'Estudiar',
          description:
            'Tu área de estudio con Repetición Espaciada (SRS/SM-2). Cada tarjeta se repasa en el momento justo para fijarla en la memoria a largo plazo.',
          items: [
            'El Inicio muestra tus mazos y las tarjetas pendientes de repaso.',
            'Toca "Estudiar" para iniciar una sesión de flashcards.',
            'Califica cada tarjeta como Difícil / Bien / Fácil — el algoritmo ajusta los intervalos.',
            'Cuanto más estudies, mayor será tu racha y dominio.',
          ],
        },
        cards: {
          title: 'Tarjetas',
          description:
            'El generador inteligente de flashcards. Escribe una materia y la IA crea tarjetas completas con explicaciones y ejemplos prácticos.',
          items: [
            'Escribe la materia (ej.: Derecho Penal, Biología, Python).',
            'Selecciona los temas y la cantidad de tarjetas (25/50/100).',
            'Cada tarjeta generada incluye pregunta, respuesta, explicación y curiosidad.',
            'También puedes crear tarjetas manualmente con el botón "Crear Tarjeta".',
          ],
        },
        scanner: {
          title: 'Escáner y Subida',
          description:
            'Toma una foto de la página o sube un PDF/imagen. La app extrae el texto (OCR) y lo convierte en flashcards automáticamente.',
          items: [
            'Toca "Tomar Foto de la Página" o sube un archivo.',
            'La IA extrae el contenido de las imágenes y arma las tarjetas.',
            'Revisa el texto extraído antes de generar el mazo.',
          ],
        },
        stats: {
          title: 'Estadísticas',
          description:
            'Sigue tu rendimiento: racha, tarjetas dominadas, horas estudiadas, retención e historial de actividad.',
          items: [
            'Consulta tu racha de días y la meta diaria de estudio.',
            'El mapa de calor muestra tu constancia a lo largo del tiempo.',
            'Sigue el porcentaje de dominio de cada mazo.',
          ],
        },
        ai: {
          title: 'Inteligencia Artificial',
          description:
            'MemoriaFlash usa IA para generar flashcards, explicaciones con ejemplos, sugerencias de temas y análisis de tu rendimiento.',
          items: [
            'La IA genera tarjetas completas con pregunta, respuesta, explicación y curiosidad.',
            'Durante el estudio, usa "Explicar Pregunta y Dar Ejemplo" para ver el contenido didáctico.',
            'Las sugerencias de temas ayudan a detallar mejor el asunto antes de generar.',
          ],
        },
        credits: {
          title: 'Créditos y PRO',
          description:
            'Genera flashcards con IA usando créditos. Mira vídeos recompensados para ganar más, o suscríbete a PRO.',
          items: [
            'Ganas créditos gratis todos los días.',
            'Mira un vídeo corto para ganar +10 créditos.',
            'El plan PRO elimina los anuncios y desbloquea funciones exclusivas.',
          ],
        },
      },
      feedback: {
        heading: 'Envía tu feedback',
        intro:
          '¿Encontraste un problema o quieres sugerir una mejora? Cuéntanos. Tu opinión llega directamente a los desarrolladores.',
        typeBug: '🐞 Reportar un problema',
        typeSuggestion: '💡 Sugerir una mejora',
        typePraise: '❤️ Elogio',
        typeOther: '✉️ Otro',
        placeholder: 'Describe tu feedback, problema o sugerencia...',
        contactPlaceholder: 'Tu correo (opcional — para responderte)',
        send: 'Enviar',
        sentTitle: '¡Feedback enviado!',
        sentBody: 'Gracias por ayudar a mejorar MemoriaFlash. 💜',
        sendAnother: 'Enviar otro feedback',
        errorEmpty: 'Escribe un mensaje antes de enviar.',
        errorShort: 'Cuéntanos un poco más — tu mensaje es muy corto.',
        errorEmail: 'El correo ingresado parece inválido. Déjalo en blanco o corrígelo.',
        errorGeneric: 'No se pudo enviar tu feedback ahora. Revisa tu conexión e inténtalo de nuevo.',
      },
    },
  },
  fr: {
    // Header & Tabs
    home: 'Accueil',
    decks: 'Paquets',
    aiStudio: 'Studio IA',
    stats: 'Statistiques',
    login: 'Connexion',
    credits: 'Crédits',
    proPlan: 'Plan PRO',

    // Home Dashboard
    welcome: 'Bon retour',
    welcomeSub: 'Apprenez 3x plus vite avec la répétition espacée (SRS) et l’IA',
    quickStart: 'Démarrage Rapide',
    studyNow: 'Étudier Maintenant',
    createDeck: 'Créer un Paquet',
    aiGenerator: 'Générateur IA',
    dailyGoal: 'Objectif Quotidien',
    streakDays: 'Jours d’affilée',
    masteredCards: 'Cartes Maîtrisées',
    hoursStudied: 'Heures Étudiées',
    retention: 'Taux de Rétention',

    // Deck & Cards
    deckTitle: 'Mes Paquets d’Étude',
    newDeck: 'Nouveau Paquet',
    cardsCount: 'cartes',
    reviewDue: 'À réviser aujourd’hui',
    studyDeck: 'Étudier le Paquet',
    explainQuestionAndExample: 'Expliquer la Question & Exemple',
    explainTitle: 'Explication Détaillée du Concept',
    practicalExample: 'Exemple Pratique du Monde Réel',
    generatingExplanation: 'Génération de l’explication et exemple avec Gemini IA...',

    // AdMob / Monétisation
    adLabel: 'Pub',
    adRewardedLabel: 'Vidéo Récompensé',
    adClose: 'Fermer',
    adPlaying: 'Lecture de la pub ({s}s)...',
    adNetworkName: 'MemoriaFlash Network',
    adNetworkTagline: 'Boostez votre mémoire avec la répétition espacée et l’IA.',
    adCompleted: 'Pub Terminée !',
    adCompletedMsg: 'Vous avez gagné +{credits} Crédits IA',
    adStreakBonus: '(bonus de série de {days} jours !)',
    adWatchTitle: 'Regarder la Vidéo Sponsorisée',
    adWatchSub: 'Gagnez +{credits} Crédits IA gratuitement',
    adClaim: 'Réclamer +{credits} Crédits IA Maintenant',
    adReplay: 'Rejouer',
    adRemainingToday: '{remaining} vidéos restantes aujourd’hui (limite : {max}/jour).',
    adStreakHint: 'Regardez chaque jour pour augmenter votre récompense.',
    adBannerTitle: 'Gardez MemoriaFlash 100% Gratuit',
    adBannerWatch: 'Regardez une courte vidéo pour gagner +{credits} Crédits IA · {remaining} restants aujourd’hui',
    adBannerLimitReached: 'Limite quotidienne atteinte. Revenez demain ou parrainez un ami pour gagner plus de crédits.',
    adBannerWatchBtn: 'Regarder (+{credits})',
    adBannerLimitBtn: 'Limite atteinte',
    adBannerReferBtn: 'Parrainer',
    adInterstitialTitle: 'MemoriaFlash Network',
    adInterstitialBody: 'Continuez à apprendre avec la répétition espacée et l’IA. Considérez le plan PRO pour supprimer les pubs.',
    adRewardToast: '+{credits} Crédits IA ajoutés !',

    // Common
    save: 'Enregistrer',
    cancel: 'Annuler',
    close: 'Fermer',
    language: 'Langue de l’application',
    autoDetected: 'Détecté automatiquement',

    // Onglet Aide
    help: {
      title: 'Aide',
      subtitle: 'Comment utiliser MemoriaFlash et envoyer votre avis.',
      sections: {
        study: {
          title: 'Étudier',
          description:
            "Votre espace d'étude basé sur la Répétition Espacée (SRS/SM-2). Chaque carte est révisée au bon moment pour l'ancrer dans la mémoire à long terme.",
          items: [
            "L'Accueil affiche vos paquets et les cartes à réviser.",
            'Appuyez sur "Étudier" pour démarrer une session de flashcards.',
            "Évaluez chaque carte comme Difficile / Bien / Facile — l'algorithme ajuste les intervalles.",
            'Plus vous étudiez, plus votre série et votre maîtrise augmentent.',
          ],
        },
        cards: {
          title: 'Cartes',
          description:
            "Le générateur intelligent de flashcards. Tapez une matière et l'IA crée des cartes complètes avec explications et exemples pratiques.",
          items: [
            'Tapez la matière (ex. : Droit pénal, Biologie, Python).',
            'Sélectionnez les sujets et le nombre de cartes (25/50/100).',
            'Chaque carte générée inclut question, réponse, explication et anecdote.',
            'Vous pouvez aussi créer des cartes manuellement avec le bouton "Créer une carte".',
          ],
        },
        scanner: {
          title: 'Scanner et import',
          description:
            "Prenez une photo de la page ou importez un PDF/une image. L'app extrait le texte (OCR) et le transforme en flashcards automatiquement.",
          items: [
            'Appuyez sur "Prendre une photo de la page" ou importez un fichier.',
            "L'IA extrait le contenu des images et construit les cartes.",
            'Vérifiez le texte extrait avant de générer le paquet.',
          ],
        },
        stats: {
          title: 'Statistiques',
          description:
            "Suivez vos performances : série, cartes maîtrisées, heures étudiées, rétention et historique d'activité.",
          items: [
            'Consultez votre série de jours et votre objectif quotidien.',
            'La carte de chaleur montre votre régularité dans le temps.',
            'Suivez le pourcentage de maîtrise de chaque paquet.',
          ],
        },
        ai: {
          title: 'Intelligence Artificielle',
          description:
            "MemoriaFlash utilise l'IA pour générer des flashcards, des explications avec exemples, des suggestions de sujets et une analyse de vos performances.",
          items: [
            "L'IA génère des cartes complètes avec question, réponse, explication et anecdote.",
            'Pendant l\'étude, utilisez "Expliquer la question et donner un exemple" pour voir le contenu pédagogique.',
            'Les suggestions de sujets aident à préciser le thème avant de générer.',
          ],
        },
        credits: {
          title: 'Crédits et PRO',
          description:
            "Générez des flashcards avec l'IA en utilisant des crédits. Regardez des vidéos récompensées pour en gagner plus, ou abonnez-vous à PRO.",
          items: [
            'Vous gagnez des crédits gratuits chaque jour.',
            'Regardez une courte vidéo pour gagner +10 crédits.',
            'Le plan PRO supprime les publicités et débloque des fonctionnalités exclusives.',
          ],
        },
      },
      feedback: {
        heading: 'Envoyez votre avis',
        intro:
          "Vous avez trouvé un problème ou souhaitez suggérer une amélioration ? Dites-le-nous. Votre avis arrive directement aux développeurs.",
        typeBug: '🐞 Signaler un problème',
        typeSuggestion: '💡 Suggérer une amélioration',
        typePraise: '❤️ Compliment',
        typeOther: '✉️ Autre',
        placeholder: 'Décrivez votre avis, problème ou suggestion...',
        contactPlaceholder: 'Votre e-mail (facultatif — pour vous répondre)',
        send: 'Envoyer',
        sentTitle: 'Avis envoyé !',
        sentBody: 'Merci de nous aider à améliorer MemoriaFlash. 💜',
        sendAnother: 'Envoyer un autre avis',
        errorEmpty: "Écrivez un message avant d'envoyer.",
        errorShort: 'Dites-nous en un peu plus — votre message est trop court.',
        errorEmail: "L'e-mail saisi semble invalide. Laissez-le vide ou corrigez-le.",
        errorGeneric: 'Impossible d\'envoyer votre avis pour le moment. Vérifiez votre connexion et réessayez.',
      },
    },
  },
  de: {
    // Header & Tabs
    home: 'Start',
    decks: 'Stapel',
    aiStudio: 'KI-Studio',
    stats: 'Statistiken',
    login: 'Anmelden',
    credits: 'Guthaben',
    proPlan: 'PRO-Plan',

    // Home Dashboard
    welcome: 'Willkommen zurück',
    welcomeSub: 'Lerne 3x schneller mit Spaced Repetition (SRS) & KI',
    quickStart: 'Schnellstart',
    studyNow: 'Jetzt Lernen',
    createDeck: 'Stapel Erstellen',
    aiGenerator: 'KI-Generator',
    dailyGoal: 'Tagesziel',
    streakDays: 'Tage in Folge',
    masteredCards: 'Gemeisterte Karten',
    hoursStudied: 'Gelerne Stunden',
    retention: 'Erinnerungsrate',

    // Deck & Cards
    deckTitle: 'Meine Lernstapel',
    newDeck: 'Neuer Stapel',
    cardsCount: 'Karten',
    reviewDue: 'Heute fällig',
    studyDeck: 'Stapel Lernen',
    explainQuestionAndExample: 'Frage Erklären & Beispiel Geben',
    explainTitle: 'Detaillierte Konzept-Erklärung',
    practicalExample: 'Praktisches Anwendungsbeispiel',
    generatingExplanation: 'Erstelle Erklärung & Beispiel mit Gemini KI...',

    // AdMob / Werbung
    adLabel: 'Werbung',
    adRewardedLabel: 'Belohntes Video',
    adClose: 'Schließen',
    adPlaying: 'Werbung läuft ({s}s)...',
    adNetworkName: 'MemoriaFlash Network',
    adNetworkTagline: 'Stärke dein Gedächtnis mit Spaced Repetition & KI.',
    adCompleted: 'Werbung abgeschlossen!',
    adCompletedMsg: 'Du hast +{credits} KI-Guthaben verdient',
    adStreakBonus: '({days}-Tage-Serie-Bonus!)',
    adWatchTitle: 'Gesponserten Video ansehen',
    adWatchSub: 'Verdiene +{credits} KI-Guthaben kostenlos',
    adClaim: '+{credits} KI-Guthaben jetzt einlösen',
    adReplay: 'Wiederholen',
    adRemainingToday: 'Noch {remaining} Videos heute (Limit: {max}/Tag).',
    adStreakHint: 'Schau täglich, um deine Belohnung zu erhöhen.',
    adBannerTitle: 'Halte MemoriaFlash 100% kostenlos',
    adBannerWatch: 'Schau ein kurzes Video und verdiene +{credits} KI-Guthaben · noch {remaining} heute',
    adBannerLimitReached: 'Tageslimit erreicht. Komm morgen wieder oder empfehle einen Freund für mehr Guthaben.',
    adBannerWatchBtn: 'Ansehen (+{credits})',
    adBannerLimitBtn: 'Limit erreicht',
    adBannerReferBtn: 'Empfehlen',
    adInterstitialTitle: 'MemoriaFlash Network',
    adInterstitialBody: 'Lerne weiter mit Spaced Repetition & KI. Erwäge den PRO-Plan, um Werbung zu entfernen.',
    adRewardToast: '+{credits} KI-Guthaben hinzugefügt!',

    // Common
    save: 'Speichern',
    cancel: 'Abbrechen',
    close: 'Schließen',
    language: 'App-Sprache',
    autoDetected: 'Automatisch erkannt',

    // Hilfe-Tab
    help: {
      title: 'Hilfe',
      subtitle: 'So nutzt du MemoriaFlash und sendest dein Feedback.',
      sections: {
        study: {
          title: 'Lernen',
          description:
            'Dein Lernbereich mit Spaced Repetition (SRS/SM-2). Jede Karte wird genau zum richtigen Zeitpunkt wiederholt, um sie im Langzeitgedächtnis zu verankern.',
          items: [
            'Die Startseite zeigt deine Decks und die fälligen Karten.',
            'Tippe auf "Lernen", um eine Karteikarten-Sitzung zu starten.',
            'Bewerte jede Karte als Schwer / Gut / Leicht — der Algorithmus passt die Intervalle an.',
            'Je mehr du lernst, desto höher werden Streak und Beherrschung.',
          ],
        },
        cards: {
          title: 'Karten',
          description:
            'Der intelligente Karteikarten-Generator. Gib ein Thema ein und die KI erstellt vollständige Karten mit Erklärungen und praktischen Beispielen.',
          items: [
            'Gib das Thema ein (z. B. Strafrecht, Biologie, Python).',
            'Wähle die Unterthemen und die Kartenanzahl (25/50/100).',
            'Jede generierte Karte enthält Frage, Antwort, Erklärung und ein interessantes Detail.',
            'Du kannst Karten auch manuell mit dem Button "Karte erstellen" anlegen.',
          ],
        },
        scanner: {
          title: 'Scanner & Upload',
          description:
            'Fotografiere eine Seite oder lade ein PDF/Bild hoch. Die App extrahiert den Text (OCR) und wandelt ihn automatisch in Karteikarten um.',
          items: [
            'Tippe auf "Seite fotografieren" oder lade eine Datei hoch.',
            'Die KI extrahiert den Inhalt aus den Bildern und erstellt die Karten.',
            'Prüfe den extrahierten Text, bevor du das Deck generierst.',
          ],
        },
        stats: {
          title: 'Statistiken',
          description:
            'Verfolge deine Leistung: Streak, gemeisterte Karten, Lernstunden, Behaltensrate und Aktivitätsverlauf.',
          items: [
            'Sieh dir deinen Tage-Streak und dein Tagesziel an.',
            'Die Heatmap zeigt deine Beständigkeit über die Zeit.',
            'Verfolge den Beherrschungsgrad jedes Decks.',
          ],
        },
        ai: {
          title: 'Künstliche Intelligenz',
          description:
            'MemoriaFlash nutzt KI, um Karteikarten, Erklärungen mit Beispielen, Themenvorschläge und Leistungsanalysen zu erstellen.',
          items: [
            'Die KI erstellt vollständige Karten mit Frage, Antwort, Erklärung und interessantem Detail.',
            'Nutze beim Lernen "Frage erklären & Beispiel geben", um den Lerninhalt zu sehen.',
            'Themenvorschläge helfen, das Thema vor dem Generieren genauer einzugrenzen.',
          ],
        },
        credits: {
          title: 'Guthaben & PRO',
          description:
            'Erstelle KI-Karteikarten mit Guthaben. Schau Belohnungsvideos, um mehr zu verdienen, oder abonniere PRO.',
          items: [
            'Du erhältst täglich kostenloses Guthaben.',
            'Schau ein kurzes Video, um +10 Guthaben zu verdienen.',
            'Der PRO-Plan entfernt Werbung und schaltet exklusive Funktionen frei.',
          ],
        },
      },
      feedback: {
        heading: 'Sende dein Feedback',
        intro:
          'Hast du ein Problem gefunden oder möchtest eine Verbesserung vorschlagen? Sag es uns. Dein Feedback geht direkt an die Entwickler.',
        typeBug: '🐞 Problem melden',
        typeSuggestion: '💡 Verbesserung vorschlagen',
        typePraise: '❤️ Lob',
        typeOther: '✉️ Sonstiges',
        placeholder: 'Beschreibe dein Feedback, Problem oder deinen Vorschlag...',
        contactPlaceholder: 'Deine E-Mail (optional — damit wir antworten können)',
        send: 'Senden',
        sentTitle: 'Feedback gesendet!',
        sentBody: 'Danke, dass du hilfst, MemoriaFlash zu verbessern. 💜',
        sendAnother: 'Weiteres Feedback senden',
        errorEmpty: 'Schreibe eine Nachricht, bevor du sendest.',
        errorShort: 'Erzähl uns etwas mehr — deine Nachricht ist zu kurz.',
        errorEmail: 'Die eingegebene E-Mail scheint ungültig zu sein. Lass das Feld leer oder korrigiere sie.',
        errorGeneric: 'Dein Feedback konnte gerade nicht gesendet werden. Prüfe deine Verbindung und versuche es erneut.',
      },
    },
  },
};
