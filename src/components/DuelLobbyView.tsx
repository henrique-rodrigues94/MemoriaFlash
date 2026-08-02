import React, { useState } from 'react';
import {
  Swords,
  Trophy,
  Users,
  Zap,
  Play,
  Bot,
  Crown,
  Search,
  Sparkles,
} from 'lucide-react';
import { UserStats } from '../types';

interface DuelLobbyViewProps {
  stats: UserStats;
  onStartDuel: (opponentType: 'ai' | 'player', topic: string) => void;
}

export const DuelLobbyView: React.FC<DuelLobbyViewProps> = ({ stats, onStartDuel }) => {
  const [selectedTopic, setSelectedTopic] = useState('Direito & Legislação');
  const [searchTopic, setSearchTopic] = useState('');

  const leaderboards = [
    { rank: 1, name: 'Lucas Andrade', xp: '12,400 XP', badge: 'Mestre da Memória', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80' },
    { rank: 2, name: 'Beatriz Lima', xp: '9,850 XP', badge: 'Neuro-Especialista', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80' },
    { rank: 3, name: 'Carlos Eduardo', xp: '8,210 XP', badge: 'Estrategista SRS', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80' },
    { rank: 42, name: stats.name, xp: `${stats.xp} XP`, badge: 'Você', avatar: stats.avatar, isCurrent: true },
  ];

  const topicsList = [
    'Direito & Legislação',
    'Medicina & Anatomia',
    'UX Design & Product',
    'Química & Biologia',
    'História & Atualidades',
    'Inglês & Idiomas',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-fade-in">
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[#ffb786]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#df7412]/20 via-[#ffb786]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffb786]/10 text-[#ffb786] border border-[#ffb786]/20 text-xs font-semibold">
              <Swords className="w-3.5 h-3.5" /> ARENA MULTIPLAYER & IA
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Duelos de Conhecimento
            </h1>
            <p className="text-sm text-[#8c91a0] max-w-md">
              Desafie o bot tutor de IA ou outros estudantes em partidas rápidas de 5 rodadas para ganhar XP e subir no ranking.
            </p>
          </div>

          <div className="bg-[#0b1a2a] p-4 rounded-2xl border border-[#424754]/30 text-center space-y-1">
            <div className="text-[10px] text-[#8c91a0] uppercase font-mono">Seu Ranking Global</div>
            <div className="text-2xl font-extrabold text-[#ffb786] flex items-center justify-center gap-1">
              <Crown className="w-5 h-5 text-amber-400" /> #{stats.globalRank}
            </div>
            <div className="text-xs text-[#60a5fa] font-bold">{stats.xp} XP Acumulados</div>
          </div>
        </div>
      </div>

      {/* Choose Opponent Mode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Play VS AI Bot */}
        <div className="glass-card rounded-2xl p-6 border border-[#60a5fa]/30 hover:border-[#60a5fa] transition-all flex flex-col justify-between space-y-4 group">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[#3b82f6]/20 border border-[#3b82f6]/40 flex items-center justify-center text-[#60a5fa]">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-[#60a5fa] transition-colors">
              Desafiar IA Tutor
            </h3>
            <p className="text-xs text-[#8c91a0]">
              Partida instantânea de treino contra a inteligência artificial Gemini com respostas em milissegundos.
            </p>
          </div>

          <button
            id="btn-duel-vs-ai"
            onClick={() => onStartDuel('ai', selectedTopic)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" /> Jogar Contra IA Agora
          </button>
        </div>

        {/* Play VS Online Student */}
        <div className="glass-card rounded-2xl p-6 border border-[#ffb786]/30 hover:border-[#ffb786] transition-all flex flex-col justify-between space-y-4 group">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[#ffb786]/20 border border-[#ffb786]/40 flex items-center justify-center text-[#ffb786]">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-[#ffb786] transition-colors">
              Matchmaking Rápido PvP
            </h3>
            <p className="text-xs text-[#8c91a0]">
              Encontre um oponente ao vivo na rede do MemoriaFlash em salas públicas.
            </p>
          </div>

          <button
            id="btn-duel-vs-player"
            onClick={() => onStartDuel('player', selectedTopic)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white" /> Procurar Adversário PvP
          </button>
        </div>
      </div>

      {/* Topic Selector for Duel */}
      <div className="glass-card rounded-2xl p-5 border border-[#424754]/30 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#60a5fa]" /> Selecione o Tema do Duelo:
        </h3>

        <div className="flex flex-wrap gap-2">
          {topicsList.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTopic(t)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                selectedTopic === t
                  ? 'bg-[#4d8eff] text-white border-[#60a5fa] shadow-md shadow-blue-500/20'
                  : 'bg-[#122131] text-[#c2c6d6] border-[#424754]/30 hover:bg-[#1c2b3c]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="glass-card rounded-2xl p-6 border border-[#424754]/30 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" /> Ranking Semanal de Duelos
          </h3>
          <span className="text-xs text-[#8c91a0]">Atualizado em tempo real</span>
        </div>

        <div className="space-y-2">
          {leaderboards.map((lb) => (
            <div
              key={lb.rank}
              className={`p-3.5 rounded-xl flex items-center justify-between transition-all ${
                lb.isCurrent
                  ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/50 shadow-md'
                  : 'bg-[#0b1a2a] border border-[#424754]/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-7 h-7 rounded-full font-mono text-xs font-bold flex items-center justify-center ${
                    lb.rank === 1
                      ? 'bg-amber-400 text-black'
                      : lb.rank === 2
                      ? 'bg-slate-300 text-black'
                      : lb.rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {lb.rank}
                </span>

                <img
                  src={lb.avatar}
                  alt={lb.name}
                  className="w-9 h-9 rounded-full object-cover border border-[#adc6ff]/20"
                />

                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    {lb.name} {lb.isCurrent && <span className="text-[10px] text-[#60a5fa]">(Você)</span>}
                  </div>
                  <div className="text-[10px] text-[#8c91a0]">{lb.badge}</div>
                </div>
              </div>

              <div className="text-xs font-mono font-bold text-[#ffb786]">
                {lb.xp}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
