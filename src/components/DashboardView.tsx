import React from 'react';
import {
  Flame,
  Brain,
  TrendingUp,
  Clock,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { Deck, UserStats, ActiveTab } from '../types';
import { getDueCardCount } from '../services/srsEngine';
import { DeckCard } from './DeckCard';
import { AdMobBanner } from './AdMobBanner';
import { SupportedLanguage, translations } from '../lib/i18n';

interface DashboardViewProps {
  stats: UserStats;
  decks: Deck[];
  currentLanguage: SupportedLanguage;
  onOpenLanguageSelector: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  onStartStudySession: (deck: Deck) => void;
  onManageDeck: (deck: Deck) => void;
  onOpenQuickCreate: () => void;
  onOpenAdMob: () => void;
  onOpenSubscription: () => void;
  onOpenReferral?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  decks,
  currentLanguage,
  setActiveTab,
  onStartStudySession,
  onManageDeck,
  onOpenAdMob,
  onOpenSubscription,
  onOpenReferral,
}) => {
  const t = translations[currentLanguage] || translations.pt;

  const goalProgress = Math.min(
    100,
    Math.round((stats.dailyGoalCompleted / stats.dailyGoalTotal) * 100)
  );

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">

      {/* ── Meta diária compacta ── */}
      <section className="glass-card rounded-3xl p-5 sm:p-6 relative overflow-hidden border border-[#adc6ff]/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#3b82f6]/15 via-[#60a5fa]/8 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          {/* Streak + saudação */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/20 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
              {stats.streakDays} {stats.streakDays === 1 ? 'dia de ofensiva' : 'dias de ofensiva'}
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white">
              Olá, {stats.name}! 👋
            </h1>
          </div>

          {/* Goal ring compacto */}
          <div className="flex items-center gap-4 bg-[#0b1a2a]/80 px-4 py-3 rounded-2xl border border-[#424754]/30 self-start sm:self-auto">
            <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" className="text-slate-800" fill="transparent" />
                <circle
                  cx="24" cy="24" r="20"
                  stroke="currentColor" strokeWidth="4"
                  className="text-[#60a5fa] transition-all duration-1000 ease-out"
                  fill="transparent"
                  strokeDasharray="126"
                  strokeDashoffset={126 - (126 * goalProgress) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[10px] font-extrabold text-white">{goalProgress}%</span>
            </div>
            <div>
              <div className="text-[10px] font-medium text-[#8c91a0] uppercase tracking-wider">Meta Diária</div>
              <div className="text-sm font-extrabold text-white">
                {stats.dailyGoalCompleted}
                <span className="text-[11px] font-normal text-[#8c91a0]"> / {stats.dailyGoalTotal} cards</span>
              </div>
              <div className="text-[10px] text-[#60a5fa] font-medium flex items-center gap-1 mt-0.5">
                <Zap className="w-3 h-3" /> +150 XP hoje
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Decks de Estudo ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#adc6ff]" />
            <h2 className="text-lg font-extrabold text-white tracking-tight">Seus Decks de Estudo</h2>
          </div>
          <button
            onClick={() => setActiveTab('explore')}
            className="text-xs text-[#60a5fa] hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {decks.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center border border-[#424754]/20">
            <p className="text-sm text-[#8c91a0]">Você ainda não tem decks. Crie o primeiro na aba <strong className="text-white">Baralhos</strong>.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {decks.slice(0, 4).map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onManageDeck={onManageDeck}
                onStartStudySession={onStartStudySession}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Banner AdMob (só usuários free) ── */}
      <AdMobBanner
        stats={stats}
        onOpenAdMob={onOpenAdMob}
        onOpenSubscription={onOpenSubscription}
        onOpenReferral={onOpenReferral}
        isPro={stats.isPro}
        currentLanguage={currentLanguage}
      />

      {/* ── Rodapé: tendência SRS ── */}
      <section className="glass-card rounded-2xl p-5 border border-[#adc6ff]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[#8c91a0]">Tendência de Memorização</div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              +15% Maior Retenção de Longo Prazo
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                SRS SM-2
              </span>
            </div>
          </div>
        </div>
        <div className="text-xs text-[#8c91a0] flex items-center gap-2 bg-[#0b1a2a] px-3 py-2 rounded-xl border border-[#424754]/30">
          <Clock className="w-4 h-4 text-[#60a5fa]" />
          <span>Próxima revisão ideal em ~24 horas</span>
        </div>
      </section>
    </div>
  );
};
