// src/components/Header.tsx
import React from 'react';
import { UserStats, ActiveTab, SupportedLanguage } from '../types';
import { Sparkles, Settings, User, Gift, Bell, Globe } from 'lucide-react';

interface HeaderProps {
  stats: UserStats;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentLanguage: SupportedLanguage;
  onOpenLanguageSelector: () => void;
  onOpenVoiceSettings: () => void;
  onShowOnboarding: () => void;
  onOpenSubscription: () => void;
  onOpenAdMob: () => void;
  onOpenAuth: () => void;
  onOpenReferral: () => void;
  onOpenNotifications: () => void;
}

export function Header({
  stats,
  activeTab,
  setActiveTab,
  currentLanguage,
  onOpenLanguageSelector,
  onOpenVoiceSettings,
  onShowOnboarding,
  onOpenSubscription,
  onOpenAdMob,
  onOpenAuth,
  onOpenReferral,
  onOpenNotifications,
}: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-[#051424]/95 backdrop-blur-sm border-b border-[#1a2d44] px-4 py-3 z-50 flex items-center justify-between">
      {/* Logo e título */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#adc6ff] to-[#6a8fc0] flex items-center justify-center">
          <span className="text-[#051424] font-bold text-sm">FM</span>
        </div>
        <h1 className="text-lg font-semibold text-[#d4e4fa] hidden sm:block">
          FlashMind AI
        </h1>
      </div>

      {/* Ações do header (direita) */}
      <div className="flex items-center gap-2">
        {/* Créditos */}
        <div className="flex items-center gap-1 bg-[#0a1a2e] px-3 py-1.5 rounded-full border border-[#1a2d44]">
          <Sparkles size={16} className="text-[#fbbf24]" />
          <span className="text-sm font-medium text-[#d4e4fa]">
            {stats.aiCredits || 0}
          </span>
        </div>

        {/* Indicador de PRO */}
        {stats.isPro && (
          <span className="text-xs bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-[#051424] font-bold px-2 py-0.5 rounded-full">
            PRO
          </span>
        )}

        {/* Botões de ação */}
        <button
          onClick={onOpenLanguageSelector}
          className="p-2 rounded-lg hover:bg-[#0a1a2e] transition-colors"
          title="Idioma"
        >
          <Globe size={20} className="text-[#8aa4c8]" />
        </button>

        <button
          onClick={onOpenNotifications}
          className="p-2 rounded-lg hover:bg-[#0a1a2e] transition-colors relative"
          title="Notificações"
        >
          <Bell size={20} className="text-[#8aa4c8]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <button
          onClick={onOpenAuth}
          className="p-2 rounded-lg hover:bg-[#0a1a2e] transition-colors"
          title="Conta"
        >
          <User size={20} className="text-[#8aa4c8]" />
        </button>

        <button
          onClick={onOpenSubscription}
          className="p-2 rounded-lg hover:bg-[#0a1a2e] transition-colors"
          title="Assinar PRO"
        >
          <Gift size={20} className="text-[#fbbf24]" />
        </button>
      </div>
    </header>
  );
}