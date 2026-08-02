import React, { useState } from 'react';
import { X, Gift, Copy, Check, Share2, Users, Sparkles } from 'lucide-react';
import { UserStats } from '../types';
import { buildReferralLink } from '../services/referral/referralClient';
import { ECONOMY } from '../services/economy/economyConstants';

interface ReferralModalProps {
  stats: UserStats;
  onClose: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ stats, onClose }) => {
  const [copied, setCopied] = useState(false);
  const code = stats.referralCode || '—';
  const link = stats.referralCode ? buildReferralLink(stats.referralCode) : '';

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível — usuário pode selecionar o texto manualmente
    }
  };

  const handleShare = async () => {
    if (!link) return;
    const shareText = `Estou usando o MemoriaFlash para estudar com flashcards + IA. Use meu link e ganhe créditos grátis: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'MemoriaFlash', text: shareText, url: link });
      } catch {
        /* usuário cancelou o compartilhamento */
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0b1a2a] border border-emerald-500/30 rounded-3xl p-6 text-white shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Indique e Ganhe</h3>
              <p className="text-[11px] text-[#8c91a0]">Créditos de IA grátis para você e seu amigo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reward explanation */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#122131] border border-[#424754]/30 text-center">
            <div className="text-2xl font-extrabold text-emerald-400">+{ECONOMY.REFERRAL_REFERRER_BONUS}</div>
            <div className="text-[10px] text-[#8c91a0] mt-1">você ganha por amigo indicado</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#122131] border border-[#424754]/30 text-center">
            <div className="text-2xl font-extrabold text-[#60a5fa]">+{ECONOMY.REFERRAL_WELCOME_BONUS}</div>
            <div className="text-[10px] text-[#8c91a0] mt-1">seu amigo ganha ao entrar</div>
          </div>
        </div>

        {/* Referral code / link box */}
        <div className="p-4 rounded-2xl bg-[#122131] border border-[#424754]/30 space-y-2">
          <div className="text-[10px] font-mono uppercase text-[#8c91a0] tracking-wider">Seu código</div>
          <div className="text-xl font-mono font-extrabold text-white tracking-widest">{code}</div>
          {link && <div className="text-[10px] text-slate-500 break-all font-mono">{link}</div>}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            disabled={!link}
            className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar Link'}
          </button>
          <button
            onClick={handleShare}
            disabled={!link}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" /> Compartilhar
          </button>
        </div>

        {!link && (
          <p className="text-[11px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            Faça login para gerar seu link de indicação pessoal.
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#122131] border border-[#424754]/30">
          <div className="flex items-center gap-2 text-xs text-[#c2c6d6]">
            <Users className="w-4 h-4 text-[#60a5fa]" />
            <span>
              <strong className="text-white">{stats.referralCount || 0}</strong> amigos indicados
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#c2c6d6]">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>
              <strong className="text-white">{stats.referralCreditsEarned || 0}</strong> créditos ganhos
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
