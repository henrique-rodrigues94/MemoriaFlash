import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Target,
  Calendar,
  Clock,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Play,
  Pause,
  Square,
  Sparkles,
  TrendingUp,
  Trophy,
  AlertTriangle,
  Flame,
  Layers,
  Settings,
  BarChart3,
  ListChecks,
  RefreshCw,
} from 'lucide-react';
import { StudyPlan, StudyPlanSubject, StudyPlanSessionSlot, StudyPlanDailyActivity, Deck } from '../types';
import {
  getStoredStudyPlan,
  saveStudyPlan,
  clearStudyPlan,
  createStudyPlan,
  getTodaySessions,
  getSessionsForDate,
  getDueReviews,
  completeSession,
  completeReview,
  scheduleReview,
  computePlanStats,
  computeSubjectPerformance,
  buildRecommendations,
  WEEKDAY_SHORT,
  WEEKDAY_NAMES,
  formatMinutes,
  weekdayOf,
  addDays,
} from '../services/studyPlan';
import { todayKey } from '../services/economy/economyConstants';
import { getDueCardCount, computeDeckMastery } from '../services/srsEngine';

interface StudyPlanViewProps {
  decks: Deck[];
  currentLanguage?: string;
}

type GoalType = 'concurso' | 'faculdade' | 'enem';

const GOAL_OPTIONS: { type: GoalType; label: string; icon: string }[] = [
  { type: 'concurso', label: 'Concurso', icon: '🏛️' },
  { type: 'faculdade', label: 'Faculdade', icon: '🎓' },
  { type: 'enem', label: 'ENEM', icon: '📝' },
];

const TIME_OPTIONS = [15, 30, 45, 60, 120];

type WizardStep = 'goal' | 'time' | 'weekdays' | 'slots' | 'subjects' | 'priority' | 'review';

export const StudyPlanView: React.FC<StudyPlanViewProps> = ({ decks, currentLanguage = 'pt' }) => {
  const [plan, setPlan] = useState<StudyPlan | null>(() => getStoredStudyPlan());
  const [view, setView] = useState<'today' | 'plan' | 'sessions' | 'stats'>('today');

  const updatePlan = (next: StudyPlan) => {
    setPlan(next);
    saveStudyPlan(next);
  };

  // Sem plano? Wizard de criação.
  if (!plan) {
    return <StudyPlanWizard decks={decks} onCreated={(p) => setPlan(p)} />;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Cabeçalho com abas internas */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-extrabold flex items-center gap-2 mr-auto">
          <Brain className="w-5 h-5 text-indigo-500" /> Plano de Estudos
        </h1>
        <TabButton active={view === 'today'} onClick={() => setView('today')} icon={<Flame className="w-4 h-4" />}>Hoje</TabButton>
        <TabButton active={view === 'sessions'} onClick={() => setView('sessions')} icon={<ListChecks className="w-4 h-4" />}>Sessões</TabButton>
        <TabButton active={view === 'stats'} onClick={() => setView('stats')} icon={<BarChart3 className="w-4 h-4" />}>Estatísticas</TabButton>
        <TabButton active={view === 'plan'} onClick={() => setView('plan')} icon={<Settings className="w-4 h-4" />}>Plano</TabButton>
      </div>

      {view === 'today' && <TodayView plan={plan} decks={decks} onUpdate={updatePlan} />}
      {view === 'sessions' && <SessionsView plan={plan} decks={decks} onUpdate={updatePlan} />}
      {view === 'stats' && <StatsView plan={plan} decks={decks} />}
      {view === 'plan' && <PlanSettings plan={plan} decks={decks} onUpdate={updatePlan} />}
    </div>
  );
};

