import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { OnboardingModal } from './components/OnboardingModal';
import { DashboardView } from './components/DashboardView';
import { StudySessionView, SessionSummary } from './components/StudySessionView';
import { countMasteredCards } from './services/srsEngine';
import { AdMobBanner } from './components/AdMobBanner';
import { ImportExportModal } from './components/ImportExportModal';
const ScannerView = lazy(() => import('./components/ScannerView').then((m) => ({ default: m.ScannerView })));
const StudioView = lazy(() => import('./components/StudioView').then((m) => ({ default: m.StudioView })));
const HelpView = lazy(() => import('./components/HelpView').then((m) => ({ default: m.HelpView })));
const StatsView = lazy(() => import('./components/StatsView').then((m) => ({ default: m.StatsView })));
const DeckManagerModal = lazy(() => import('./components/DeckManagerModal').then((m) => ({ default: m.DeckManagerModal })));
const DecksLibraryView = lazy(() => import('./components/DecksLibraryView').then((m) => ({ default: m.DecksLibraryView })));
import { TabLoadingFallback } from './components/TabLoadingFallback';
import { Deck, UserStats, ActiveTab } from './types';
import { getStoredDecks, saveStoredDecks, getStoredStats, saveStoredStats, isOnboardingDone, setOnboardingDone, saveLastStudiedDeck } from './services/storage';
import { syncDecksFromFirestore, saveDeckToFirestore, deleteDeckFromFirestore, syncStatsFromFirestore, saveStatsToFirestore } from './services/firebaseStorage';
const AdMobRewardedModal = lazy(() => import('./components/AdMobRewardedModal').then((m) => ({ default: m.AdMobRewardedModal })));
const AdMobInterstitialModal = lazy(() => import('./components/AdMobInterstitialModal').then((m) => ({ default: m.AdMobInterstitialModal })));
const SubscriptionModal = lazy(() => import('./components/SubscriptionModal').then((m) => ({ default: m.SubscriptionModal })));
const AuthModal = lazy(() => import('./components/AuthModal').then((m) => ({ default: m.AuthModal })));
const ReferralModal = lazy(() => import('./components/ReferralModal').then((m) => ({ default: m.ReferralModal })));
const NotificationSettingsModal = lazy(() => import('./components/NotificationSettingsModal').then((m) => ({ default: m.NotificationSettingsModal })));
const LanguageSelectorModal = lazy(() => import('./components/LanguageSelectorModal').then((m) => ({ default: m.LanguageSelectorModal })));
import { ConsentBanner } from './components/ConsentBanner';
import { SupportedLanguage, translations } from './lib/i18n';
import { auth, onAuthStateChanged, ensureAuthenticated } from './lib/firebase';
import { applyRewardedAdWatched, canWatchRewardedAd, applyDailyFreeGrantIfNeeded, applySpendCredits, canShowInterstitial, applyInterstitialShown } from './services/economy/creditsEngine';
import { deriveReferralCode } from './shared/referralCode';
import { applyStudySessionCompleted } from './services/studyStreak';
import { capturePendingReferralFromURL, ensureOwnReferralCodeRegistered, tryClaimPendingReferral } from './services/referral/referralClient';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
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

  // O produto é exclusivamente pt-BR. Não herdamos o idioma do Android/navegador.
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('pt');

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'light';
    const savedTheme = window.localStorage.getItem('flashmind-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    return 'light';
  });

  const handleSelectLanguage = (_lang: SupportedLanguage) => {
    localStorage.setItem('flashmind_lang', 'pt');
    setCurrentLanguage('pt');
  };

  const [decks, setDecks] = useState<Deck[]>(() => getStoredDecks());
  const [stats, setStats] = useState<UserStats>(() => getStoredStats());
  const [activeStudyDeck, setActiveStudyDeck] = useState<Deck | null>(null);
  const [managedDeck, setManagedDeck] = useState<Deck | null>(null);
  const [deckToPopulate, setDeckToPopulate] = useState<Deck | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('flashmind-theme', theme);
  }, [theme]);

  useEffect(() => { saveStoredDecks(decks); }, [decks]);
