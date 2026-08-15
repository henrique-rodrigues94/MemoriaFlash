import React, { useState } from 'react';
import { X, Gift, Copy, Check, Share2, Users, Crown } from 'lucide-react';
import { UserStats } from '../types';
import { buildReferralLink, claimReferralCode } from '../services/referral/referralClient';
import { ECONOMY } from '../services/economy/economyConstants';

interface ReferralModalProps {
  stats: UserStats;
  onClose: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ stats, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const code = stats.referralCode || '—';
  const link = stats.referralCode ? buildReferralLink(stats.referralCode) : '';

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível — o link continua visível para cópia manual
    }
  };

  const handleShare = async () => {
    if (!link) return;
    const shareText = `Estou usando o MemoriaFlash para estudar. Baixe o app e comece a usar pelo meu link: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'MemoriaFlash', text: shareText, url: link });
      } catch {
        // usuário cancelou
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  const handleRedeem = async () => {
    setFeedback(null);
    setRedeeming(true);
    try {
      const result = await claimReferralCode(redeemCode);
      setFeedback(result.message);
      if (result.success) setRedeemCode('');
    } finally {
      setRedeeming(false);
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
              <p className="text-[11px] text-[#8c91a0]">Seu amigo começa a usar o app e você ganha 3 dias de Pro</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Crown className="w-5 h-5 text-amber-400" />
            <span>Recompensa: +{ECONOMY.REFERRAL_PRO_REWARD_DAYS} dias de plano Pro</span>
          </div>
          <p className="text-[11px] text-[#8c91a0] mt-2">A recompensa é liberada uma vez por amigo, quando ele entra no aplicativo usando seu código ou link.</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#122131] border border-[#424754]/30 space-y-2">
          <div className="text-[10px] font-mono uppercase text-[#8c91a0] tracking-wider">Seu código de indicação</div>
          <div className="text-xl font-mono font-extrabold text-white tracking-widest">{code}</div>
          {link && <div className="text-[10px] text-slate-500 break-all font-mono">{link}</div>}
        </div>

        <div className="flex gap-2">
          <button onClick={handleCopy} disabled={!link} className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar Link'}
          </button>
          <button onClick={handleShare} disabled={!link} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer">
            <Share2 className="w-4 h-4" /> Compartilhar
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-[#122131] border border-[#424754]/30 space-y-3">
          <div>
            <div className="text-xs font-bold text-white">Recebeu um código?</div>
            <div className="text-[10px] text-[#8c91a0] mt-1">Cole o código do seu amigo abaixo para registrar a indicação.</div>
          </div>
          <div className="flex gap-2">
            <input
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="EX: ABC123"
              maxLength={32}
              className="flex-1 min-w-0 rounded-xl bg-[#081523] border border-[#424754]/50 px-3 py-2.5 text-sm font-mono tracking-wider text-white uppercase outline-none focus:border-emerald-400"
            />
            <button
              onClick={handleRedeem}
              disabled={redeeming || !redeemCode.trim()}
              className="px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs"
            >
              {redeeming ? '...' : 'Resgatar'}
            </button>
          </div>
          {feedback && <p className="text-[11px] text-emerald-300">{feedback}</p>}
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#122131] border border-[#424754]/30">
          <div className="flex items-center gap-2 text-xs text-[#c2c6d6]">
            <Users className="w-4 h-4 text-[#60a5fa]" />
            <span><strong className="text-white">{stats.referralCount || 0}</strong> amigos ativados</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#c2c6d6]">
            <Crown className="w-4 h-4 text-amber-400" />
            <span><strong className="text-white">{stats.referralProDaysEarned || 0}</strong> dias Pro ganhos</span>
          </div>
        </div>
      </div>
    </div>
  );
};
