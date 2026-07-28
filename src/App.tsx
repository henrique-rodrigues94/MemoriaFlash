import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { OnboardingModal } from './components/OnboardingModal';
import { DashboardView } from './components/DashboardView';
import { StudySessionView } from './components/StudySessionView';

// ----------------------------------------------------------------------------
// Code-splitting: telas/modais que não são necessários no primeiro carregamento
// (abas que não são "home", ou modais abertos sob demanda) viram chunks
// separados via React.lazy — isso reduz o bundle inicial (o build acusava
// >1MB num único arquivo). DashboardView/StudySessionView ficam eager porque
// aparecem imediatamente na tela inicial.
// ----------------------------------------------------------------------------
const VoiceTutorView = lazy(() => import('./components/VoiceTutorView').then((m) => ({ default: m.VoiceTutorView })));
const VoiceSettingsModal = lazy(() =>
  import('./components/VoiceSettingsModal').then((m) => ({ default: m.VoiceSettingsModal }))
);
const DuelLobbyView = lazy(() => import('./components/DuelLobbyView').then((m) => ({ default: m.DuelLobbyView })));
const DuelArenaView = lazy(() => import('./components/DuelArenaView').then((m) => ({ default: m.DuelArenaView })));
const DuelResultsView = lazy(() =>
  import('./components/DuelResultsView').then((m) => ({ default: m.DuelResultsView }))
);
const CreationHubView = lazy(() =>
  import('./components/CreationHubView').then((m) => ({ default: m.CreationHubView }))
);
const StatsView = lazy(() => import('./components/StatsView').then((m) => ({ default: m.StatsView })));
const TeacherOverviewView = lazy(() =>
  import('./components/TeacherOverviewView').then((m) => ({ default: m.TeacherOverviewView }))
);
const DeckManagerModal = lazy(() =>
  import('./components/DeckManagerModal').then((m) => ({ default: m.DeckManagerModal }))
);
const DecksLibraryView = lazy(() =>
  import('./components/DecksLibraryView').then((m) => ({ default: m.DecksLibraryView }))
);
import { TabLoadingFallback } from './components/TabLoadingFallback';

import {
  Deck,
  UserStats,
  VoiceSettings,
  VoiceHistoryItem,
  TeacherClass,
  ActiveTab,
  QuizQuestion,
} from './types';

import {
  getStoredDecks,
  saveStoredDecks,
  getStoredStats,
  saveStoredStats,
  getVoiceSettings,
  saveVoiceSettings,
  getVoiceHistory,
  saveVoiceHistory,
  getStoredClasses,
  saveStoredClasses,
  isOnboardingDone,
  setOnboardingDone,
} from './services/storage';

import {
  syncDecksFromFirestore,
  saveDeckToFirestore,
  deleteDeckFromFirestore,
  syncStatsFromFirestore,
  saveStatsToFirestore,
  syncClassesFromFirestore,
  saveClassToFirestore,
} from './services/firebaseStorage';

