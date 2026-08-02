import React from 'react';
import { Sparkles, Crown, Gift, Bell, Sun, Moon } from 'lucide-react';
import { UserStats, ActiveTab } from '../types';
import { auth } from '../lib/firebase';
import { SupportedLanguage, SUPPORTED_LANGUAGES } from '../lib/i18n';

interface HeaderProps {
  stats: UserStats;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentLanguage: SupportedLanguage;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenLanguageSelector: () => void;
  onShowOnboarding: () => void;
  onOpenSubscription: () => void;
  onOpenAdMob: () => void;
  onOpenAuth: () => void;
  onOpenReferral?: () => void;
  onOpenNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  activeTab,
  setActiveTab,
  currentLanguage,
  theme,
  onToggleTheme,
  onOpenLanguageSelector,
  onShowOnboarding,
  onOpenSubscription,
  onOpenAdMob,
  onOpenAuth,
  onOpenReferral,
  onOpenNotifications,
}) => {
  const currentUser = auth.currentUser;
  const isGoogleLoggedIn = currentUser && !currentUser.isAnonymous && currentUser.email;

  const activeLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];
  const isLightTheme = theme === 'light';

  return (
    <header className={`fixed top-0 left-0 w-full h-16 backdrop-blur-md z-40 border-b flex items-center justify-between px-3 sm:px-6 transition-colors duration-300 ${isLightTheme ? 'bg-white/90 border-slate-200 text-slate-900 shadow-sm' : 'bg-[#051424]/90 border-[#424754]/20 text-[#d4e4fa]'}`}>
      {/* Left: Avatar & Logo */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          id="header-profile-btn"
          onClick={onOpenAuth}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-[#adc6ff]/30 hover:border-[#adc6ff] transition-all cursor-pointer flex-shrink-0 relative group"
          title={isGoogleLoggedIn ? `Conta: ${currentUser.email}` : 'Entrar com o Google'}
        >
          <img
            src={currentUser?.photoURL || stats.avatar}
            alt={stats.name}
            className="w-full h-full object-cover"
          />
          {isGoogleLoggedIn && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border border-[#051424]" />
          )}
        </button>

        <div
          onClick={() => setActiveTab('home')}
          className="cursor-pointer flex items-center gap-1.5 group"
        >
          <span className={`font-bold text-lg sm:text-xl tracking-tight transition-colors ${isLightTheme ? 'text-[#1d4ed8] group-hover:text-[#2563eb]' : 'text-[#adc6ff] group-hover:text-white'}`}>
            MemoriaFlash
          </span>
        </div>

        {/* AI Credits / PRO Badge */}
        {stats.isPro ? (
          <button
            onClick={onOpenSubscription}
            className={`px-2.5 py-1 rounded-full border text-[11px] font-mono font-extrabold flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform ${isLightTheme ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/40'}`}
            title={stats.proPlanType === 'monthly' ? 'Sua conta é PRO — Plano Mensal' : stats.proPlanType === 'annual' ? 'Sua conta é PRO — Plano Anual' : 'Sua conta é PRO Ilimitada'}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            {stats.proPlanType === 'monthly' ? 'Plano Mensal' : stats.proPlanType === 'annual' ? 'Plano Anual' : 'PRO'}
          </button>
        ) : (
          <button
            onClick={onOpenSubscription}
            className={`px-2.5 py-1 rounded-full border text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm ${isLightTheme ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900' : 'bg-[#0b1a2a] hover:bg-[#122131] border-[#adc6ff]/20 text-[#adc6ff] hover:text-white'}`}
            title="Clique para obter mais créditos ou assinar PRO"
          >
            <Sparkles className="w-3 h-3 text-[#60a5fa]" />
            <span>{stats.aiCredits || 0} Créditos</span>
            <span className="text-[10px] bg-[#3b82f6]/20 text-[#60a5fa] px-1.5 py-0.2 rounded font-extrabold">
              +
            </span>
          </button>
        )}
      </div>

      {/* Right Actions: Google Login, Professor & Settings */}
      <div className="flex items-center gap-2">
        {!isGoogleLoggedIn && (
          <button
            onClick={onOpenAuth}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
            title="Entrar com sua Conta do Google"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="hidden xs:inline">Entrar</span>
          </button>
        )}

        <button
          onClick={onToggleTheme}
          className={`p-2 rounded-full transition-colors cursor-pointer ${isLightTheme ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
          title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Lembretes de Revisão (Push Notifications) */}
        {onOpenNotifications && (
          <button
            onClick={onOpenNotifications}
            className="p-2 rounded-full text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-colors cursor-pointer"
            title="Lembretes de revisão"
          >
            <Bell className="w-5 h-5" />
          </button>
        )}

        {/* Referral / Indique e Ganhe */}
        {onOpenReferral && (
          <button
            onClick={onOpenReferral}
            className="p-2 rounded-full text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors cursor-pointer"
            title="Indique amigos e ganhe créditos de IA"
          >
            <Gift className="w-5 h-5" />
          </button>
        )}

        {/* Language Flag Selector */}
        <button
          onClick={onOpenLanguageSelector}
          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105 ${isLightTheme ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800' : 'bg-[#122131] hover:bg-[#1c2b3c] border-[#adc6ff]/20 text-white'}`}
          title={`Idioma atual: ${activeLangObj.nativeName}. Clique para mudar.`}
        >
          <span className="text-base leading-none">{activeLangObj.flag}</span>
          <span className="font-mono text-[11px] text-[#adc6ff] uppercase">{activeLangObj.code}</span>
        </button>



      </div>
    </header>
  );
};


