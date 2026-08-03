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
  },
};
