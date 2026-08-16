import React, { useState } from 'react';
import { Sparkles, BrainCircuit, Layers, Globe2, CheckCircle2, ArrowRight, X, Smartphone, Monitor } from 'lucide-react';

interface OnboardingModalProps { onClose: () => void; onOpenAuth?: () => void; }

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Bem-vindo ao MemoriaFlash!',
      subtitle: 'Transforme seu estudo em memória de longo prazo',
      description: 'O MemoriaFlash é seu aplicativo de estudos com flashcards, Inteligência Artificial e repetição espaçada. Você pode criar cards rapidamente e estudar no momento certo para memorizar melhor.',
      icon: Sparkles, badge: 'Comece por aqui',
    },
    {
      title: 'Crie Flashcards com IA',
      subtitle: 'Gere seus decks em segundos',
      description: 'Digite uma matéria, escolha os tópicos e a quantidade de cards. A IA cria perguntas, respostas, explicações e curiosidades. Você também pode usar o Scanner para transformar fotos e documentos em conteúdo de estudo.',
      icon: BrainCircuit, badge: 'Gerador IA · Scanner',
    },
    {
      title: 'Estude com Repetição Espaçada',
      subtitle: 'O algoritmo ajuda você a revisar no momento certo',
      description: 'Durante o estudo, avalie se lembrou com dificuldade, normalmente ou facilmente. O MemoriaFlash ajusta os próximos intervalos para você revisar mais o que ainda precisa de atenção.',
      icon: Layers, badge: 'SRS · Revisões',
    },
    {
      title: 'Estude também pelo computador',
      subtitle: 'Seu MemoriaFlash acompanha você em qualquer tela',
      description: 'Acesse o site MemoriaFlash pelo computador ou tablet para estudar com uma tela maior. Os cards e baralhos criados no aplicativo são sincronizados com a nuvem e ficam disponíveis no site após entrar na mesma conta Google.',
      icon: Globe2, badge: 'Site · Computador · Tablet',
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0b1a2a] border border-slate-200 dark:border-[#adc6ff]/20 rounded-3xl p-6 sm:p-8 text-slate-900 dark:text-white shadow-2xl overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-400/20 dark:bg-[#60a5fa]/20 rounded-full blur-3xl pointer-events-none" />
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" aria-label="Fechar"><X className="w-5 h-5" /></button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-[#adc6ff]/10 text-blue-700 dark:text-[#adc6ff] text-xs font-semibold mb-4 border border-blue-100 dark:border-[#adc6ff]/20"><Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-[#60a5fa]" />{current.badge}</div>
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-100 dark:from-[#122131] dark:to-[#273647] border border-blue-200 dark:border-[#adc6ff]/30 flex items-center justify-center mb-6 shadow-inner"><Icon className="w-8 h-8 text-blue-600 dark:text-[#adc6ff]" /></div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">{current.title}</h2>
        <h3 className="text-sm font-medium text-blue-600 dark:text-[#60a5fa] mb-3">{current.subtitle}</h3>
        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-5">{current.description}</p>

        {step === 3 && (
          <a href="https://flashcardsia-a2f43.web.app" target="_blank" rel="noreferrer" className="mb-6 flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 hover:bg-blue-100 dark:hover:bg-blue-500/15 transition-colors">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-300"><Monitor className="w-5 h-5" /><Smartphone className="w-4 h-4" /></div>
            <div className="min-w-0"><div className="text-xs font-extrabold text-slate-900 dark:text-white">Acessar o site MemoriaFlash</div><div className="text-[10px] text-blue-600 dark:text-blue-300 truncate">flashcardsia-a2f43.web.app</div></div>
            <ArrowRight className="w-4 h-4 text-blue-500 dark:text-blue-400 ml-auto shrink-0" />
          </a>
        )}

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1.5">{steps.map((_, i) => <button key={i} type="button" onClick={() => setStep(i)} aria-label={`Ir para etapa ${i + 1}`} className={`h-2 rounded-full transition-all ${step === i ? 'w-6 bg-blue-600 dark:bg-[#60a5fa]' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} />)}</div>
          {step < steps.length - 1 ? <button onClick={() => setStep(step + 1)} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer">Próximo <ArrowRight className="w-4 h-4" /></button> : <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer">Começar Agora <CheckCircle2 className="w-4 h-4" /></button>}
        </div>
      </div>
    </div>
  );
};
