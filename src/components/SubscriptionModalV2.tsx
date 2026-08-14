import React, { useState } from 'react';
import { X, Check, Crown } from 'lucide-react';
import { UserStats } from '../types';

interface SubscriptionModalProps {
  stats: UserStats;
  theme?: 'dark' | 'light';
  onUpgradePro: (planType: 'monthly' | 'annual') => void;
  onOpenAdMob?: () => void;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ stats, theme = 'dark', onUpgradePro, onClose }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const light = theme === 'light';
  const features = [
    'Geração de cards com IA ilimitada',
    'Sem anúncios',
    'Baralhos e cards sincronizados',
    'Todos os recursos de estudo',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className={`relative w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border ${light ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0b1a2a] border-[#adc6ff]/30 text-white'}`}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        <div className="text-center mb-7">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 grid place-items-center"><Crown className="w-6 h-6" /></div>
          <h2 className="mt-3 text-2xl font-extrabold">MemoriaFlash PRO</h2>
          <p className={`text-xs mt-1 ${light ? 'text-slate-500' : 'text-slate-400'}`}>Geração ilimitada e estudo sem anúncios.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className={`rounded-2xl border p-5 ${light ? 'bg-slate-50 border-slate-200' : 'bg-[#122131] border-[#424754]/30'}`}>
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Grátis</p>
            <p className="mt-2 text-3xl font-black">R$ 0</p>
            <p className="text-xs text-slate-400 mt-1">Para começar seus estudos.</p>
            <ul className="mt-5 space-y-3 text-xs text-slate-400">
              <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Até 200 cards gerados por IA</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Baralhos e estudo</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Anúncios para manter o plano gratuito</li>
            </ul>
          </div>

          <div className={`rounded-2xl border-2 p-5 ${light ? 'bg-amber-50 border-amber-400' : 'bg-gradient-to-b from-[#162a45] to-[#0b1a2a] border-amber-500/60'}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-amber-400">PRO</p>
              <div className="flex rounded-xl bg-black/10 p-1">
                <button onClick={() => setBillingCycle('monthly')} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${billingCycle === 'monthly' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}>Mensal</button>
                <button onClick={() => setBillingCycle('annual')} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${billingCycle === 'annual' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}>Anual</button>
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-amber-400">PRO</p>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-300">
              {features.map((feature) => <li key={feature} className="flex gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> {feature}</li>)}
            </ul>
            <button onClick={() => onUpgradePro(billingCycle)} className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold text-sm">Assinar PRO {billingCycle === 'annual' ? 'Anual' : 'Mensal'}</button>
          </div>
        </div>

        {stats.isPro && <p className="mt-5 text-center text-xs text-emerald-400">Sua conta já está no PRO.</p>}
      </div>
    </div>
  );
};
