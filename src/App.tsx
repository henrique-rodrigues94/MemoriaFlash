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
const ScannerView = lazy(() => import('./components/ScannerView').then((m) => ({ default: m.ScannerView })));
const StudioView = lazy(() => import('./components/StudioView').then((m) => ({ default: m.StudioView })));
const QuizView = lazy(() => import('./components/QuizView').then((m) => ({ default: m.QuizView })));
const StatsView = lazy(() => import('./components/StatsView').then((m) => ({ default: m.StatsView })));
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
  ActiveTab,
} from './types';

import {
  getStoredDecks,
  saveStoredDecks,
  getStoredStats,
  saveStoredStats,
  isOnboardingDone,
  setOnboardingDone,
  saveLastStudiedDeck,
} from './services/storage';

import {
  syncDecksFromFirestore,
  saveDeckToFirestore,
  deleteDeckFromFirestore,
  syncStatsFromFirestore,
  saveStatsToFirestore,
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
  // Onboarding desativado — o app abre direto na home (sem intro guiada).
  // Intro guiada — mostra apenas na primeira vez (e via botão no header).
  const [showOnboarding, setShowOnboarding] = useState(!isOnboardingDone());
  const [showAdMobModal, setShowAdMobModal] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Auto-detected or saved language
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(detectBrowserLanguage());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const savedTheme = window.localStorage.getItem('flashmind-theme');
    return savedTheme === 'light' ? 'light' : 'dark';
  });

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    setCurrentLanguage(lang);
  };

  // Storage states
  const [decks, setDecks] = useState<Deck[]>(getStoredDecks());
  const [stats, setStats] = useState<UserStats>(getStoredStats());


  // Active Session / Modal States
  const [activeStudyDeck, setActiveStudyDeck] = useState<Deck | null>(null);
  const [managedDeck, setManagedDeck] = useState<Deck | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('flashmind-theme', theme);
  }, [theme]);

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

    return () => {
      if (unsubDecks) unsubDecks();
      if (unsubStats) unsubStats();
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
    saveLastStudiedDeck(deck.id);
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

  // Salva o progresso do estudo automaticamente a cada card (mantém a sessão aberta)
  const handleSaveStudyProgress = (updatedDeck: Deck) => {
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



  const isLightTheme = theme === 'light';

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors duration-300 ${isLightTheme ? 'bg-[#EEF0F8] text-[#1A1F36]' : 'bg-[#051424] text-[#d4e4fa]'} ${isLightTheme ? 'selection:bg-[#4F6EF7]/20 selection:text-[#1A1F36]' : 'selection:bg-[#adc6ff]/30 selection:text-white'}`}>
      {/* App Header — oculto durante a sessão de estudo (tela cheia) */}
      {!activeStudyDeck && (
        <Header
          stats={stats}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentLanguage={currentLanguage}
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          onOpenLanguageSelector={() => setShowLanguageModal(true)}
          onShowOnboarding={() => setShowOnboarding(true)}
          onOpenSubscription={() => setShowSubscriptionModal(true)}
          onOpenAdMob={() => setShowAdMobModal(true)}
          onOpenAuth={() => setShowAuthModal(true)}
          onOpenReferral={() => setShowReferralModal(true)}
          onOpenNotifications={() => setShowNotificationsModal(true)}
        />
      )}

      {/* Main Content Viewport */}
      <main className={`${activeStudyDeck ? '' : 'pt-20 px-4 sm:px-6 max-w-6xl mx-auto pb-24 sm:pb-28'}`}>
        {/* If Active Study Session */}
        {activeStudyDeck ? (
          <StudySessionView
            deck={activeStudyDeck}
            currentLanguage={currentLanguage}
            onFinishSession={handleFinishStudySession}
            onSaveProgress={handleSaveStudyProgress}
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
                onOpenQuickCreate={() => setActiveTab('cards')}
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
                onOpenQuickCreate={() => setActiveTab('cards')}
              />
            )}

            {activeTab === 'quiz' && (
              <QuizView
                currentLanguage={currentLanguage}
                stats={stats}
                onDeductCredit={handleDeductCredit}
                onOpenAdMob={() => setShowAdMobModal(true)}
                onOpenSubscription={() => setShowSubscriptionModal(true)}
              />
            )}

            {activeTab === 'scanner' && (
              <ScannerView
                onSaveNewDeck={handleSaveDeck}
                stats={stats}
                onDeductCredit={handleDeductCredit}
                onOpenAdMob={() => setShowAdMobModal(true)}
                onOpenSubscription={() => setShowSubscriptionModal(true)}
              />
            )}

            {activeTab === 'cards' && (
              <StudioView
                decks={decks}
                stats={stats}
                currentLanguage={currentLanguage}
                onSaveNewDeck={handleSaveDeck}
                onDeductCredit={handleDeductCredit}
                onOpenAdMob={() => setShowAdMobModal(true)}
                onOpenSubscription={() => setShowSubscriptionModal(true)}
              />
            )}

            {activeTab === 'stats' && <StatsView stats={stats} decks={decks} />}

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

        {/* AdMob Interstitial (frequency-capped, shown after study sessions) */}
        {showInterstitial && <AdMobInterstitialModal onClose={() => setShowInterstitial(false)} />}

        {/* Referral / Indique e Ganhe Modal */}
        {showReferralModal && <ReferralModal stats={stats} onClose={() => setShowReferralModal(false)} />}

        {/* Lembretes de Revisão (Push Notifications) Modal */}
        {showNotificationsModal && <NotificationSettingsModal onClose={() => setShowNotificationsModal(false)} />}

        {/* Subscription Plans Modal */}
        {showSubscriptionModal && (
          <SubscriptionModal
            stats={stats}
            theme={theme}
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
