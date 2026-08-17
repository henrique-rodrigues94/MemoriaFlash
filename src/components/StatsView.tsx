import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Brain,
  Award,
  Zap,
  Calendar,
  BarChart2,
  CheckCircle2,
  Clock,
  Target,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { UserStats, Deck, DailyActivity } from '../types';
import { getDueCardCount, computeDeckMastery } from '../services/srsEngine';

interface StatsViewProps {
  stats: UserStats;
  decks: Deck[];
}

/** Retorna a chave YYYY-MM-DD de N dias atrás (fuso local). */
function dateKeyDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('sv-SE');
}

/** Soma cardsReviewed dos últimos N dias com base no activityLog. */
function sumActivity(log: DailyActivity[], days: number): number {
  const cutoff = dateKeyDaysAgo(days - 1);
  return log.filter((d) => d.dateKey >= cutoff).reduce((s, d) => s + d.cardsReviewed, 0);
}

export const StatsView: React.FC<StatsViewProps> = ({ stats, decks }) => {
  const totalCardsAllDecks = decks.reduce((sum, d) => sum + d.cards.length, 0);
  const activityLog: DailyActivity[] = stats.activityLog || [];

  // Heatmap: últimos 28 dias (do mais antigo para o mais recente)
  const heatmapDays = Array.from({ length: 28 }, (_, i) => {
    const daysAgo = 27 - i;
    const key = dateKeyDaysAgo(daysAgo);
    const entry = activityLog.find((d) => d.dateKey === key);
    return { key, count: entry?.cardsReviewed || 0, daysAgo };
  });

  const maxHeatmapCount = Math.max(1, ...heatmapDays.map((d) => d.count));

  // Previsão SM-2 real: cumulativa — "cards due dentro de N dias" (padrão de
  // qualquer app de SRS). ANTES: comparava apenas a data EXATA de vencimento,
  // então um card vencendo em 2 dias nunca aparecia nem em "Amanhã" (1d) nem
  // em "3 dias" — ficava invisível em todos os buckets. Agora cada bucket é
  // cumulativo (inclui tudo que já está vencido/vence até aquele prazo).
  const now = new Date();
  function endOfDayInNDays(days: number): Date {
    const target = new Date(now);
    target.setDate(target.getDate() + days);
    target.setHours(23, 59, 59, 999);
    return target;
  }
  function dueByCutoff(cutoff: Date): number {
    return decks
      .flatMap((d) => d.cards)
      .filter((c) => !!c.dueDate && new Date(c.dueDate) <= cutoff).length;
  }

  const dueToday = decks.reduce((s, d) => s + getDueCardCount(d.cards), 0);
  const dueTomorrow = dueByCutoff(endOfDayInNDays(1));
  const dueIn3Days = dueByCutoff(endOfDayInNDays(3));
  const dueIn7Days = dueByCutoff(endOfDayInNDays(7));

  const bestStreak = Math.max(stats.bestStreakDays || 0, stats.streakDays);
  const uniqueCategories = new Set(decks.map((d) => d.category)).size;

  // ── Comparativo semanal: esta semana vs a semana anterior ────────────────
  const cardsThisWeek = sumActivity(activityLog, 7);
  const cardsLastWeek = (() => {
    const from = dateKeyDaysAgo(13);
    const to = dateKeyDaysAgo(7);
    return activityLog
      .filter((d) => d.dateKey >= from && d.dateKey < to)
      .reduce((s, d) => s + d.cardsReviewed, 0);
  })();
  const weeklyTrendPct =
    cardsLastWeek > 0
      ? Math.round(((cardsThisWeek - cardsLastWeek) / cardsLastWeek) * 100)
      : cardsThisWeek > 0
      ? 100
      : 0;

  // ── Dívida de revisão: cartões vencidos há mais de 3 dias ────────────────
  // Sinal de "acúmulo perigoso" — diferente de "due hoje" (esperado), isso
  // aponta cartões que estão sendo ignorados e correndo risco real de
  // esquecimento (curva de Ebbinghaus).
  const overdueThreshold = new Date(now);
  overdueThreshold.setDate(overdueThreshold.getDate() - 3);
  const reviewDebtCount = decks
    .flatMap((d) => d.cards)
    .filter((c) => !!c.dueDate && new Date(c.dueDate) < overdueThreshold).length;

  // ── Progresso da meta diária ──────────────────────────────────────────────
  const dailyGoalPct = stats.dailyGoalTotal > 0
    ? Math.min(100, Math.round((stats.dailyGoalCompleted / stats.dailyGoalTotal) * 100))
    : 0;

  // ── Distribuição de dificuldade dos cartões (tag definida na criação) ────
  const difficultyOrder: NonNullable<Deck['cards'][number]['difficulty']>[] = ['easy', 'medium', 'hard', 'expert'];
  const difficultyLabels: Record<string, string> = {
    easy: 'Fácil', medium: 'Médio', hard: 'Difícil', expert: 'Avançado',
  };
  const difficultyColors: Record<string, string> = {
    easy: 'bg-emerald-500', medium: 'bg-[#3b82f6]', hard: 'bg-amber-500', expert: 'bg-rose-500',
  };
  const allCards = decks.flatMap((d) => d.cards);
  const difficultyCounts = difficultyOrder.map((diff) => ({
    diff,
    count: allCards.filter((c) => (c.difficulty || 'medium') === diff).length,
  }));

  // ── Progresso por baralho, ordenado por urgência (mais vencidos primeiro) ─
  const deckProgress = [...decks]
    .map((d) => ({
      deck: d,
      mastery: computeDeckMastery(d.cards),
      due: getDueCardCount(d.cards),
    }))
    .sort((a, b) => b.due - a.due || a.mastery - b.mastery)
    .slice(0, 6);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-fade-in">
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[#adc6ff]/20 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#424754]/30 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/20 text-xs font-mono font-bold mb-2">
              <TrendingUp className="w-3.5 h-3.5" /> ESTATÍSTICAS DE RETENÇÃO SRS
            </div>
            <h2 className="text-2xl font-extrabold text-white">Desempenho & Curva do Esquecimento</h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-3 rounded-2xl bg-[#0b1a2a] border border-[#424754]/30 text-center">
              <div className="text-[10px] text-[#8c91a0] uppercase font-mono">Retenção Média</div>
              <div className="text-xl font-extrabold text-emerald-400">{stats.retentionRate}%</div>
            </div>
            <div className="p-3 rounded-2xl bg-[#0b1a2a] border border-[#424754]/30 text-center">
              <div className="text-[10px] text-[#8c91a0] uppercase font-mono">Horas Estudadas</div>
              <div className="text-xl font-extrabold text-[#60a5fa]">{stats.timeStudiedHours}h</div>
            </div>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#0b1a2a] border border-[#424754]/30 space-y-1">
            <div className="text-[10px] font-mono text-[#8c91a0] uppercase">Cards Dominados</div>
            <div className="text-2xl font-extrabold text-white">{stats.totalCardsMastered}</div>
            <div className="text-[10px] text-emerald-400 font-medium">De {totalCardsAllDecks} no total</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0b1a2a] border border-[#424754]/30 space-y-1">
            <div className="text-[10px] font-mono text-[#8c91a0] uppercase">Ofensiva Atual</div>
            <div className="text-2xl font-extrabold text-[#ffb786]">{stats.streakDays} Dias</div>
            <div className="text-[10px] text-[#ffb786] font-medium">
              Recorde: {bestStreak}d
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0b1a2a] border border-[#424754]/30 space-y-1">
            <div className="text-[10px] font-mono text-[#8c91a0] uppercase">Decks Ativos</div>
            <div className="text-2xl font-extrabold text-[#adc6ff]">{decks.length}</div>
            <div className="text-[10px] text-[#adc6ff] font-medium">
              {uniqueCategories} {uniqueCategories === 1 ? 'categoria' : 'categorias'}
            </div>
          </div>
        </div>

        {/* Meta Diária, Ritmo Semanal & Dívida de Revisão */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Meta diária */}
          <div className="p-4 rounded-2xl bg-[#0b1a2a] border border-[#424754]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#8c91a0] uppercase flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#60a5fa]" /> Meta Diária
              </span>
              <span className="text-xs font-bold text-white">
                {stats.dailyGoalCompleted}/{stats.dailyGoalTotal}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#051424] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${dailyGoalPct >= 100 ? 'bg-emerald-400' : 'bg-[#3b82f6]'}`}
                style={{ width: `${dailyGoalPct}%` }}
              />
            </div>
            <div className="text-[10px] text-[#8c91a0]">
              {dailyGoalPct >= 100 ? 'Meta batida hoje! 🎉' : `${dailyGoalPct}% concluída hoje`}
            </div>
          </div>

          {/* Ritmo semanal */}
          <div className="p-4 rounded-2xl bg-[#0b1a2a] border border-[#424754]/30 space-y-1">
            <span className="text-[10px] font-mono text-[#8c91a0] uppercase">Ritmo Semanal</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-white">{cardsThisWeek}</span>
              {cardsLastWeek > 0 && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-bold ${
                    weeklyTrendPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {weeklyTrendPct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {Math.abs(weeklyTrendPct)}%
                </span>
              )}
            </div>
            <div className="text-[10px] text-[#8c91a0]">
              vs. {cardsLastWeek} cartões na semana anterior
            </div>
          </div>

          {/* Dívida de revisão */}
          <div
            className={`p-4 rounded-2xl border space-y-1 ${
              reviewDebtCount > 0
                ? 'bg-rose-500/10 border-rose-500/30'
                : 'bg-[#0b1a2a] border-[#424754]/30'
            }`}
          >
            <span className="text-[10px] font-mono text-[#8c91a0] uppercase flex items-center gap-1.5">
              <AlertTriangle className={`w-3.5 h-3.5 ${reviewDebtCount > 0 ? 'text-rose-400' : 'text-[#8c91a0]'}`} />
              Dívida de Revisão
            </span>
            <div className={`text-2xl font-extrabold ${reviewDebtCount > 0 ? 'text-rose-400' : 'text-white'}`}>
              {reviewDebtCount}
            </div>
            <div className="text-[10px] text-[#8c91a0]">
              {reviewDebtCount > 0
                ? 'cartões vencidos há mais de 3 dias — risco de esquecimento'
                : 'nenhum atraso significativo'}
            </div>
          </div>
        </div>

        {/* Heatmap Grid Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#60a5fa]" /> Matriz de Consistência de Estudos (Últimos 28 Dias)
            </h3>
            <span className="text-xs text-[#8c91a0]">
              {sumActivity(activityLog, 28)} cartões revisados
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0b1a2a] border border-[#424754]/30 overflow-x-auto">
            <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 min-w-[280px]">
              {heatmapDays.map((d, i) => {
                const ratio = d.count / maxHeatmapCount;
                const label = d.count > 0 ? d.count : '';
                const colorClass =
                  d.count === 0
                    ? 'bg-slate-800/40 text-slate-600'
                    : ratio > 0.66
                    ? 'bg-[#3b82f6] text-white shadow-md shadow-blue-500/20'
                    : ratio > 0.33
                    ? 'bg-[#3b82f6]/60 text-slate-100'
                    : 'bg-[#3b82f6]/30 text-slate-300';

                // Formata tooltip com data legível
                const dateObj = new Date();
                dateObj.setDate(dateObj.getDate() - d.daysAgo);
                const tooltip = `${dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}: ${d.count} cartões`;

                return (
                  <div
                    key={i}
                    title={tooltip}
                    className={`h-8 rounded-lg transition-all hover:scale-110 flex items-center justify-center text-[10px] font-mono font-bold cursor-pointer ${colorClass}`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center text-[10px] text-[#8c91a0] mt-3 pt-2 border-t border-[#424754]/20 font-mono">
              <span>Menos ativo</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-slate-800/40" />
                <div className="w-3 h-3 rounded bg-[#3b82f6]/30" />
                <div className="w-3 h-3 rounded bg-[#3b82f6]/60" />
                <div className="w-3 h-3 rounded bg-[#3b82f6]" />
              </div>
              <span>Mais ativo</span>
            </div>
          </div>
        </div>

        {/* Schedule Forecast Section — dados reais do SM-2 */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#adc6ff]" /> Previsão do Algoritmo SM-2 para Próximas Revisões
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Hoje', count: dueToday, color: 'border-amber-500/40 text-amber-300' },
              { label: 'Até amanhã', count: dueTomorrow, color: 'border-blue-500/40 text-[#60a5fa]' },
              { label: 'Até 3 dias', count: dueIn3Days, color: 'border-indigo-500/40 text-indigo-300' },
              { label: 'Até 7 dias', count: dueIn7Days, color: 'border-emerald-500/40 text-emerald-300' },
            ].map((f, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-xl bg-[#0b1a2a] border ${f.color} flex flex-col justify-between space-y-1`}
              >
                <span className="text-[10px] font-mono text-[#8c91a0] uppercase">{f.label}</span>
                <span className={`text-base font-extrabold ${f.color.split(' ')[1]}`}>
                  {f.count} {f.count === 1 ? 'card' : 'cards'}
                </span>
              </div>
            ))}
          </div>

          {dueToday === 0 && totalCardsAllDecks > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Nenhum cartão vencido hoje — você está em dia com suas revisões! 🎉
            </div>
          )}
          {totalCardsAllDecks === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#0b1a2a] border border-slate-700/40 text-xs text-slate-400">
              <BarChart2 className="w-4 h-4 flex-shrink-0" />
              Crie seu primeiro baralho para começar a ver sua previsão de revisões aqui.
            </div>
          )}
        </div>

        {/* Progresso por Baralho — ordenado por urgência (mais vencidos primeiro) */}
        {deckProgress.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-[#60a5fa]" /> Progresso por Baralho
            </h3>
            <div className="space-y-2">
              {deckProgress.map(({ deck, mastery, due }) => (
                <div
                  key={deck.id}
                  className="p-3.5 rounded-xl bg-[#0b1a2a] border border-[#424754]/30 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white truncate">{deck.title}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {due > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-mono font-bold">
                          {due} {due === 1 ? 'card vencido' : 'cards vencidos'}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-[#8c91a0]">{mastery}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#051424] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#3b82f6] to-emerald-400 transition-all"
                      style={{ width: `${mastery}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Distribuição de Dificuldade dos Cartões */}
        {allCards.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#adc6ff]" /> Distribuição de Dificuldade
            </h3>
            <div className="p-4 rounded-2xl bg-[#0b1a2a] border border-[#424754]/30 space-y-3">
              <div className="flex h-3 rounded-full overflow-hidden bg-[#051424]">
                {difficultyCounts.map(({ diff, count }) =>
                  count > 0 ? (
                    <div
                      key={diff}
                      className={difficultyColors[diff]}
                      style={{ width: `${(count / allCards.length) * 100}%` }}
                      title={`${difficultyLabels[diff]}: ${count} cartões`}
                    />
                  ) : null
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {difficultyCounts.map(({ diff, count }) => (
                  <div key={diff} className="flex items-center gap-1.5 text-[11px]">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${difficultyColors[diff]}`} />
                    <span className="text-[#8c91a0]">{difficultyLabels[diff]}</span>
                    <span className="text-white font-bold ml-auto">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Resumo de atividade recente */}
        {activityLog.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-[#424754]/20">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#adc6ff]" /> Atividade Recente
            </h3>
            <div className="space-y-2">
              {[...activityLog]
                .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
                .slice(0, 5)
                .map((entry) => {
                  const dateObj = new Date(entry.dateKey + 'T12:00:00');
                  const label = dateObj.toLocaleDateString('pt-BR', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                  });
                  return (
                    <div
                      key={entry.dateKey}
                      className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#0b1a2a] border border-[#424754]/30 text-xs"
                    >
                      <span className="text-[#8c91a0] capitalize">{label}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-white font-bold">
                          {entry.cardsReviewed} cartões
                        </span>
                        <span className="text-[#8c91a0]">{entry.minutesStudied} min</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {activityLog.length === 0 && (
          <div className="text-center py-8 text-[#8c91a0] text-xs space-y-2">
            <Brain className="w-8 h-8 mx-auto text-[#424754]" />
            <p>Conclua sua primeira sessão de estudos para ver as estatísticas aqui.</p>
          </div>
        )}
      </div>
    </div>
  );
};