const AdMobRewardedModal = lazy(() =>
  import('./components/AdMobRewardedModal').then((m) => ({ default: m.AdMobRewardedModal }))
);
const AdMobInterstitialModal = lazy(() =>
  import('./components/AdMobInterstitialModal').then((m) => ({ default: m.AdMobInterstitialModal }))
);
const SubscriptionModal = lazy(() =>
  import('./components/SubscriptionModal').then((m) => ({ default: m.SubscriptionModal }))
);
const AuthModal = lazy(() => import('./components/AuthModal').then((m) => ({ default: m.AuthModal })));
const ReferralModal = lazy(() => import('./components/ReferralModal').then((m) => ({ default: m.ReferralModal })));
const NotificationSettingsModal = lazy(() =>
  import('./components/NotificationSettingsModal').then((m) => ({ default: m.NotificationSettingsModal }))
);
const LanguageSelectorModal = lazy(() =>
  import('./components/LanguageSelectorModal').then((m) => ({ default: m.LanguageSelectorModal }))
);
import { ConsentBanner } from './components/ConsentBanner';
import { detectBrowserLanguage, SupportedLanguage } from './lib/i18n';
import { apiGenerateQuiz } from './services/api';
import { auth, onAuthStateChanged, ensureAuthenticated } from './lib/firebase';
import {
  applyRewardedAdWatched,
  applyDailyFreeGrantIfNeeded,
  applySpendCredits,
  canShowInterstitial,
  applyInterstitialShown,
} from './services/economy/creditsEngine';
import { deriveReferralCode } from './shared/referralCode';
import { applyStudySessionCompleted } from './services/studyStreak';
import {
  capturePendingReferralFromURL,
  ensureOwnReferralCodeRegistered,
  tryClaimPendingReferral,
} from './services/referral/referralClient';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [showOnboarding, setShowOnboarding] = useState(!isOnboardingDone());
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [showAdMobModal, setShowAdMobModal] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Auto-detected or saved language
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(detectBrowserLanguage());

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    setCurrentLanguage(lang);
    // Sync with voice tutor settings language
    const updatedVoice = { ...voiceSettings, language: lang };
    setVoiceSettingsState(updatedVoice);
    saveVoiceSettings(updatedVoice);
  };

  // Storage states
  const [decks, setDecks] = useState<Deck[]>(getStoredDecks());
  const [stats, setStats] = useState<UserStats>(getStoredStats());
  const [voiceSettings, setVoiceSettingsState] = useState<VoiceSettings>(getVoiceSettings());
  const [voiceHistory, setVoiceHistoryState] = useState<VoiceHistoryItem[]>(getVoiceHistory());
  const [teacherClasses, setTeacherClassesState] = useState<TeacherClass[]>(getStoredClasses());

  // Active Session / Modal States
  const [activeStudyDeck, setActiveStudyDeck] = useState<Deck | null>(null);
  const [managedDeck, setManagedDeck] = useState<Deck | null>(null);

  // Duel State
  const [duelStage, setDuelStage] = useState<'lobby' | 'arena' | 'results'>('lobby');
  const [duelOpponent, setDuelOpponent] = useState({ name: 'Bot Alex (IA)', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80' });
  const [duelQuestions, setDuelQuestions] = useState<QuizQuestion[]>([]);
  const [duelResults, setDuelResults] = useState<{
    userPoints: number;
    opponentPoints: number;
    wrongQuestions: QuizQuestion[];
  }>({ userPoints: 0, opponentPoints: 0, wrongQuestions: [] });

  // Persistence & Firestore Effects
  useEffect(() => {
    saveStoredDecks(decks);
  }, [decks]);

  useEffect(() => {
    saveStoredStats(stats);
  }, [stats]);

  // Captura ?ref=CODE da URL assim que o app abre (indicação de amigo).
  useEffect(() => {
    capturePendingReferralFromURL();
  }, []);

  // Concede o crédito diário gratuito 1x por dia (independente de anúncios).
  useEffect(() => {
    setStats((prev) => applyDailyFreeGrantIfNeeded(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Garante um código de indicação local (funciona mesmo em modo "guest" sem
  // Firebase Auth real habilitado). Assim que houver um usuário Firebase
  // real (login Google ou Auth Anônima ativada no console), registra o
  // código no servidor e tenta resgatar uma indicação pendente com segurança
  // via backend (Admin SDK) — ver src/server/routes/referral.ts.
  useEffect(() => {
    ensureAuthenticated().then((user) => {
      const code = deriveReferralCode(user.uid);
      setStats((prev) => (prev.referralCode === code ? prev : { ...prev, referralCode: code }));
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const code = (await ensureOwnReferralCodeRegistered()) || deriveReferralCode(user.uid);
      setStats((prev) => (prev.referralCode === code ? prev : { ...prev, referralCode: code }));

      const claim = await tryClaimPendingReferral();
      if (claim?.success && claim.welcomeBonus) {
        setStats((prev) => ({
          ...prev,
          aiCredits: (prev.aiCredits || 0) + claim.welcomeBonus!,
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore Listeners
  useEffect(() => {
    let unsubDecks: (() => void) | undefined;
    let unsubStats: (() => void) | undefined;
    let unsubClasses: (() => void) | undefined;

    syncDecksFromFirestore((remoteDecks) => {
      if (remoteDecks && remoteDecks.length > 0) {
        setDecks(remoteDecks);
      }
    }).then((unsub) => {
      unsubDecks = unsub;
    });

    syncStatsFromFirestore((remoteStats) => {
      if (remoteStats) {
        setStats(remoteStats);
      }
    }).then((unsub) => {
      unsubStats = unsub;
    });

    syncClassesFromFirestore((remoteClasses) => {
      if (remoteClasses && remoteClasses.length > 0) {
        setTeacherClassesState(remoteClasses);
      }
    }).then((unsub) => {
      unsubClasses = unsub;
    });

    return () => {
      if (unsubDecks) unsubDecks();
      if (unsubStats) unsubStats();
      if (unsubClasses) unsubClasses();
    };
  }, []);

  const handleDeductCredit = (amount: number = 1) => {
    const updatedStats = applySpendCredits(stats, amount);
    setStats(updatedStats);
    saveStoredStats(updatedStats);
    saveStatsToFirestore(updatedStats);
  };

  const handleRewardEarned = () => {
    const { updated } = applyRewardedAdWatched(stats);
    setStats(updated);
    saveStoredStats(updated);
    saveStatsToFirestore(updated);
  };

  const maybeShowInterstitial = (baseStats: UserStats) => {
    if (baseStats.isPro) return;
    if (!canShowInterstitial(baseStats)) return;
    const updated = applyInterstitialShown(baseStats);
    setStats(updated);
    saveStoredStats(updated);
    setShowInterstitial(true);
  };

  const handleUpgradePro = (planType: 'monthly' | 'annual') => {
    const updatedStats: UserStats = {
      ...stats,
      isPro: true,
      proPlanType: planType,
      xp: stats.xp + (planType === 'annual' ? 5000 : 1000),
    };
    setStats(updatedStats);
    saveStoredStats(updatedStats);
    saveStatsToFirestore(updatedStats);
  };

  const handleCloseOnboarding = () => {
    setOnboardingDone(true);
    setShowOnboarding(false);
  };

  const handleStartStudySession = (deck: Deck) => {
    setActiveStudyDeck(deck);
  };

  const handleFinishStudySession = (updatedDeck: Deck, cardsReviewedCount: number) => {
    const updatedDecks = decks.map((d) => (d.id === updatedDeck.id ? updatedDeck : d));
    setDecks(updatedDecks);
    saveDeckToFirestore(updatedDeck);

    // Update user stats (streak e meta diária calculados corretamente por dia — ver src/services/studyStreak.ts)
    const streakUpdatedStats = applyStudySessionCompleted(stats, cardsReviewedCount);
    const newStats: UserStats = {
      ...streakUpdatedStats,
      totalCardsMastered: stats.totalCardsMastered + Math.floor(cardsReviewedCount / 2),
      xp: stats.xp + cardsReviewedCount * 25,
    };
    setStats(newStats);
    saveStatsToFirestore(newStats);
    setActiveStudyDeck(null);
    setActiveTab('home');
    maybeShowInterstitial(newStats);
  };

  const handleSaveDeck = (updatedDeck: Deck) => {
    const exists = decks.some((d) => d.id === updatedDeck.id);
    if (exists) {
      setDecks(decks.map((d) => (d.id === updatedDeck.id ? updatedDeck : d)));
    } else {
      setDecks([updatedDeck, ...decks]);
    }
    saveDeckToFirestore(updatedDeck);
  };

  const handleDeleteDeck = (deckId: string) => {
    setDecks(decks.filter((d) => d.id !== deckId));
    deleteDeckFromFirestore(deckId);
  };

  const handleAddCardToDeck = (deckId: string, card: { front: string; back: string }) => {
    const targetDeck = decks.find((d) => d.id === deckId);
    if (!targetDeck) return;

    const newCard = {
      id: `card-voice-${Date.now()}`,
      front: card.front,
      back: card.back,
      topic: targetDeck.category,
      difficulty: 'medium' as const,
      reps: 0,
      interval: 0,
      efactor: 2.5,
      dueDate: new Date().toISOString(),
    };

    const updatedDeck: Deck = {
      ...targetDeck,
      cards: [...targetDeck.cards, newCard],
    };

    handleSaveDeck(updatedDeck);
  };

  const handleStartDuel = async (opponentType: 'ai' | 'player', topic: string) => {
    if (opponentType === 'ai') {
      setDuelOpponent({
        name: 'Bot Gemini IA',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      });
    } else {
      setDuelOpponent({
        name: 'Gabriel Santos (Online)',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80',
      });
    }

    try {
      const qList = await apiGenerateQuiz(topic, 5, currentLanguage);
      setDuelQuestions(qList);
    } catch {
      // Fallback questions if offline
      setDuelQuestions([
        {
          question: 'O que caracteriza o mecanismo de repetição espaçada no algoritmo SM-2?',
          options: [
            'Revisar todos os cards diariamente sem distinção',
            'Ajustar os intervalos baseando-se na facilidade de lembrança do usuário',
            'Aleatorizar o tempo entre revisões para surpreender o cérebro',
            'Eliminar cartões que foram errados mais de 3 vezes',
          ],
          correctIndex: 1,
          explanation: 'O SM-2 calcula um Fator de Facilidade (EF) dinâmico que expande os dias entre as revisões conforme a retenção aumenta.',
        },
        {
          question: 'Qual remetente tem garantia constitucional via Mandado de Segurança?',
          options: [
            'Qualquer cidadão sem necessidade de advogado',
            'Direito líquido e certo não amparado por Habeas Corpus ou Habeas Data',
            'Apenas crimes ambientais em zonas rurais',
            'Processos trabalhistas de menor complexidade',
          ],
          correctIndex: 1,
          explanation: 'O Mandado de Segurança protege direito líquido e certo contra ilegalidade de autoridade pública.',
        },
      ]);
    }
    setDuelStage('arena');
  };

  const handleFinishDuel = (
    userPoints: number,
    opponentPoints: number,
    wrongQuestions: QuizQuestion[]
  ) => {
    setDuelResults({ userPoints, opponentPoints, wrongQuestions });
    setDuelStage('results');

    // Grant XP
    const gained = userPoints >= opponentPoints ? 250 : 100;
    const newStats = { ...stats, xp: stats.xp + gained };
    setStats(newStats);
    maybeShowInterstitial(newStats);
  };

  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] font-sans antialiased selection:bg-[#adc6ff]/30 selection:text-white">
      {/* App Header */}
      <Header
        stats={stats}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentLanguage={currentLanguage}
        onOpenLanguageSelector={() => setShowLanguageModal(true)}
        onOpenVoiceSettings={() => setShowVoiceSettings(true)}
        onShowOnboarding={() => setShowOnboarding(true)}
        onOpenSubscription={() => setShowSubscriptionModal(true)}
        onOpenAdMob={() => setShowAdMobModal(true)}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenReferral={() => setShowReferralModal(true)}
        onOpenNotifications={() => setShowNotificationsModal(true)}
      />

      {/* Main Content Viewport */}
      <main className="pt-20 px-4 sm:px-6 max-w-6xl mx-auto">
        {/* If Active Study Session */}
        {activeStudyDeck ? (
          <StudySessionView
            deck={activeStudyDeck}
            currentLanguage={currentLanguage}
            onFinishSession={handleFinishStudySession}
            onBack={() => setActiveStudyDeck(null)}
          />
        ) : (
          <Suspense fallback={<TabLoadingFallback />}>
            <>
              {activeTab === 'home' && (
              <DashboardView
                stats={stats}
                decks={decks}
                currentLanguage={currentLanguage}
                onOpenLanguageSelector={() => setShowLanguageModal(true)}
                setActiveTab={setActiveTab}
                onStartStudySession={handleStartStudySession}
                onManageDeck={(deck) => setManagedDeck(deck)}
                onOpenQuickCreate={() => setActiveTab('create')}
                onOpenAdMob={() => setShowAdMobModal(true)}
                onOpenSubscription={() => setShowSubscriptionModal(true)}
                onOpenReferral={() => setShowReferralModal(true)}
              />
            )}

            {activeTab === 'explore' && (
              <DecksLibraryView
                decks={decks}
                currentLanguage={currentLanguage}
                setActiveTab={setActiveTab}
                onStartStudySession={handleStartStudySession}
                onManageDeck={(deck) => setManagedDeck(deck)}
                onOpenQuickCreate={() => setActiveTab('create')}
              />
            )}

            {activeTab === 'create' && (
              <CreationHubView
                decks={decks}
                stats={stats}
                currentLanguage={currentLanguage}
                onSaveNewDeck={handleSaveDeck}
                onDeductCredit={handleDeductCredit}
                onOpenAdMob={() => setShowAdMobModal(true)}
                onOpenSubscription={() => setShowSubscriptionModal(true)}
              />
            )}

            {activeTab === 'voice' && (
              <VoiceTutorView
                settings={voiceSettings}
                history={voiceHistory}
                decks={decks}
                stats={stats}
                currentLanguage={currentLanguage}
                onOpenVoiceSettings={() => setShowVoiceSettings(true)}
                onSaveHistory={(hist) => {
                  setVoiceHistoryState(hist);
                  saveVoiceHistory(hist);
                }}
                onAddCardToDeck={handleAddCardToDeck}
                onDeductCredit={handleDeductCredit}
                onOpenAdMob={() => setShowAdMobModal(true)}
                onOpenSubscription={() => setShowSubscriptionModal(true)}
              />
            )}

            {activeTab === 'duel' && (
              <>
                {duelStage === 'lobby' && (
                  <DuelLobbyView stats={stats} onStartDuel={handleStartDuel} />
                )}
                {duelStage === 'arena' && (
                  <DuelArenaView
                    stats={stats}
                    opponentName={duelOpponent.name}
                    opponentAvatar={duelOpponent.avatar}
                    questions={duelQuestions}
                    onFinishDuel={handleFinishDuel}
                  />
                )}
                {duelStage === 'results' && (
                  <DuelResultsView
                    userPoints={duelResults.userPoints}
                    opponentPoints={duelResults.opponentPoints}
                    opponentName={duelOpponent.name}
                    wrongQuestions={duelResults.wrongQuestions}
                    onReturnToLobby={() => setDuelStage('lobby')}
                  />
                )}
              </>
            )}

            {activeTab === 'stats' && <StatsView stats={stats} decks={decks} />}

            {activeTab === 'teacher' && (
              <TeacherOverviewView
                classes={teacherClasses}
                onSaveClass={(newCls) => {
                  const updated = [newCls, ...teacherClasses];
                  setTeacherClassesState(updated);
                  saveStoredClasses(updated);
                  saveClassToFirestore(newCls);
                }}
              />
            )}
          </>
          </Suspense>
        )}
      </main>

      {/* Bottom Mobile Shell Nav */}
      {!activeStudyDeck && (
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} currentLanguage={currentLanguage} />
      )}

      {/* Onboarding Intro Modal */}
      {showOnboarding && (
        <OnboardingModal
          onClose={handleCloseOnboarding}
          onOpenAuth={() => setShowAuthModal(true)}
        />
      )}

      {/* Modais sob demanda (code-split via React.lazy) — fallback nulo pois o
          carregamento é quase instantâneo (poucos KB) e o usuário acabou de
          clicar em algo, então uma tela em branco por ~alguns ms passa despercebido. */}
      <Suspense fallback={null}>
        {/* Voice Assistant Settings Modal */}
        {showVoiceSettings && (
          <VoiceSettingsModal
            settings={voiceSettings}
            onSave={(updated) => {
              setVoiceSettingsState(updated);
              saveVoiceSettings(updated);
            }}
            onClose={() => setShowVoiceSettings(false)}
          />
        )}

        {/* Deck Manager Modal */}
        {managedDeck && (
          <DeckManagerModal
            deck={managedDeck}
            onSaveDeck={handleSaveDeck}
            onDeleteDeck={handleDeleteDeck}
            onClose={() => setManagedDeck(null)}
          />
        )}

        {/* AdMob Rewarded Video Ad Modal */}
        {showAdMobModal && (
          <AdMobRewardedModal
            stats={stats}
            onRewardEarned={handleRewardEarned}
            onClose={() => setShowAdMobModal(false)}
            currentLanguage={currentLanguage}
          />
        )}

        {/* AdMob Interstitial (frequency-capped, shown after study/duel sessions) */}
        {showInterstitial && <AdMobInterstitialModal onClose={() => setShowInterstitial(false)} />}

        {/* Referral / Indique e Ganhe Modal */}
        {showReferralModal && <ReferralModal stats={stats} onClose={() => setShowReferralModal(false)} />}

        {/* Lembretes de Revisão (Push Notifications) Modal */}
        {showNotificationsModal && <NotificationSettingsModal onClose={() => setShowNotificationsModal(false)} />}

        {/* Subscription Plans Modal */}
        {showSubscriptionModal && (
          <SubscriptionModal
            stats={stats}
            onUpgradePro={handleUpgradePro}
            onOpenAdMob={() => {
              setShowSubscriptionModal(false);
              setShowAdMobModal(true);
            }}
            onClose={() => setShowSubscriptionModal(false)}
          />
        )}

        {/* Google Login / Auth Modal */}
        {showAuthModal && (
          <AuthModal
            stats={stats}
            onUpdateStats={(newStats) => {
              const updated = { ...stats, ...newStats };
              setStats(updated);
              saveStoredStats(updated);
              saveStatsToFirestore(updated);
            }}
            onClose={() => setShowAuthModal(false)}
          />
        )}

        {/* Language Selector Modal */}
        {showLanguageModal && (
          <LanguageSelectorModal
            currentLanguage={currentLanguage}
            onSelectLanguage={handleSelectLanguage}
            onClose={() => setShowLanguageModal(false)}
          />
        )}
      </Suspense>

      {/* LGPD/GDPR Consent Banner — exibido antes de qualquer coleta não essencial */}
      <ConsentBanner />
    </div>
  );
}

export default App;
