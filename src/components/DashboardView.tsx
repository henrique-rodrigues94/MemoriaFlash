import React from 'react';
import {
  Flame,
  Brain,
  Sparkles,
  Play,
  TrendingUp,
  BookOpen,
  Plus,
  Zap,
  RotateCcw,
  Clock,
  ChevronRight,
  BarChart2,
  Swords,
  Mic,
  School,
} from 'lucide-react';
import { Deck, UserStats, ActiveTab } from '../types';
import { getDueCardCount, computeDeckMastery } from '../services/srsEngine';
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
  onOpenLanguageSelector,
  setActiveTab,
  onStartStudySession,
  onManageDeck,
  onOpenQuickCreate,
  onOpenAdMob,
  onOpenSubscription,
  onOpenReferral,
}) => {
  const t = translations[currentLanguage] || translations.pt;

  const totalDueCards = decks.reduce((sum, d) => sum + getDueCardCount(d.cards), 0);
  const goalProgress = Math.min(
    100,
    Math.round((stats.dailyGoalCompleted / stats.dailyGoalTotal) * 100)
  );

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Top Banner & Daily Goal Ring */}
      <section className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-[#adc6ff]/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#3b82f6]/20 via-[#60a5fa]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffb786]/10 text-[#ffb786] border border-[#ffb786]/20 text-xs font-semibold">
                <Flame className="w-4 h-4 text-orange-400 fill-orange-400 animate-pulse" />
                <span>{stats.streakDays} DIAS DE OFENSIVA</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t.welcome}, {stats.name}! 👋
            </h1>
            <p className="text-sm text-[#8c91a0] max-w-md">
              {t.welcomeSub}
            </p>
          </div>

          {/* Goal Progress Ring Widget */}
          <div className="flex items-center gap-5 bg-[#0b1a2a]/80 p-4 rounded-2xl border border-[#424754]/30 shadow-inner">
            <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-slate-800"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-[#60a5fa] transition-all duration-1000 ease-out"
                  fill="transparent"
                  strokeDasharray="163"
                  strokeDashoffset={163 - (163 * goalProgress) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-extrabold text-white">
                  {goalProgress}%
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-[#8c91a0] uppercase tracking-wider">
                Meta Diária
              </div>
              <div className="text-lg font-extrabold text-white">
                {stats.dailyGoalCompleted}{' '}
                <span className="text-xs font-normal text-[#8c91a0]">
                  / {stats.dailyGoalTotal} cards
                </span>
              </div>
              <div className="text-[11px] text-[#60a5fa] font-medium mt-0.5 flex items-center gap-1">
                <Zap className="w-3 h-3" /> +150 XP hoje
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick AI Trigger Banner */}
      <section className="bg-gradient-to-r from-[#122238] via-[#1a2e48] to-[#122238] rounded-2xl p-5 border border-[#60a5fa]/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#3b82f6]/20 border border-[#3b82f6]/40 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Sparkles className="w-6 h-6 text-[#60a5fa] animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Gerar Decks com Inteligência Artificial
            </h3>
            <p className="text-xs text-[#8c91a0] mt-0.5">
              Transforme artigos, PDFs, links do YouTube ou textos em flashcards de alta qualidade.
            </p>
          </div>
        </div>

        <button
          id="btn-quick-ai-create"
          onClick={onOpenQuickCreate}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Criar com IA
        </button>
      </section>

      {/* Quick Actions Shortcuts Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          id="quick-act-create-manual"
          onClick={() => setActiveTab('create')}
          className="p-3.5 rounded-2xl bg-[#0b1a2a]/70 hover:bg-[#122131] border border-[#424754]/30 flex items-center gap-3 transition-all cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-[#3b82f6]/10 text-[#60a5fa] group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-white">Novo Deck</div>
            <div className="text-[10px] text-[#8c91a0]">Criar com IA ou manual</div>
          </div>
        </button>

        <button
          id="quick-act-teacher"
          onClick={() => setActiveTab('teacher')}
          className="p-3.5 rounded-2xl bg-[#0b1a2a]/70 hover:bg-[#122131] border border-[#424754]/30 flex items-center gap-3 transition-all cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-[#D8EFEF]/10 text-[#D8EFEF] group-hover:scale-110 transition-transform">
            <School className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-white">Turmas</div>
            <div className="text-[10px] text-[#8c91a0]">Área do Professor</div>
          </div>
        </button>

        <button
          id="quick-act-stats"
          onClick={() => setActiveTab('stats')}
          className="p-3.5 rounded-2xl bg-[#0b1a2a]/70 hover:bg-[#122131] border border-[#424754]/30 flex items-center gap-3 transition-all cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-[#3f465c]/30 text-[#adc6ff] group-hover:scale-110 transition-transform">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-white">Desempenho</div>
            <div className="text-[10px] text-[#8c91a0]">Análise de Memória</div>
          </div>
        </button>

        <button
          id="quick-act-explore"
          onClick={() => setActiveTab('explore')}
          className="p-3.5 rounded-2xl bg-[#0b1a2a]/70 hover:bg-[#122131] border border-[#424754]/30 flex items-center gap-3 transition-all cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-white">Minha Coleção</div>
            <div className="text-[10px] text-[#8c91a0]">Gerenciar dezenas de decks</div>
          </div>
        </button>
      </div>

      {/* Decks Collection Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#adc6ff]" />
            <h2 className="text-lg font-extrabold text-white tracking-tight">
              Seus Decks de Estudo
            </h2>
          </div>
          <button
            id="view-all-decks-btn"
            onClick={() => setActiveTab('explore')}
            className="text-xs text-[#60a5fa] hover:underline flex items-center gap-1 font-medium"
          >
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decks.map((deck) => {
            const dueCount = getDueCardCount(deck.cards);
            const mastery = computeDeckMastery(deck.cards);

            return (
              <div
                key={deck.id}
                className="glass-card rounded-2xl p-5 border border-[#424754]/20 hover:border-[#adc6ff]/40 transition-all flex flex-col justify-between group shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-end gap-3 mb-2">
                    {dueCount > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-extrabold animate-pulse">
                        {dueCount} Pendentes
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                        Em Dia
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => onManageDeck(deck)}
                    className="text-base font-bold text-white group-hover:text-[#adc6ff] transition-colors cursor-pointer"
                  >
                    {deck.title}
                  </h3>

                </div>

                <div className="mt-5 pt-4 border-t border-[#424754]/20 space-y-3">
                  {/* Mastery Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] text-[#8c91a0] mb-1 font-medium">
                      <span>{deck.cards.length} cartões no total</span>
                      <span className="text-[#adc6ff] font-bold">
                        {mastery}% Dominado
                      </span>
                    </div>
                    <div className="w-full bg-[#122131] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] h-full rounded-full transition-all duration-700"
                        style={{ width: `${mastery}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      id={`btn-edit-deck-${deck.id}`}
                      onClick={() => onManageDeck(deck)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#c2c6d6] hover:bg-[#122131] hover:text-white transition-colors"
                    >
                      Editar Cards
                    </button>

                    <button
                      id={`btn-study-deck-${deck.id}`}
                      onClick={() => onStartStudySession(deck)}
                      className="px-4 py-2 rounded-xl bg-[#4d8eff] hover:bg-[#3b82f6] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#4d8eff]/20 transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Estudar Agora
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* AdMob Banner for Free Users */}
      <AdMobBanner
        stats={stats}
        onOpenAdMob={onOpenAdMob}
        onOpenSubscription={onOpenSubscription}
        onOpenReferral={onOpenReferral}
        isPro={stats.isPro}
        currentLanguage={currentLanguage}
      />

      {/* Memory Trend & SRS Tips Footer Card */}
      <section className="glass-card rounded-2xl p-5 border border-[#adc6ff]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-[#8c91a0]">Tendência de Memorização</div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              +15% Maior Retenção de Longo Prazo
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                SRS SM-2 Ativo
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
