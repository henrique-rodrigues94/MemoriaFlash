import React, { useMemo, useState } from 'react';
import { X, Gift, Copy, Check, Share2, Users, Crown, RefreshCw } from 'lucide-react';
import { UserStats } from '../types';
import { buildReferralLink, claimReferralCode, ensureOwnReferralCodeRegistered } from '../services/referral/referralClient';
import { ECONOMY } from '../services/economy/economyConstants';

interface ReferralModalProps { stats: UserStats; onClose: () => void; }

export const ReferralModal: React.FC<ReferralModalProps> = ({ stats, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(stats.referralCode || '');
  const [feedback, setFeedback] = useState<string | null>(null);

  const code = generatedCode || stats.referralCode || '';
  const link = useMemo(() => code ? buildReferralLink(code) : '', [code]);

  const handleGenerate = async () => {
    setGenerating(true); setFeedback(null);
    try {
      const registered = await ensureOwnReferralCodeRegistered();
      if (!registered) throw new Error('Não foi possível gerar o código. Entre novamente com o Google.');
      setGeneratedCode(registered);
      setFeedback('Código de indicação pronto para compartilhar.');
    } catch (error: any) {
      setFeedback(error?.message || 'Não foi possível gerar o código agora.');
    } finally { setGenerating(false); }
  };

  const handleCopy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setFeedback('Não foi possível copiar o link neste dispositivo.'); }
  };

  const handleShare = async () => {
    if (!link) return;
    const shareText = `Estou usando o MemoriaFlash para estudar. Baixe o app e comece a usar pelo meu link: ${link}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'MemoriaFlash', text: shareText, url: link }); } catch { /* cancelado */ }
    } else window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleRedeem = async () => {
    setFeedback(null); setRedeeming(true);
    try {
      const result = await claimReferralCode(redeemCode);
      setFeedback(result.message);
      if (result.success) setRedeemCode('');
    } finally { setRedeeming(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white border border-[#CDD2E8] rounded-3xl p-6 text-[#1A1F36] shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200"><Gift className="w-5 h-5" /></div><div><h3 className="text-sm font-extrabold">Indique e Ganhe</h3><p className="text-[11px] text-[#5A6380]">Seu amigo começa a usar o app e você ganha {ECONOMY.REFERRAL_PRO_REWARD_DAYS} dias de Pro</p></div></div>
          <button onClick={onClose} className="p-1.5 rounded-full text-[#5A6380] hover:text-[#1A1F36] bg-[#F0F2F8] hover:bg-[#E5E8F4] transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200"><div className="flex items-center gap-2 text-sm font-bold"><Crown className="w-5 h-5 text-amber-600" /><span>Recompensa: +{ECONOMY.REFERRAL_PRO_REWARD_DAYS} dias de plano Pro</span></div><p className="text-[11px] text-[#5A6380] mt-2">A recompensa é liberada uma vez por amigo, quando ele entra no aplicativo usando seu código ou link.</p></div>

        <div className="p-4 rounded-2xl bg-[#F0F2F8] border border-[#CDD2E8] space-y-3">
          <div className="text-[10px] font-mono uppercase text-[#666B87] tracking-wider">Seu código de indicação</div>
          {code ? <><div className="text-xl font-mono font-extrabold text-[#1A1F36] tracking-widest">{code}</div><div className="text-[10px] text-[#666B87] break-all font-mono">{link}</div></> : <p className="text-xs text-[#5A6380]">Gere seu código para compartilhar uma indicação.</p>}
          <button onClick={() => void handleGenerate()} disabled={generating} className="w-full py-2.5 rounded-xl bg-[#4F6EF7] hover:bg-[#3D57D9] disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2"><RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />{generating ? 'Gerando…' : code ? 'Atualizar código' : 'Gerar código de indicação'}</button>
        </div>

        <div className="flex gap-2"><button onClick={handleCopy} disabled={!link} className="flex-1 py-3 rounded-2xl bg-[#E5E8F4] hover:bg-[#DCE0EE] disabled:opacity-40 text-[#1A1F36] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer">{copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}{copied ? 'Copiado!' : 'Copiar Link'}</button><button onClick={handleShare} disabled={!link} className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"><Share2 className="w-4 h-4" /> Compartilhar</button></div>

        <div className="p-4 rounded-2xl bg-[#F0F2F8] border border-[#CDD2E8] space-y-3">
          <div><div className="text-xs font-bold">Recebeu um código?</div><div className="text-[10px] text-[#5A6380] mt-1">Cole o código do seu amigo abaixo para registrar a indicação.</div></div>
          <div className="flex gap-2"><input value={redeemCode} onChange={(e) => setRedeemCode(e.target.value.toUpperCase())} placeholder="EX: ABC123" maxLength={32} autoComplete="off" spellCheck={false} className="flex-1 min-w-0 rounded-xl bg-white border-2 border-emerald-400 px-3 py-2.5 text-base font-mono font-bold tracking-wider text-slate-900 placeholder:text-slate-400 uppercase outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" /><button onClick={handleRedeem} disabled={redeeming || !redeemCode.trim()} className="px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs">{redeeming ? '...' : 'Resgatar'}</button></div>
          {feedback && <p className={`text-[11px] ${feedback.toLowerCase().includes('sucesso') || feedback.toLowerCase().includes('pronto') || feedback.toLowerCase().includes('confirmada') ? 'text-emerald-700' : 'text-amber-700'}`}>{feedback}</p>}
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F0F2F8] border border-[#CDD2E8]"><div className="flex items-center gap-2 text-xs text-[#5A6380]"><Users className="w-4 h-4 text-[#4F6EF7]" /><span><strong className="text-[#1A1F36]">{stats.referralCount || 0}</strong> amigos ativados</span></div><div className="flex items-center gap-2 text-xs text-[#5A6380]"><Crown className="w-4 h-4 text-amber-600" /><span><strong className="text-[#1A1F36]">{stats.referralProDaysEarned || 0}</strong> dias Pro ganhos</span></div></div>
      </div>
    </div>
  );
};
