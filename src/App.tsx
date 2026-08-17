import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { OnboardingModal } from './components/OnboardingModal';
import { DashboardView } from './components/DashboardView';
import { StudySessionView, SessionSummary } from './components/StudySessionView';
import { countMasteredCards } from './services/srsEngine';
import { AdMobBanner } from './components/AdMobBanner';
import { ImportExportModal } from './components/ImportExportModal';

// ----------------------------------------------------------------------------
// Code-splitting: telas/modais que não são necessários no primeiro carregamento
// (abas que não são "home", ou modais abertos sob demanda) viram chunks
// separados via React.lazy — isso reduz o bundle inicial (o build acusava
// >1MB num único arquivo). DashboardView/StudySessionView ficam eager porque
// aparecem imediatamente na tela inicial.
// ----------------------------------------------------------------------------
const ScannerView = lazy(() => import('./components/ScannerView').then((m) => ({ default: m.ScannerView })));
const StudioView = lazy(() => import('./components/StudioView').then((m) => ({ default: m.StudioView })));
const CurriculumPlannerView = lazy(() => import('./components/CurriculumPlannerView').then((m) => ({ default: m.CurriculumPlannerView })));
const HelpView = lazy(() => import('./components/HelpView').then((m) => ({ default: m.HelpView })));
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
import { detectBrowserLanguage, SupportedLanguage, translations } from './lib/i18n';
import { auth, onAuthStateChanged, ensureAuthenticated } from './lib/firebase';
import {
  applyRewardedAdWatched,
  canWatchRewardedAd,
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
  const [rewardToast, setRewardToast] = useState<{ credits: number; visible: boolean }>({ credits: 0, visible: false });
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showAdvancedCardGenerator, setShowAdvancedCardGenerator] = useState(false);

  // Auto-detected or saved language
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(detectBrowserLanguage());
  // Tema claro é o padrão. Se o usuário já escolheu um tema antes, respeita a escolha.
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'light';
    const savedTheme = window.localStorage.getItem('flashmind-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    return 'light';
  });

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    setCurrentLanguage(lang);
  };

  // Storage states
  const [decks, setDecks] = useState<Deck[]>(() => getStoredDecks());
  const [stats, setStats] = useState<UserStats>(() => getStoredStats());

  // Active Session / Modal States
  const [activeStudyDeck, setActiveStudyDeck] = useState<Deck | null>(null);
  const [managedDeck, setManagedDeck] = useState<Deck | null>(null);
  // Deck cujos campos devem ser pré-preenchidos no gerador da aba Cards
  const [deckToPopulate, setDeckToPopulate] = useState<Deck | null>(null);

  // Todos os modais/overlays HTML da tela. O banner nativo do AdMob é uma
  // View Android desenhada por cima do WebView (CSS não a afeta), então
  // precisa ser escondido explicitamente sempre que qualquer um destes
  // estiver aberto — senão o anúncio fica visualmente grudado sobre o modal.
  const anyModalOpen =
    showAdMobModal ||
    showInterstitial ||
    showSubscriptionModal ||
    showAuthModal ||
    showReferralModal ||
    showImportExportModal ||
    showNotificationsModal ||
    showLanguageModal ||
    showAdvancedCardGenerator ||
    Boolean(managedDeck);

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
    let receivedFirstDecksSnapshot = false;

    syncDecksFromFirestore((remoteDecks) => {
      if (!receivedFirstDecksSnapshot) {
        receivedFirstDecksSnapshot = true;
        if (remoteDecks.length === 0) {
          const localDecks = getStoredDecks();
          if (localDecks.length > 0) {
            localDecks.forEach((d) => saveDeckToFirestore(d));
            return;
          }
        }
      }
      setDecks(remoteDecks);
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

  const handleRewardEarned = (creditsEarned?: number) => {
    if (!canWatchRewardedAd(stats)) return;
    const { updated, creditsEarned: earned } = applyRewardedAdWatched(stats);
    setStats(updated);
    saveStoredStats(updated);
    saveStatsToFirestore(updated);
    const amount = creditsEarned ?? earned;
    setRewardToast({ credits: amount, visible: true });
    setTimeout(() => setRewardToast((prev) => ({ ...prev, visible: false })), 3000);
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

  const handleFinishStudySession = (
    updatedDeck: Deck,
    cardsReviewedCount: number,
    summary: SessionSummary
  ) => {
    const updatedDecks = decks.map((d) => (d.id === updatedDeck.id ? updatedDeck : d));
    setDecks(updatedDecks);
    saveDeckToFirestore(updatedDeck);

    const xpEarned = cardsReviewedCount * 25;

    const streakUpdatedStats = applyStudySessionCompleted(stats, cardsReviewedCount, {
      hardCount: summary.hardCount,
      correctCount: summary.correctCount,
      xpEarned,
      minutesStudied: summary.minutesStudied,
    });
    const newStats: UserStats = {
      ...streakUpdatedStats,
      totalCardsMastered: countMasteredCards(updatedDecks),
      xp: stats.xp + xpEarned,
    };
    setStats(newStats);
    saveStatsToFirestore(newStats);
    setActiveStudyDeck(null);
    setActiveTab('home');
    maybeShowInterstitial(newStats);
  };

  const handleSaveDeck = (updatedDeck: Deck) => {
    setDecks((currentDecks) => {
      const exists = currentDecks.some((d) => d.id === updatedDeck.id);
      return exists
        ? currentDecks.map((d) => (d.id === updatedDeck.id ? updatedDeck : d))
        : [updatedDeck, ...currentDecks];
    });
    void saveDeckToFirestore(updatedDeck);
  };

  const handleSaveStudyProgress = (updatedDeck: Deck) => {
    setDecks((currentDecks) => {
      const exists = currentDecks.some((d) => d.id === updatedDeck.id);
      return exists
        ? currentDecks.map((d) => (d.id === updatedDeck.id ? updatedDeck : d))
        : [updatedDeck, ...currentDecks];
    });
    void saveDeckToFirestore(updatedDeck);
  };

  const handleDeleteDeck = (deckId: string) => {
    setDecks((currentDecks) => currentDecks.filter((d) => d.id !== deckId));
    void deleteDeckFromFirestore(deckId);
  };

  const isLightTheme = theme === 'light';

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors duration-300 ${isLightTheme ? 'bg-[#EEF0F8] text-[#1A1F36]' : 'bg-[#051424] text-[#d4e4fa]'} ${isLightTheme ? 'selection:bg-[#4F6EF7]/20 selection:text-[#1A1F36]' : 'selection:bg-[#adc6ff]/30 selection:text-white'}`}>
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

      <main className={`${activeStudyDeck ? '' : 'pt-20 px-4 sm:px-6 max-w-6xl mx-auto pb-24 sm:pb-28'}`}>
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
                  onOpenQuickCreate={() => { setShowAdvancedCardGenerator(false); setActiveTab('cards'); }}
                  onOpenAdMob={() => setShowAdMobModal(true)}
                  onOpenSubscription={() => setShowSubscriptionModal(true)}
                  onOpenReferral={() => setShowReferralModal(true)}
                  onOpenImportExport={() => setShowImportExportModal(true)}
                />
              )}

              {activeTab === 'explore' && (
                <DecksLibraryView
                  decks={decks}
                  currentLanguage={currentLanguage}
                  setActiveTab={setActiveTab}
                  onStartStudySession={handleStartStudySession}
                  onManageDeck={(deck) => setManagedDeck(deck)}
                  onOpenQuickCreate={() => { setShowAdvancedCardGenerator(false); setActiveTab('cards'); }}
                />
              )}

              {activeTab === 'quiz' && (
                <HelpView currentLanguage={currentLanguage} />
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
                showAdvancedCardGenerator ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedCardGenerator(false)}
                      className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm hover:bg-slate-50"
                    >
                      ← Voltar ao planejamento por matéria
                    </button>
                    <StudioView
                      decks={decks}
                      stats={stats}
                      currentLanguage={currentLanguage}
                      initialDeck={deckToPopulate}
                      onConsumedInitialDeck={() => setDeckToPopulate(null)}
                      onSaveNewDeck={handleSaveDeck}
                      onDeductCredit={handleDeductCredit}
                      onOpenAdMob={() => setShowAdMobModal(true)}
                      onOpenSubscription={() => setShowSubscriptionModal(true)}
                    />
                  </div>
                ) : (
                  <CurriculumPlannerView
                    decks={decks}
                    stats={stats}
                    onSaveNewDeck={handleSaveDeck}
                    onOpenSubscription={() => setShowSubscriptionModal(true)}
                    onOpenAdvanced={() => setShowAdvancedCardGenerator(true)}
                  />
                )
              )}

              {activeTab === 'stats' && <StatsView stats={stats} decks={decks} />}

              <AdMobBanner
                stats={stats}
                isPro={stats.isPro}
                currentLanguage={currentLanguage}
                sticky
                hidden={anyModalOpen}
                onOpenAdMob={() => setShowAdMobModal(true)}
                onOpenSubscription={() => setShowSubscriptionModal(true)}
                onOpenReferral={() => setShowReferralModal(true)}
              />
            </>
          </Suspense>
        )}
      </main>

      {!activeStudyDeck && (
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} currentLanguage={currentLanguage} />
      )}

      {showOnboarding && (
        <OnboardingModal
          onClose={handleCloseOnboarding}
          onOpenAuth={() => setShowAuthModal(true)}
        />
      )}

      <Suspense fallback={null}>
        {managedDeck && (
          <DeckManagerModal
            deck={managedDeck}
            onSaveDeck={handleSaveDeck}
            onDeleteDeck={handleDeleteDeck}
            onClose={() => setManagedDeck(null)}
            onOpenCards={() => {
              setManagedDeck(null);
              setDeckToPopulate(managedDeck);
              setShowAdvancedCardGenerator(false);
              setActiveTab('cards');
            }}
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
          <AdMobInterstitialModal
            onClose={() => setShowInterstitial(false)}
            currentLanguage={currentLanguage}
          />
        )}

        {rewardToast.visible && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-fade-in">
            <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-bold shadow-xl shadow-emerald-500/30 border border-emerald-400/40">
              <span className="text-lg">🎉</span>
              {(translations[currentLanguage] || translations.pt).adRewardToast.replace('{credits}', String(rewardToast.credits))}
            </div>
          </div>
        )}

        {showReferralModal && <ReferralModal stats={stats} onClose={() => setShowReferralModal(false)} />}

        {showImportExportModal && (
          <ImportExportModal
            decks={decks}
            onSaveDeck={handleSaveDeck}
            onClose={() => setShowImportExportModal(false)}
          />
        )}

        {showNotificationsModal && <NotificationSettingsModal onClose={() => setShowNotificationsModal(false)} />}

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
