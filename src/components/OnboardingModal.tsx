import React, { useState } from 'react';
import { Sparkles, BrainCircuit, Layers, CheckCircle2, ArrowRight, X } from 'lucide-react';

interface OnboardingModalProps {
  onClose: () => void;
  onOpenAuth?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose, onOpenAuth }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Crie Flashcards com IA',
      subtitle: 'Gere seus decks em segundos',
      description:
        'Digite uma matéria ou envie um PDF/foto pelo Scanner e o MemoriaFlash gera flashcards completos com IA, incluindo explicações e exemplos práticos. Você também pode criar cards manualmente quando quiser.',
      icon: Sparkles,
      badge: 'Gerador IA · Scanner',
      color: 'from-blue-600 to-indigo-600',
    },
    {
      title: 'Estudo com Repetição Espaçada',
      subtitle: 'O algoritmo SM-2 trabalha por você',
      description:
        'O MemoriaFlash calcula o intervalo ideal para revisar cada card com base na sua facilidade de lembrança. Você revisa menos o que já sabe e mais o que ainda está difícil — fixando o conteúdo de verdade.',
      icon: BrainCircuit,
      badge: 'SM-2 · Repetição Espaçada',
      color: 'from-amber-500 to-orange-600',
    },
    {
      title: 'Seus Decks, Sempre Com Você',
      subtitle: 'Sincronizado na nuvem',
      description:
        'Seus decks e progresso ficam salvos na nuvem e acompanham você em qualquer dispositivo. Faça login com o Google para sincronizar tudo automaticamente.',
      icon: Layers,
      badge: 'Nuvem · Google',
      color: 'from-cyan-500 to-blue-600',
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0b1a2a] border border-[#adc6ff]/20 rounded-3xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#60a5fa]/20 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/50 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#adc6ff]/10 text-[#adc6ff] text-xs font-semibold mb-4 border border-[#adc6ff]/20">
          <Sparkles className="w-3.5 h-3.5 text-[#60a5fa]" />
          {current.badge}
        </div>

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#122131] to-[#273647] border border-[#adc6ff]/30 flex items-center justify-center mb-6 shadow-inner">
          <Icon className="w-8 h-8 text-[#adc6ff]" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">
          {current.title}
        </h2>
        <h3 className="text-sm font-medium text-[#60a5fa] mb-3">
          {current.subtitle}
        </h3>
        <p className="text-slate-300 text-sm leading-relaxed mb-8">
          {current.description}
        </p>

        {/* Como ganhar créditos */}
        {/* Google Login */}
        {onOpenAuth && (
          <div className="pt-4 border-t border-[#424754]/30 my-4 text-center">
            <button
              onClick={() => { onClose(); onOpenAuth(); }}
              className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Já tem conta? Entrar com o Google</span>
            </button>
          </div>
        )}

        {/* Dots + navegação */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all ${
                  step === i ? 'w-6 bg-[#60a5fa]' : 'w-2 bg-slate-700'
                }`}
              />
            ))}
          </div>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
            >
              Próximo <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              Começar Agora <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
