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
    voiceTutor: 'Tutor de Voz',
    duel: 'Duelo 1v1',
    teacher: 'Turmas',
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

    // Voice Tutor
    voiceTitle: 'Assistente de Voz estilo Alexa',
    voiceSub: 'Converse por voz sem apertar botões, tire dúvidas e crie flashcards com a IA.',
    handsFreeMode: 'Modo Viva-Voz Contínuo',
    handsFreeActive: 'Escutando e respondendo sem botões. Clique para desativar.',
    handsFreeInactive: 'Clique para ativar a conversa contínua viva-voz estilo Alexa.',
    voiceSettings: 'Voz & Sotaques',
    voiceCommands: 'Comandos de Voz',
    listening: 'Ouvindo sua dúvida... Fale agora!',
    thinking: 'Gemini 3.6 Flash gerando explicação...',
    speaking: 'Falando resposta por voz...',
    tapMic: 'Toque no microfone ou ative o Modo Viva-Voz',
    quickQuestions: 'Sugestões de Perguntas do Tópico:',

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

    // Common
    save: 'Salvar',
    cancel: 'Cancelar',
    close: 'Fechar',
    language: 'Idioma do App',
    autoDetected: 'Detectado Automaticamente',
  },
  en: {
    // Header & Tabs
    home: 'Home',
    decks: 'Decks',
    aiStudio: 'AI Studio',
    voiceTutor: 'Voice Tutor',
    duel: '1v1 Duel',
    teacher: 'Classes',
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

    // Voice Tutor
    voiceTitle: 'Alexa-style Voice Assistant',
    voiceSub: 'Hands-free voice chat, ask questions, and auto-generate flashcards.',
    handsFreeMode: 'Continuous Hands-Free Mode',
    handsFreeActive: 'Listening & answering automatically. Click to disable.',
    handsFreeInactive: 'Click to activate continuous hands-free Alexa-style mode.',
    voiceSettings: 'Voice & Accents',
    voiceCommands: 'Voice Commands',
    listening: 'Listening to your question... Speak now!',
    thinking: 'Gemini 3.6 Flash thinking...',
    speaking: 'Speaking answer aloud...',
    tapMic: 'Tap the mic or enable Hands-Free Mode',
    quickQuestions: 'Suggested Questions for this Topic:',

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

    // Common
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    language: 'App Language',
    autoDetected: 'Auto-Detected',
  },
  es: {
    // Header & Tabs
    home: 'Inicio',
    decks: 'Mazos',
    aiStudio: 'Estudio IA',
    voiceTutor: 'Tutor de Voz',
    duel: 'Duelo 1v1',
    teacher: 'Clases',
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

    // Voice Tutor
    voiceTitle: 'Asistente de Voz estilo Alexa',
    voiceSub: 'Charla por voz sin botones, resuelve dudas y crea flashcards.',
    handsFreeMode: 'Modo Manos Libres Continuo',
    handsFreeActive: 'Escuchando y respondiendo. Clic para desactivar.',
    handsFreeInactive: 'Clic para activar el modo manos libres estilo Alexa.',
    voiceSettings: 'Voz y Acentos',
    voiceCommands: 'Comandos de Voz',
    listening: 'Escuchando tu pregunta... ¡Habla ahora!',
    thinking: 'Gemini 3.6 Flash pensando...',
    speaking: 'Respondiendo en voz alta...',
    tapMic: 'Toca el micrófono o activa el Modo Manos Libres',
    quickQuestions: 'Sugerencias de preguntas:',

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

    // Common
    save: 'Guardar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    language: 'Idioma de la App',
    autoDetected: 'Detectado Automáticamente',
  },
  fr: {
    // Header & Tabs
    home: 'Accueil',
    decks: 'Paquets',
    aiStudio: 'Studio IA',
    voiceTutor: 'Tuteur Vocal',
    duel: 'Duel 1v1',
    teacher: 'Classes',
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

    // Voice Tutor
    voiceTitle: 'Assistant Vocal style Alexa',
    voiceSub: 'Discutez vocalement sans mains, posez des questions et créez des cartes.',
    handsFreeMode: 'Mode Mains Libres Continu',
    handsFreeActive: 'Écoute et répond automatiquement. Cliquez pour désactiver.',
    handsFreeInactive: 'Cliquez pour activer le mode mains libres continu.',
    voiceSettings: 'Voix et Accents',
    voiceCommands: 'Commandes Vocales',
    listening: 'À l’écoute de votre question... Parlez maintenant !',
    thinking: 'Gemini 3.6 Flash réfléchit...',
    speaking: 'Réponse vocale en cours...',
    tapMic: 'Touchez le micro ou activez le mode mains libres',
    quickQuestions: 'Questions suggérées :',

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

    // Common
    save: 'Enregistrer',
    cancel: 'Annuler',
    close: 'Fermer',
    language: 'Langue de l’application',
    autoDetected: 'Détecté automatiquement',
  },
  de: {
    // Header & Tabs
    home: 'Start',
    decks: 'Stapel',
    aiStudio: 'KI-Studio',
    voiceTutor: 'Sprach-Tutor',
    duel: '1v1 Duell',
    teacher: 'Klassen',
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

    // Voice Tutor
    voiceTitle: 'Sprachassistent im Alexa-Stil',
    voiceSub: 'Freihändige Sprachsteuerung, Fragen stellen und Karteikarten erstellen.',
    handsFreeMode: 'Kontinuierlicher Freisprechmodus',
    handsFreeActive: 'Hört zu und antwortet automatisch. Zum Deaktivieren klicken.',
    handsFreeInactive: 'Klicken zum Aktivieren des kontinuierlichen Freisprechmodus.',
    voiceSettings: 'Stimme & Akzente',
    voiceCommands: 'Sprachbefehle',
    listening: 'Höre deine Frage... Sprich jetzt!',
    thinking: 'Gemini 3.6 Flash denkt nach...',
    speaking: 'Antwortet laut...',
    tapMic: 'Tippe auf das Mikrofon oder aktiviere den Freisprechmodus',
    quickQuestions: 'Empfohlene Fragen:',

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

    // Common
    save: 'Speichern',
    cancel: 'Abbrechen',
    close: 'Schließen',
    language: 'App-Sprache',
    autoDetected: 'Automatisch erkannt',
  },
};
