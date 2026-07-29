import React, { useState, useEffect, Suspense, lazy } from 'react';

// Componentes síncronos
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { OnboardingModal } from './components/OnboardingModal';
import { DashboardView } from './components/DashboardView';
import { StudySessionView } from './components/StudySessionView';
import { TabLoadingFallback } from './components/TabLoadingFallback';
import { ConsentBanner } from './components/ConsentBanner';

// Componentes lazy (code-splitting)
const VoiceTutorView = lazy(() =>
  import('./components/VoiceTutorView').then((m) => ({ default: m.VoiceTutorView }))
);
const VoiceSettingsModal = lazy(() =>
  import('./components/VoiceSettingsModal').then((m) => ({ default: m.VoiceSettingsModal }))
);
// Duel removido: DuelLobbyView, DuelArenaView, DuelResultsView
const CreationHubView = lazy(() =>
  import('./components/CreationHubView').then((m) => ({ default: m.CreationHubView }))
);
const StatsView = lazy(() =>
  import('./components/StatsView').then((m) => ({ default: m.StatsView }))
);
const TeacherOverviewView = lazy(() =>
  import('./components/TeacherOverviewView').then((m) => ({ default: m.TeacherOverviewView }))
);
const DeckManagerModal = lazy(() =>
  import('./components/DeckManagerModal').then((m) => ({ default: m.DeckManagerModal }))
);
const AdMobRewardedModal = lazy(() =>
  import('./components/AdMobRewardedModal').then((m) => ({ default: m.AdMobRewardedModal }))
);
const AdMobInterstitialModal = lazy(() =>
  import('./components/AdMobInterstitialModal').then((m) => ({ default: m.AdMobInterstitialModal }))
);
const SubscriptionModal = lazy(() =>
  import('./components/SubscriptionModal').then((m) => ({ default: m.SubscriptionModal }))
);
const AuthModal = lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const ReferralModal = lazy(() =>
  import('./components/ReferralModal').then((m) => ({ default: m.ReferralModal }))
);
const NotificationSettingsModal = lazy(() =>
  import('./components/NotificationSettingsModal').then((m) => ({ default: m.NotificationSettingsModal }))
);
const LanguageSelectorModal = lazy(() =>
  import('./components/LanguageSelectorModal').then((m) => ({ default: m.LanguageSelectorModal }))
);

// Tipos e serviços
import {
  Deck,
  UserStats,
  VoiceSettings,
  VoiceHistoryItem,
  TeacherClass,
  ActiveTab,
  // QuizQuestion removido (não usado sem Duelo)
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

import {
  applyRewardedAdWatched,
  applyDailyFreeGrantIfNeeded,
  applySpendCredits,
  canShowInterstitial,
  applyInterstitialShown,
} from './services/economy/creditsEngine';

import { applyStudySessionCompleted } from './services/studyStreak';
// apiGenerateQuiz não é mais necessário sem Duelo
// import { apiGenerateQuiz } from './services/api';
import { detectBrowserLanguage, SupportedLanguage } from './lib/i18n';
import { auth, onAuthStateChanged, ensureAuthenticated } from './lib/firebase';
import { deriveReferralCode } from './shared/referralCode';
import {
  capturePendingReferralFromURL,
  ensureOwnReferralCodeRegistered,
  tryClaimPendingReferral,
} from './services/referral/referralClient';

// ============================================================================
// APP PRINCIPAL
// ============================================================================
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

  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    detectBrowserLanguage()
  );

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    setCurrentLanguage(lang);
    const updatedVoice = { ...voiceSettings, language: lang };
    setVoiceSettingsState(updatedVoice);
    saveVoiceSettings(updatedVoice);
  };

  const [decks, setDecks] = useState<Deck[]>(getStoredDecks());
  const [stats, setStats] = useState<UserStats>(getStoredStats());
  const [voiceSettings, setVoiceSettingsState] = useState<VoiceSettings>(getVoiceSettings());
  const [voiceHistory, setVoiceHistoryState] = useState<VoiceHistoryItem[]>(getVoiceHistory());
  const [teacherClasses, setTeacherClassesState] = useState<TeacherClass[]>(getStoredClasses());

  const [activeStudyDeck, setActiveStudyDeck] = useState<Deck | null>(null);
  const [managedDeck, setManagedDeck] = useState<Deck | null>(null);

  // Estados de Duelo removidos

  // Efeitos (mantidos)
  useEffect(() => {
    saveStoredDecks(decks);
  }, [decks]);

  useEffect(() => {
    saveStoredStats(stats);
  }, [stats]);

  useEffect(() => {
    capturePendingReferralFromURL();
  }, []);

  useEffect(() => {
    setStats((prev) => applyDailyFreeGrantIfNeeded(prev));
  }, []);

  useEffect(() => {
    ensureAuthenticated().then((user) => {
      const code = deriveReferralCode(user?.uid || '');
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

  // Handlers
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

  // Handlers de Duelo removidos: handleStartDuel, handleFinishDuel

  // Renderização
  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] font-sans antialiased selection:bg-[#adc6ff]/30 selection:text-white">
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

      <main className="pt-20 px-4 sm:px-6 max-w-6xl mx-auto">
        {activeStudyDeck ? (
          <StudySessionView
            deck={activeStudyDeck}
            currentLanguage={currentLanguage}
            onFinishSession={handleFinishStudySession}
            onBack={() => setActiveStudyDeck(null)}
          />
        ) : (
          <Suspense fallback={<TabLoadingFallback />}>
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

            {/* Bloco do Duelo removido */}

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
          </Suspense>
        )}
      </main>

      {!activeStudyDeck && (
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} currentLanguage={currentLanguage} />
      )}

      <Suspense fallback={null}>
        {showOnboarding && (
          <OnboardingModal
            onClose={handleCloseOnboarding}
            onOpenAuth={() => setShowAuthModal(true)}
          />
        )}

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

        {managedDeck && (
          <DeckManagerModal
            deck={managedDeck}
            onSaveDeck={handleSaveDeck}
            onDeleteDeck={handleDeleteDeck}
            onClose={() => setManagedDeck(null)}
          />
        )}

        {showAdMobModal && (
          <AdMobRewardedModal
            stats={stats}
            onRewardEarned={handleRewardEarned}
            onClose={() => setShowAdMobModal(false)}
            currentLanguage={currentLanguage}
          />
        )}

        {showInterstitial && (
          <AdMobInterstitialModal onClose={() => setShowInterstitial(false)} />
        )}

        {showReferralModal && (
          <ReferralModal stats={stats} onClose={() => setShowReferralModal(false)} />
        )}

        {showNotificationsModal && (
          <NotificationSettingsModal onClose={() => setShowNotificationsModal(false)} />
        )}

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

        {showLanguageModal && (
          <LanguageSelectorModal
            currentLanguage={currentLanguage}
            onSelectLanguage={handleSelectLanguage}
            onClose={() => setShowLanguageModal(false)}
          />
        )}
      </Suspense>

      <ConsentBanner />
    </div>
  );
}

export default App;