// ─── Botão de aba interno ────────────────────────────────────────────────────

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }> = ({
  active,
  onClick,
  icon,
  children,
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
      active
        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
        : 'bg-[#122131] text-[#8c91a0] hover:text-white border border-[#424754]/30'
    }`}
  >
    {icon} {children}
  </button>
);

// ─── Visão HOJE ──────────────────────────────────────────────────────────────

const TodayView: React.FC<{ plan: StudyPlan; decks: Deck[]; onUpdate: (p: StudyPlan) => void }> = ({ plan, decks, onUpdate }) => {
  const todaySessions = useMemo(() => getTodaySessions(plan), [plan]);
  const dueReviews = useMemo(() => getDueReviews(plan), [plan]);
  const stats = useMemo(() => computePlanStats(plan), [plan]);
  const recs = useMemo(() => buildRecommendations(plan, decks), [plan, decks]);

  const doneCount = todaySessions.filter((s) => s.status === 'done').length;
  const doneMin = todaySessions.filter((s) => s.status === 'done').reduce((s, x) => s + x.spentMin, 0);
  const remainingMin = todaySessions.filter((s) => s.status !== 'done').reduce((s, x) => s + x.plannedMin, 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-5">
      {/* Saudação + progresso do dia */}
      <div className="glass-card rounded-2xl p-5 border border-[#424754]/20 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold">{greeting} 👋</h2>
            <p className="text-xs text-[#8c91a0]">{todaySessions.length} sessão(ões) hoje · {doneCount} concluída(s)</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-indigo-500">{formatMinutes(stats.todayMinutes)}</div>
            <div className="text-[10px] text-[#8c91a0]">de {formatMinutes(plan.dailyTimeMin)}</div>
          </div>
        </div>
        <div className="w-full bg-[#122131] h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, (stats.todayMinutes / (plan.dailyTimeMin || 1)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Sessões de hoje */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-500" /> Hoje — Agenda</h3>
        {todaySessions.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-center text-xs text-[#8c91a0] border border-[#424754]/20">
            Nenhuma sessão agendada para hoje. Ajuste os horários no Plano.
          </div>
        ) : (
          todaySessions.map((s) => {
            const slot = plan.slots.find((sl) => s.id.includes(`session-${sl.id}-`));
            const subj = plan.subjects.find((x) => x.id === s.subjectId);
            return (
              <div key={s.id} className="glass-card rounded-2xl p-4 border border-[#424754]/20 flex items-center gap-3">
                <div className="w-14 text-center">
                  <div className="text-xs font-extrabold text-indigo-500">{slot?.time ?? '--:--'}</div>
                  <div className="text-[10px] text-[#8c91a0]">{formatMinutes(s.plannedMin)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">
                    {s.subjectId === 'review' ? '🔄 Revisão (SRS)' : subj?.name ?? 'Matéria'}
                  </div>
                  <div className="text-[11px] text-[#8c91a0] truncate">{s.objective}</div>
                </div>
                {s.status === 'done' ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> {formatMinutes(s.spentMin)}
                  </span>
                ) : (
                  <button
                    onClick={() => onUpdate(completeSession(plan, s.id, { spentMin: s.plannedMin }))}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold hover:bg-emerald-500/25 transition cursor-pointer"
                  >
                    Concluir
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Revisões do dia */}
      {dueReviews.length > 0 && (
        <div className="glass-card rounded-2xl p-4 border border-amber-500/30 space-y-2">
          <h3 className="text-sm font-bold flex items-center gap-2 text-amber-300"><RefreshCw className="w-4 h-4" /> Revisões pendentes ({dueReviews.length})</h3>
          {dueReviews.map((r) => {
            const subj = plan.subjects.find((x) => x.id === r.subjectId);
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 bg-[#122131] rounded-xl p-3">
                <div className="text-xs font-semibold">{subj?.name ?? 'Revisão'} · {r.cardCount} cards</div>
                <button
                  onClick={() => onUpdate(completeReview(plan, r.id))}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold hover:bg-amber-500/25 transition cursor-pointer"
                >
                  Revisar
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Tempo restante */}
      <div className="glass-card rounded-2xl p-4 border border-[#424754]/20 flex items-center gap-3">
        <Clock className="w-5 h-5 text-indigo-500" />
        <div className="flex-1">
          <div className="text-xs text-[#8c91a0]">Tempo restante hoje</div>
          <div className="text-lg font-extrabold">{formatMinutes(remainingMin)}</div>
        </div>
        <span className="text-[11px] text-[#8c91a0]">{doneCount}/{todaySessions.length} sessões</span>
      </div>

      {/* Recomendações da IA */}
      {recs.length > 0 && (
        <div className="glass-card rounded-2xl p-4 border border-[#adc6ff]/30 space-y-2">
          <h3 className="text-sm font-bold flex items-center gap-2 text-indigo-400"><Sparkles className="w-4 h-4" /> Recomendações</h3>
          {recs.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-[#8c91a0]">
              <span className="text-indigo-400 mt-0.5">•</span>
              <span><strong className="text-white">{r.subjectName}:</strong> {r.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Visão SESSÕES (lista + estudo rápido) ───────────────────────────────────

const SessionsView: React.FC<{ plan: StudyPlan; decks: Deck[]; onUpdate: (p: StudyPlan) => void }> = ({ plan, decks, onUpdate }) => {
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const daySessions = useMemo(() => getSessionsForDate(plan, selectedDate), [plan, selectedDate]);
  const activeSession = plan.sessions.find((s) => s.id === activeSessionId);

  // Botões de navegação de data (7 dias)
  const days = useMemo(() => {
    const start = addDays(todayKey(), -1);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);

  if (activeSession) {
    return (
      <StudyTimer
        session={activeSession}
        plan={plan}
        decks={decks}
        onDone={(data) => {
          onUpdate(completeSession(plan, activeSession.id, data));
          setActiveSessionId(null);
        }}
        onBack={() => setActiveSessionId(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Seletor de dia */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const active = d === selectedDate;
          return (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className={`rounded-xl py-2 text-center transition cursor-pointer border ${
                active
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-[#122131] text-[#8c91a0] border-[#424754]/30 hover:text-white'
              }`}
            >
              <div className="text-[9px] font-bold">{WEEKDAY_SHORT[weekdayOf(d)]}</div>
              <div className="text-sm font-extrabold">{Number(d.slice(8, 10))}</div>
            </button>
          );
        })}
      </div>

      {/* Sessões do dia */}
      <div className="space-y-2">
        {daySessions.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-center text-xs text-[#8c91a0] border border-[#424754]/20">
            Nenhuma sessão neste dia.
          </div>
        ) : (
          daySessions.map((s) => {
            const slot = plan.slots.find((sl) => s.id.includes(`session-${sl.id}-`));
            const subj = plan.subjects.find((x) => x.id === s.subjectId);
            const isDone = s.status === 'done';
            return (
              <div key={s.id} className="glass-card rounded-2xl p-4 border border-[#424754]/20 flex items-center gap-3">
                <div className="w-12 text-center">
                  <div className="text-xs font-extrabold text-indigo-500">{slot?.time ?? '--:--'}</div>
                  <div className="text-[10px] text-[#8c91a0]">{formatMinutes(s.plannedMin)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">
                    {s.subjectId === 'review' ? '🔄 Revisão (SRS)' : subj?.name ?? 'Matéria'}
                  </div>
                  <div className="text-[11px] text-[#8c91a0] truncate">{s.objective}</div>
                </div>
                {isDone ? (
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {s.cardsReviewed} cards
                  </span>
                ) : (
                  <button
                    onClick={() => setActiveSessionId(s.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold hover:bg-indigo-500/25 transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" /> Iniciar
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─── Cronômetro / Sessão de estudo ───────────────────────────────────────────

const StudyTimer: React.FC<{
  session: any;
  plan: StudyPlan;
  decks: Deck[];
  onDone: (data: { spentMin: number; cardsReviewed: number; questionsAnswered: number; notes: string }) => void;
  onBack: () => void;
}> = ({ session, plan, decks, onDone, onBack }) => {
  const subj = plan.subjects.find((x) => x.id === session.subjectId);
  const linkedDeck = decks.find((d) => subj?.deckIds?.includes(d.id)) || decks[0];

  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [pomodoro, setPomodoro] = useState(true);
  const [pomodoroMin, setPomodoroMin] = useState(25);
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [notes, setNotes] = useState('');
  const [showCards, setShowCards] = useState(false);
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const targetSeconds = pomodoro ? pomodoroMin * 60 : session.plannedMin * 60;

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  const remaining = Math.max(0, targetSeconds - seconds);
  const progress = Math.min(100, (seconds / targetSeconds) * 100);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  const dueCards = linkedDeck ? linkedDeck.cards.filter((c) => !c.dueDate || new Date(c.dueDate) <= new Date()) : [];
  const sessionCards = dueCards.length > 0 ? dueCards : linkedDeck?.cards ?? [];

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[#8c91a0] hover:text-white transition cursor-pointer">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>

      {/* Cronômetro */}
      <div className="glass-card rounded-2xl p-6 border border-[#424754]/20 text-center space-y-4">
        <div className="text-xs font-bold text-[#8c91a0] uppercase tracking-wider">
          {session.subjectId === 'review' ? 'Revisão Espaçada (SRS)' : subj?.name ?? 'Estudo'} · {session.objective}
        </div>
        <div className="text-5xl font-extrabold tabular-nums">{mm}:{ss}</div>
        <div className="w-full bg-[#122131] h-3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${pomodoro ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gradient-to-r from-indigo-500 to-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-[#8c91a0]">
            <input type="checkbox" checked={pomodoro} onChange={(e) => setPomodoro(e.target.checked)} className="accent-indigo-500" />
            Pomodoro
          </label>
          {pomodoro && (
            <select
              value={pomodoroMin}
              onChange={(e) => setPomodoroMin(Number(e.target.value))}
              className="bg-[#122131] border border-[#424754]/40 rounded-lg px-2 py-1 text-[11px] text-white"
            >
              {[15, 25, 45, 50].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setRunning(!running)}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition cursor-pointer"
          >
            {running ? <><Pause className="w-4 h-4" /> Pausar</> : <><Play className="w-4 h-4" /> Iniciar</>}
          </button>
          <button
            onClick={() => { setRunning(false); setSeconds(0); }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#122131] text-[#8c91a0] text-sm font-bold border border-[#424754]/40 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Zerar
          </button>
        </div>
      </div>

      {/* Flashcards da sessão */}
      <div className="glass-card rounded-2xl p-4 border border-[#424754]/20 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-500" /> Flashcards</h3>
          <button
            onClick={() => setShowCards(!showCards)}
            className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
          >
            {showCards ? 'Ocultar' : `Ver ${sessionCards.length} cards`}
          </button>
        </div>

        {showCards && sessionCards.length > 0 && (
          <div className="space-y-3">
            <div className="bg-[#122131] border border-[#424754]/40 rounded-2xl p-6 min-h-[120px] flex items-center justify-center cursor-pointer select-none" onClick={() => setFlipped(!flipped)}>
              <div className="text-center">
                {flipped ? (
                  <>
                    <div className="text-[10px] uppercase tracking-wider text-[#8c91a0] mb-2">Resposta</div>
                    <div className="text-sm font-semibold">{sessionCards[cardIdx]?.back}</div>
                  </>
                ) : (
                  <>
                    <div className="text-[10px] uppercase tracking-wider text-[#8c91a0] mb-2">Pergunta {cardIdx + 1}/{sessionCards.length}</div>
                    <div className="text-base font-bold">{sessionCards[cardIdx]?.front}</div>
                  </>
                )}
                <div className="text-[10px] text-[#8c91a0] mt-3">Clique para virar</div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => { setCardIdx(Math.max(0, cardIdx - 1)); setFlipped(false); }}
                disabled={cardIdx === 0}
                className="px-3 py-1.5 rounded-lg bg-[#122131] text-[#8c91a0] text-[11px] font-bold border border-[#424754]/40 disabled:opacity-40 cursor-pointer"
              >
                ← Anterior
              </button>
              <button
                onClick={() => { setCardsReviewed((c) => c + 1); setFlipped(false); if (cardIdx + 1 < sessionCards.length) setCardIdx(cardIdx + 1); }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold hover:bg-emerald-500/25 transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Reviu ({cardsReviewed})
              </button>
              <button
                onClick={() => { setCardIdx(Math.min(sessionCards.length - 1, cardIdx + 1)); setFlipped(false); }}
                disabled={cardIdx >= sessionCards.length - 1}
                className="px-3 py-1.5 rounded-lg bg-[#122131] text-[#8c91a0] text-[11px] font-bold border border-[#424754]/40 disabled:opacity-40 cursor-pointer"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resumo / finalização */}
      <div className="glass-card rounded-2xl p-4 border border-[#424754]/20 space-y-3">
        <h3 className="text-sm font-bold">Resumo da sessão</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-[#122131] rounded-xl p-3">
            <div className="text-lg font-extrabold text-indigo-400">{formatMinutes(Math.round(seconds / 60))}</div>
            <div className="text-[10px] text-[#8c91a0]">Tempo</div>
          </div>
          <div className="bg-[#122131] rounded-xl p-3">
            <div className="text-lg font-extrabold text-emerald-400">{cardsReviewed}</div>
            <div className="text-[10px] text-[#8c91a0]">Cards</div>
          </div>
          <div className="bg-[#122131] rounded-xl p-3">
            <div className="text-lg font-extrabold text-amber-400">{questionsAnswered}</div>
            <div className="text-[10px] text-[#8c91a0]">Questões</div>
          </div>
        </div>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações (opcional)..."
          className="w-full bg-[#122131] border border-[#424754]/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#8c91a0] focus:outline-none focus:border-indigo-500 transition"
        />
        <button
          onClick={() => onDone({ spentMin: Math.max(1, Math.round(seconds / 60)), cardsReviewed, questionsAnswered, notes })}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" /> Concluir Sessão
        </button>
      </div>
    </div>
  );
};

// ─── Estatísticas ────────────────────────────────────────────────────────────

const StatsView: React.FC<{ plan: StudyPlan; decks: Deck[] }> = ({ plan, decks }) => {
  const stats = useMemo(() => computePlanStats(plan), [plan]);
  const performance = useMemo(() => computeSubjectPerformance(plan, decks), [plan, decks]);

  const monthActivity = plan.activity.filter((a) => a.dateKey.slice(0, 7) === todayKey().slice(0, 7));

  return (
    <div className="space-y-5">
      {/* Hoje / Semana / Mês */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Hoje" value={formatMinutes(stats.todayMinutes)} sub={`meta ${formatMinutes(plan.dailyTimeMin)}`} />
        <StatCard label="Semana" value={formatMinutes(stats.weekMinutes)} sub={`${stats.weekSessions} sessões · ${stats.weekReviews} revisões`} />
        <StatCard label="Mês" value={formatMinutes(stats.monthMinutes)} sub={`${stats.monthCards} cards · ${stats.monthQuestions} questões`} />
      </div>

      {/* Calendário do mês */}
      <div className="glass-card rounded-2xl p-4 border border-[#424754]/20 space-y-2">
        <h3 className="text-sm font-bold flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-500" /> Calendário</h3>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#8c91a0] mb-1">
          {WEEKDAY_SHORT.map((d) => <div key={d}>{d}</div>)}
        </div>
        <MonthCalendar activity={plan.activity} />
        <div className="flex items-center gap-4 text-[10px] text-[#8c91a0] pt-1">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Concluído</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Parcial</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Não estudado</span>
        </div>
      </div>

      {/* Desempenho por matéria */}
      <div className="glass-card rounded-2xl p-4 border border-[#424754]/20 space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" /> Desempenho por matéria</h3>
        {plan.subjects.length === 0 ? (
          <div className="text-xs text-[#8c91a0]">Nenhuma matéria configurada.</div>
        ) : (
          plan.subjects.map((subj) => {
            const pct = performance[subj.id] ?? 0;
            const color = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-500';
            return (
              <div key={subj.id} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold">{subj.name}</span>
                  <span className="text-[#8c91a0]">{pct}% dominado</span>
                </div>
                <div className="w-full bg-[#122131] h-2 rounded-full overflow-hidden">
                  <div className={`${color} h-full rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const MonthCalendar: React.FC<{ activity: StudyPlanDailyActivity[] }> = ({ activity }) => {
  const year = Number(todayKey().slice(0, 4));
  const month = Number(todayKey().slice(5, 7));
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

  const statusFor = (key: string) => activity.find((a) => a.dateKey === key)?.status ?? (key < todayKey() ? 'missed' : null);

  return (
    <div className="grid grid-cols-7 gap-1">
      {cells.map((cell, i) => {
        if (!cell) return <div key={i} />;
        const status = statusFor(cell);
        const isToday = cell === todayKey();
        return (
          <div
            key={i}
            className={`h-8 rounded-lg flex items-center justify-center text-[10px] font-bold border ${
              status === 'done'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : status === 'partial'
                  ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                  : status === 'missed'
                    ? 'bg-rose-500/10 text-rose-300/70 border-rose-500/20'
                    : 'bg-[#122131] text-[#8c91a0] border-[#424754]/20'
            } ${isToday ? 'ring-2 ring-indigo-500' : ''}`}
          >
            {Number(cell.slice(8, 10))}
          </div>
        );
      })}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; sub: string }> = ({ label, value, sub }) => (
  <div className="glass-card rounded-2xl p-4 border border-[#424754]/20 text-center">
    <div className="text-[10px] uppercase tracking-wider text-[#8c91a0] font-bold">{label}</div>
    <div className="text-lg font-extrabold mt-1">{value}</div>
    <div className="text-[10px] text-[#8c91a0] mt-1">{sub}</div>
  </div>
);

// ─── Configurações do Plano ──────────────────────────────────────────────────

const PlanSettings: React.FC<{ plan: StudyPlan; decks: Deck[]; onUpdate: (p: StudyPlan) => void }> = ({ plan, decks, onUpdate }) => {
  const [draft, setDraft] = useState<StudyPlan | null>(null);
  const editing = draft ?? plan;

  const setGoal = (g: StudyPlan['goal']) => onUpdate({ ...editing, goal: g });
  const setDailyTime = (dailyTimeMin: number) => onUpdate({ ...editing, dailyTimeMin });
  const toggleWeekday = (wd: number) => {
    const active = editing.activeWeekdays.includes(wd)
      ? editing.activeWeekdays.filter((x) => x !== wd)
      : [...editing.activeWeekdays, wd].sort();
    onUpdate({ ...editing, activeWeekdays: active });
  };
  const addSlot = () => {
    const slot: StudyPlanSessionSlot = { id: `slot-${Date.now()}`, weekday: 1, time: '08:00', durationMin: 60 };
    onUpdate({ ...editing, slots: [...editing.slots, slot] });
  };
  const updateSlot = (id: string, patch: Partial<StudyPlanSessionSlot>) =>
    onUpdate({ ...editing, slots: editing.slots.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const removeSlot = (id: string) => onUpdate({ ...editing, slots: editing.slots.filter((s) => s.id !== id) });

  const addSubject = () => {
    const subj: StudyPlanSubject = { id: `subj-${Date.now()}`, name: '', priority: 50 };
    onUpdate({ ...editing, subjects: [...editing.subjects, subj] });
  };
  const updateSubject = (id: string, patch: Partial<StudyPlanSubject>) =>
    onUpdate({ ...editing, subjects: editing.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const removeSubject = (id: string) => onUpdate({ ...editing, subjects: editing.subjects.filter((s) => s.id !== id) });

  return (
    <div className="space-y-5">
      {/* Objetivo */}
      <div className="glass-card rounded-2xl p-4 border border-[#424754]/20 space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2"><Target className="w-4 h-4 text-indigo-500" /> Objetivo</h3>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[#8c91a0] font-bold">Título</label>
          <input
            value={editing.goal.title}
            onChange={(e) => setGoal({ ...editing.goal, title: e.target.value })}
            placeholder="Ex.: Concurso Polícia Federal — Agente"
            className="w-full bg-[#122131] border border-[#424754]/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#8c91a0] focus:outline-none focus:border-indigo-500 transition mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#8c91a0] font-bold">Detalhes</label>
            <input
              value={editing.goal.details}
              onChange={(e) => setGoal({ ...editing.goal, details: e.target.value })}
              placeholder="Cargo, banca, estado..."
              className="w-full bg-[#122131] border border-[#424754]/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#8c91a0] focus:outline-none focus:border-indigo-500 transition mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#8c91a0] font-bold">Data da prova</label>
            <input
              type="date"
              value={editing.goal.examDate ?? ''}
              onChange={(e) => setGoal({ ...editing.goal, examDate: e.target.value })}
              className="w-full bg-[#122131] border border-[#424754]/40 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition mt-1"
            />
          </div>
        </div>
      </div>

      {/* Tempo diário */}
      <div className="glass-card rounded-2xl p-4 border border-[#424754]/20 space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-500" /> Tempo diário</h3>
        <div className="flex flex-wrap gap-2">
          {TIME_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => setDailyTime(m)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                editing.dailyTimeMin === m
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-[#122131] text-[#8c91a0] border-[#424754]/40 hover:text-white'
              }`}
            >
              {formatMinutes(m)}
            </button>
          ))}
        </div>
      </div>

      {/* Dias da semana */}
      <div className="glass-card rounded-2xl p-4 border border-[#424754]/20 space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-500" /> Dias da semana</h3>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_SHORT.map((d, i) => (
            <button
              key={i}
              onClick={() => toggleWeekday(i)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                editing.activeWeekdays.includes(i)
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-[#122131] text-[#8c91a0] border-[#424754]/40 hover:text-white'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Horários (slots) */}
      <div className="glass-card rounded-2xl p-4 border border-[#424754]/20 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2"><Settings className="w-4 h-4 text-indigo-500" /> Horários de estudo</h3>
          <button onClick={addSlot} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold hover:bg-indigo-500/25 transition cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
        {editing.slots.length === 0 && <div className="text-xs text-[#8c91a0]">Nenhum horário. Adicione sessões de estudo.</div>}
        {editing.slots.map((slot) => (
          <div key={slot.id} className="flex items-center gap-2 bg-[#122131] rounded-xl p-3">
            <select
              value={slot.weekday}
              onChange={(e) => updateSlot(slot.id, { weekday: Number(e.target.value) })}
              className="bg-[#0b1a2a] border border-[#424754]/40 rounded-lg px-2 py-2 text-xs text-white"
            >
              {WEEKDAY_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
            </select>
            <input
              type="time"
              value={slot.time}
              onChange={(e) => updateSlot(slot.id, { time: e.target.value })}
              className="bg-[#0b1a2a] border border-[#424754]/40 rounded-lg px-2 py-2 text-xs text-white"
            />
            <select
              value={slot.durationMin}
              onChange={(e) => updateSlot(slot.id, { durationMin: Number(e.target.value) })}
              className="bg-[#0b1a2a] border border-[#424754]/40 rounded-lg px-2 py-2 text-xs text-white"
            >
              {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{formatMinutes(m)}</option>)}
            </select>
            <button onClick={() => removeSlot(slot.id)} className="ml-auto p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition cursor-pointer">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Matérias e prioridades */}
      <div className="glass-card rounded-2xl p-4 border border-[#424754]/20 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2"><BookOpen className="w-4 h-4 text-indigo-500" /> Matérias & Prioridade</h3>
          <button onClick={addSubject} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold hover:bg-indigo-500/25 transition cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
        {editing.subjects.length === 0 && <div className="text-xs text-[#8c91a0]">Nenhuma matéria. Adicione as matérias do seu plano.</div>}
        {editing.subjects.map((subj) => (
          <div key={subj.id} className="bg-[#122131] rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={subj.name}
                onChange={(e) => updateSubject(subj.id, { name: e.target.value })}
                placeholder="Nome da matéria (ex.: Direito Penal)"
                className="flex-1 bg-[#0b1a2a] border border-[#424754]/40 rounded-lg px-3 py-2 text-sm text-white placeholder-[#8c91a0] focus:outline-none focus:border-indigo-500 transition"
              />
              <button onClick={() => removeSubject(subj.id)} className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition cursor-pointer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={subj.priority}
                onChange={(e) => updateSubject(subj.id, { priority: Number(e.target.value) })}
                className="flex-1 accent-indigo-500"
              />
              <span className="text-xs font-bold text-indigo-400 w-10 text-right">{subj.priority}%</span>
            </div>
            <select
              value={subj.deckIds?.[0] ?? ''}
              onChange={(e) => updateSubject(subj.id, { deckIds: e.target.value ? [e.target.value] : [] })}
              className="w-full bg-[#0b1a2a] border border-[#424754]/40 rounded-lg px-3 py-2 text-xs text-white"
            >
              <option value="">— Vincular deck (opcional) —</option>
              {decks.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Reset */}
      <button
        onClick={() => { if (confirm('Apagar o plano de estudos atual?')) { clearStudyPlan(); window.location.reload(); } }}
        className="w-full py-3 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/30 text-sm font-bold hover:bg-rose-500/20 transition cursor-pointer"
      >
        Apagar Plano de Estudos
      </button>
    </div>
  );
};

// ─── Wizard de criação ───────────────────────────────────────────────────────

const StudyPlanWizard: React.FC<{ decks: Deck[]; onCreated: (p: StudyPlan) => void }> = ({ decks, onCreated }) => {
  const [step, setStep] = useState<WizardStep>('goal');
  const [goalType, setGoalType] = useState<GoalType>('concurso');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDetails, setGoalDetails] = useState('');
  const [examDate, setExamDate] = useState('');
  const [dailyTime, setDailyTime] = useState(60);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [slots, setSlots] = useState<StudyPlanSessionSlot[]>([{ id: 'slot-1', weekday: 1, time: '08:00', durationMin: 60 }]);
  const [subjects, setSubjects] = useState<StudyPlanSubject[]>([]);
  const [subjectName, setSubjectName] = useState('');

  const GOAL_LABEL = GOAL_OPTIONS.find((g) => g.type === goalType)?.label ?? '';

  const addSlot = () => setSlots([...slots, { id: `slot-${Date.now()}`, weekday: 1, time: '08:00', durationMin: 60 }]);
  const updateSlot = (id: string, patch: Partial<StudyPlanSessionSlot>) =>
    setSlots(slots.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSlot = (id: string) => setSlots(slots.filter((s) => s.id !== id));

  const addSubject = () => {
    if (!subjectName.trim()) return;
    setSubjects([...subjects, { id: `subj-${Date.now()}`, name: subjectName.trim(), priority: 50 }]);
    setSubjectName('');
  };
  const setSubjectPriority = (id: string, priority: number) =>
    setSubjects(subjects.map((s) => (s.id === id ? { ...s, priority } : s)));
  const removeSubject = (id: string) => setSubjects(subjects.filter((s) => s.id !== id));

  const canNext =
    (step === 'goal' && goalTitle.trim().length > 0) ||
    step === 'time' ||
    step === 'weekdays' ||
    (step === 'slots' && slots.length > 0) ||
    (step === 'subjects' && subjects.length > 0) ||
    step === 'priority' ||
    step === 'review';

  const next = () => {
    if (step === 'goal') setStep('time');
    else if (step === 'time') setStep('weekdays');
    else if (step === 'weekdays') setStep('slots');
    else if (step === 'slots') setStep('subjects');
    else if (step === 'subjects') setStep('priority');
    else if (step === 'priority') setStep('review');
    else if (step === 'review') finish();
  };

  const back = () => {
    if (step === 'time') setStep('goal');
    else if (step === 'weekdays') setStep('time');
    else if (step === 'slots') setStep('weekdays');
    else if (step === 'subjects') setStep('slots');
    else if (step === 'priority') setStep('subjects');
    else if (step === 'review') setStep('priority');
  };

  const finish = () => {
    const plan = createStudyPlan({
      goal: { type: goalType, title: goalTitle.trim(), details: goalDetails.trim(), examDate: examDate || undefined },
      dailyTimeMin: dailyTime,
      activeWeekdays: weekdays,
      slots,
      subjects,
    });
    onCreated(plan);
    saveStudyPlan(plan);
  };

  const stepTitles: Record<WizardStep, string> = {
    goal: '1. Objetivo',
    time: '2. Tempo disponível',
    weekdays: '3. Dias da semana',
    slots: '4. Horários',
    subjects: '5. Matérias',
    priority: '6. Prioridade',
    review: 'Revisão',
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 text-2xl font-extrabold">
          <Brain className="w-6 h-6 text-indigo-500" /> Plano de Estudos
        </div>
        <p className="text-xs text-[#8c91a0]">Monte sua rotina inteligente em 6 passos.</p>
      </div>

      {/* Progresso */}
      <div className="flex items-center justify-center gap-1.5">
        {(Object.keys(stepTitles) as WizardStep[]).map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all ${step === s ? 'w-8 bg-indigo-500' : 'w-4 bg-[#424754]/40'}`}
          />
        ))}
      </div>

      <div className="glass-card rounded-2xl p-6 border border-[#424754]/20">
        <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4">{stepTitles[step]}</div>

        {/* Passo 1: Objetivo */}
        {step === 'goal' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g.type}
                  onClick={() => { setGoalType(g.type); setGoalTitle(g.label); }}
                  className={`p-3 rounded-xl text-center transition cursor-pointer border ${
                    goalType === g.type ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-[#122131] text-[#8c91a0] border-[#424754]/40 hover:text-white'
                  }`}
                >
                  <div className="text-xl">{g.icon}</div>
                  <div className="text-[11px] font-bold mt-1">{g.label}</div>
                </button>
              ))}
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#8c91a0] font-bold">Título do objetivo</label>
              <input
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder={goalType === 'concurso' ? 'Ex.: Concurso PF — Agente' : goalType === 'enem' ? 'ENEM 2026' : `Meu objetivo ${GOAL_LABEL}`}
                className="w-full bg-[#122131] border border-[#424754]/40 rounded-xl px-4 py-3 text-sm text-white placeholder-[#8c91a0] focus:outline-none focus:border-indigo-500 transition mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#8c91a0] font-bold">Detalhes (cargo, banca...)</label>
                <input
                  value={goalDetails}
                  onChange={(e) => setGoalDetails(e.target.value)}
                  placeholder="Opcional"
                  className="w-full bg-[#122131] border border-[#424754]/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#8c91a0] focus:outline-none focus:border-indigo-500 transition mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#8c91a0] font-bold">Data da prova</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full bg-[#122131] border border-[#424754]/40 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Passo 2: Tempo */}
        {step === 'time' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {TIME_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setDailyTime(m)}
                  className={`p-4 rounded-xl text-center transition cursor-pointer border ${
                    dailyTime === m ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-[#122131] text-[#8c91a0] border-[#424754]/40 hover:text-white'
                  }`}
                >
                  <div className="text-lg font-extrabold">{formatMinutes(m)}</div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#8c91a0]">Quanto tempo você pode estudar por dia? A IA distribui esse tempo entre as matérias.</p>
          </div>
        )}

        {/* Passo 3: Dias */}
        {step === 'weekdays' && (
          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAY_SHORT.map((d, i) => {
                const active = weekdays.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => setWeekdays(active ? weekdays.filter((x) => x !== i) : [...weekdays, i].sort())}
                    className={`p-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      active ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-[#122131] text-[#8c91a0] border-[#424754]/40 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[#8c91a0]">Selecione os dias em que você pretende estudar.</p>
          </div>
        )}

        {/* Passo 4: Horários */}
        {step === 'slots' && (
          <div className="space-y-3">
            {slots.map((slot) => (
              <div key={slot.id} className="flex items-center gap-2 bg-[#122131] rounded-xl p-3">
                <select
                  value={slot.weekday}
                  onChange={(e) => updateSlot(slot.id, { weekday: Number(e.target.value) })}
                  className="bg-[#0b1a2a] border border-[#424754]/40 rounded-lg px-2 py-2 text-xs text-white"
                >
                  {WEEKDAY_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
                </select>
                <input
                  type="time"
                  value={slot.time}
                  onChange={(e) => updateSlot(slot.id, { time: e.target.value })}
                  className="bg-[#0b1a2a] border border-[#424754]/40 rounded-lg px-2 py-2 text-xs text-white"
                />
                <select
                  value={slot.durationMin}
                  onChange={(e) => updateSlot(slot.id, { durationMin: Number(e.target.value) })}
                  className="bg-[#0b1a2a] border border-[#424754]/40 rounded-lg px-2 py-2 text-xs text-white"
                >
                  {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{formatMinutes(m)}</option>)}
                </select>
                <button onClick={() => removeSlot(slot.id)} className="ml-auto p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button onClick={addSlot} className="w-full py-2.5 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-xs font-bold hover:bg-indigo-500/20 transition cursor-pointer flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" /> Adicionar horário
            </button>
          </div>
        )}

        {/* Passo 5: Matérias */}
        {step === 'subjects' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSubject()}
                placeholder="Digite a matéria e pressione Enter (ex.: Direito Penal)"
                className="flex-1 bg-[#122131] border border-[#424754]/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#8c91a0] focus:outline-none focus:border-indigo-500 transition"
              />
              <button onClick={addSubject} className="px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition cursor-pointer">
                Adicionar
              </button>
            </div>
            {subjects.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <span key={s.id} className="flex items-center gap-2 bg-[#122131] border border-[#424754]/40 rounded-lg px-3 py-1.5 text-xs font-semibold">
                    {s.name}
                    <button onClick={() => removeSubject(s.id)} className="text-rose-400 hover:text-rose-300 transition cursor-pointer">✕</button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-[11px] text-[#8c91a0]">Quais matérias você precisa estudar para atingir seu objetivo?</p>
          </div>
        )}

        {/* Passo 6: Prioridade */}
        {step === 'priority' && (
          <div className="space-y-3">
            {subjects.length === 0 ? (
              <div className="text-xs text-[#8c91a0]">Adicione matérias no passo anterior.</div>
            ) : (
              subjects.map((s) => (
                <div key={s.id} className="bg-[#122131] rounded-xl p-3">
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span>{s.name}</span>
                    <span className="text-indigo-400">{s.priority}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={s.priority}
                    onChange={(e) => setSubjectPriority(s.id, Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              ))
            )}
            <p className="text-[11px] text-[#8c91a0]">Defina o peso de cada matéria. A IA prioriza as de maior peso ao montar o cronograma.</p>
          </div>
        )}

        {/* Passo 7: Revisão */}
        {step === 'review' && (
          <div className="space-y-3">
            <ReviewRow label="Objetivo" value={goalTitle || GOAL_LABEL} />
            <ReviewRow label="Tempo/dia" value={formatMinutes(dailyTime)} />
            <ReviewRow label="Dias" value={weekdays.map((d) => WEEKDAY_SHORT[d]).join(', ')} />
            <ReviewRow label="Horários" value={`${slots.length} sessão(ões)`} />
            <ReviewRow label="Matérias" value={subjects.map((s) => `${s.name} (${s.priority}%)`).join(', ') || '—'} />
            <p className="text-[11px] text-[#8c91a0] pt-1">O cronograma será montado automaticamente distribuindo o tempo pelas matérias.</p>
          </div>
        )}
      </div>

      {/* Navegação */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={back}
          disabled={step === 'goal'}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#122131] text-[#8c91a0] text-sm font-bold border border-[#424754]/40 hover:text-white transition disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <button
          onClick={next}
          disabled={!canNext}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-40 cursor-pointer"
        >
          {step === 'review' ? 'Criar Plano' : 'Continuar'} <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const ReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 text-sm">
    <span className="text-[#8c91a0]">{label}</span>
    <span className="font-bold text-right">{value}</span>
  </div>
);
