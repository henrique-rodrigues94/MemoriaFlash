import React from 'react';
import { X, Check, Sparkles } from 'lucide-react';
import { UserStats } from '../types';

interface SubscriptionModalProps {
  stats: UserStats;
  theme?: 'dark' | 'light';
  onUpgradePro?: (planType: 'monthly' | 'annual') => void;
  onOpenAdMob?: () => void;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ stats, theme = 'dark', onClose }) => {
  const light = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className={`relative w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border ${light ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0b1a2a] border-[#adc6ff]/30 text-white'}`}>
        <button onClick={onClose} className={`absolute top-4 right-4 p-2 rounded-full ${light ? 'bg-slate-100 text-slate-500 hover:text-slate-900' : 'bg-slate-800/50 text-slate-400 hover:text-white'}`} aria-label="Fechar"><X className="w-5 h-5" /></button>
        <div className="text-center mb-7">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 grid place-items-center"><Sparkles className="w-6 h-6" /></div>
          <h2 className="mt-3 text-2xl font-extrabold">MemoriaFlash Gratuito</h2>
          <p className={`text-xs mt-1 ${light ? 'text-slate-500' : 'text-slate-400'}`}>O aplicativo está atualmente no plano gratuito.</p>
        </div>
        <div className={`rounded-2xl border p-5 ${light ? 'bg-slate-50 border-slate-200' : 'bg-[#122131] border-[#424754]/30'}`}>
          <p className="text-xs font-extrabold uppercase tracking-wider text-blue-400">Plano atual</p>
          <p className="mt-2 text-3xl font-black">R$ 0</p>
          <p className={`text-xs mt-1 ${light ? 'text-slate-500' : 'text-slate-400'}`}>Sem cobrança e sem assinatura neste momento.</p>
          <ul className={`mt-5 space-y-3 text-xs ${light ? 'text-slate-600' : 'text-slate-300'}`}>
            <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Até 200 cards gerados por IA</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Baralhos e estudo</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Sincronização quando autenticado</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Nenhuma cobrança pelo Google Play</li>
          </ul>
        </div>
        <div className={`mt-5 rounded-2xl border p-4 text-xs ${light ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-500/10 border-amber-500/20 text-amber-200'}`}>
          <strong>PRO temporariamente desativado.</strong>
          <p className="mt-1 opacity-80">A assinatura será habilitada somente depois que o Play Billing estiver integrado ao app Android e a validação no servidor estiver pronta para produção.</p>
        </div>
        {stats.isPro && <p className="mt-5 text-center text-xs text-amber-400">Esta conta possui um estado PRO legado. O modo atual do aplicativo é gratuito.</p>}
      </div>
    </div>
  );
};
