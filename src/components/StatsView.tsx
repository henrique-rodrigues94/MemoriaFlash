import React from 'react';
import {
  TrendingUp,
  Brain,
  Award,
  Zap,
  Calendar,
  BarChart2,
  PieChart,
  CheckCircle2,
} from 'lucide-react';
import { UserStats, Deck } from '../types';

interface StatsViewProps {
  stats: UserStats;
  decks: Deck[];
}

export const StatsView: React.FC<StatsViewProps> = ({ stats, decks }) => {
  const totalCardsAllDecks = decks.reduce((sum, d) => sum + d.cards.length, 0);

  // Generate 28-day heatmap squares
  const heatmapDays = Array.from({ length: 28 }, (_, i) => {
    const intensity = Math.floor(Math.sin(i * 0.4) * 3) + 2;
    return { day: i + 1, count: Math.max(0, intensity * 5) };
  });

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

        {/* 4 Summary Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#0b1a2a] border border-[#424754]/30 space-y-1">
            <div className="text-[10px] font-mono text-[#8c91a0] uppercase">Cards Dominados</div>
            <div className="text-2xl font-extrabold text-white">{stats.totalCardsMastered}</div>
            <div className="text-[10px] text-emerald-400 font-medium">De {totalCardsAllDecks} no total</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0b1a2a] border border-[#424754]/30 space-y-1">
            <div className="text-[10px] font-mono text-[#8c91a0] uppercase">Ofensiva Atual</div>
            <div className="text-2xl font-extrabold text-[#ffb786]">{stats.streakDays} Dias</div>
            <div className="text-[10px] text-[#ffb786] font-medium">Recorde pessoal: 14d</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0b1a2a] border border-[#424754]/30 space-y-1">
            <div className="text-[10px] font-mono text-[#8c91a0] uppercase">Total de XP</div>
            <div className="text-2xl font-extrabold text-[#60a5fa]">{stats.xp}</div>
            <div className="text-[10px] text-[#60a5fa] font-medium">+1,200 XP esta semana</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0b1a2a] border border-[#424754]/30 space-y-1">
            <div className="text-[10px] font-mono text-[#8c91a0] uppercase">Decks Ativos</div>
            <div className="text-2xl font-extrabold text-[#adc6ff]">{decks.length}</div>
            <div className="text-[10px] text-[#adc6ff] font-medium">5 categorias</div>
          </div>
        </div>

        {/* Heatmap Grid Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#60a5fa]" /> Matriz de Consistência de Estudos (Últimos 28 Dias)
            </h3>
            <span className="text-xs text-[#8c91a0]">Meta cumprida diariamente</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0b1a2a] border border-[#424754]/30 overflow-x-auto">
            <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 min-w-[280px]">
              {heatmapDays.map((d, i) => (
                <div
                  key={i}
                  title={`Dia ${d.day}: ${d.count} cartões revisados`}
                  className={`h-8 rounded-lg transition-all hover:scale-110 flex items-center justify-center text-[10px] font-mono font-bold cursor-pointer ${
                    d.count > 12
                      ? 'bg-[#3b82f6] text-white shadow-md shadow-blue-500/20'
                      : d.count > 6
                      ? 'bg-[#3b82f6]/60 text-slate-100'
                      : d.count > 0
                      ? 'bg-[#3b82f6]/30 text-slate-300'
                      : 'bg-slate-800/40 text-slate-600'
                  }`}
                >
                  {d.count > 0 ? d.count : ''}
                </div>
              ))}
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

        {/* Schedule Forecast Section */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#adc6ff]" /> Previsão do Algoritmo SM-2 para Próximas Revisões
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Hoje', count: '14 cards', color: 'border-amber-500/40 text-amber-300' },
              { label: 'Amanhã', count: '8 cards', color: 'border-blue-500/40 text-[#60a5fa]' },
              { label: 'Em 3 dias', count: '22 cards', color: 'border-indigo-500/40 text-indigo-300' },
              { label: 'Em 7 dias', count: '45 cards', color: 'border-emerald-500/40 text-emerald-300' },
            ].map((f, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-xl bg-[#0b1a2a] border ${f.color} flex flex-col justify-between space-y-1`}
              >
                <span className="text-[10px] font-mono text-[#8c91a0] uppercase">{f.label}</span>
                <span className="text-base font-extrabold">{f.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
