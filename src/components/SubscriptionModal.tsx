import React, { useMemo, useState } from 'react';
import { X, Check, Crown, QrCode, ArrowRight } from 'lucide-react';
import { UserStats } from '../types';
import { detectAdTier, getRegionalPricing } from '../services/economy/adTierStrategy';

interface SubscriptionModalProps {
  stats: UserStats;
  theme?: 'dark' | 'light';
  onUpgradePro: (planType: 'monthly' | 'annual') => void;
  onOpenAdMob: () => void;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  stats,
  theme = 'dark',
  onUpgradePro,
  onOpenAdMob,
  onClose,
}) => {
  const isLightTheme = theme === 'light';

  // O alternador Mensal/Anual controla diretamente qual plano PRO é exibido
  // ao lado do plano Grátis — antes os 3 cards apareciam sempre juntos e o
  // alternador não tinha efeito nenhum, dando a impressão de tela duplicada.
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [paymentStep, setPaymentStep] = useState<'plans' | 'checkout' | 'success'>('plans');
  const isAnnual = billingCycle === 'annual';

  // Preço ajustado por região (ver src/services/economy/adTierStrategy.ts) —
  // evita cobrar o mesmo valor de usuários em mercados com poder aquisitivo
  // e eCPM de anúncio muito diferentes (ex: EUA vs. Índia).
  const pricing = useMemo(() => getRegionalPricing(detectAdTier()), []);

  const handleSelectPlan = () => {
    setPaymentStep('checkout');
  };

  const handleConfirmPayment = () => {
    onUpgradePro(billingCycle);
    setPaymentStep('success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className={`relative w-full max-w-3xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border ${
          isLightTheme
            ? 'bg-[#f5f9fc] border-slate-200 text-slate-900'
            : 'bg-[#0b1a2a] border-[#adc6ff]/30 text-white'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-4 ${isLightTheme ? 'border-slate-200' : 'border-[#424754]/30'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-2xl border ${isLightTheme ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-xl font-extrabold ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>Planos MemoriaFlash PRO</h2>
              <p className={`text-xs ${isLightTheme ? 'text-slate-500' : 'text-[#8c91a0]'}`}>
                Desbloqueie o poder total da IA e estude sem interrupções
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isLightTheme
                ? 'text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {paymentStep === 'plans' && (
          <div className="space-y-6">
            {/* Cycle Switcher */}
            <div className="flex justify-center">
              <div className={`p-1 rounded-2xl border flex items-center gap-1 text-xs ${isLightTheme ? 'bg-slate-100 border-slate-200' : 'bg-[#122131] border-[#424754]/30'}`}>
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 rounded-xl font-bold transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-[#3b82f6] text-white shadow-md'
                      : isLightTheme
                        ? 'text-slate-500 hover:text-slate-900'
                        : 'text-[#8c91a0] hover:text-white'
                  }`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                    billingCycle === 'annual'
                      ? 'bg-[#3b82f6] text-white shadow-md'
                      : isLightTheme
                        ? 'text-slate-500 hover:text-slate-900'
                        : 'text-[#8c91a0] hover:text-white'
                  }`}
                >
                  Anual
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-mono text-[10px] font-extrabold uppercase">
                    {pricing.annualDiscountPercent}% OFF
                  </span>
                </button>
              </div>
            </div>

            {/* Plans Cards Grid — Grátis + o plano PRO correspondente ao ciclo escolhido acima */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Free AdMob */}
              <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${isLightTheme ? 'bg-slate-50 border-slate-200' : 'bg-[#122131] border-[#424754]/30'}`}>
                <div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono border uppercase font-bold ${isLightTheme ? 'bg-[#f5f9fc] text-slate-500 border-slate-200' : 'bg-[#0b1a2a] text-[#8c91a0] border-[#424754]/30'}`}>
                    Grátis com AdMob
                  </span>
                  <div className="mt-3">
                    <span className={`text-2xl font-extrabold ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>R$ 0</span>
                    <span className={`text-xs ${isLightTheme ? 'text-slate-500' : 'text-[#8c91a0]'}`}>/mês</span>
                  </div>
                  <p className={`text-xs mt-1 ${isLightTheme ? 'text-slate-500' : 'text-[#8c91a0]'}`}>
                    Financiado por anúncios para manter o app acessível a todos.
                  </p>

                  <ul className={`mt-4 space-y-2 text-xs ${isLightTheme ? 'text-slate-600' : 'text-slate-300'}`}>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> 15 Créditos IA/mês
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> +10 Créditos por Anúncio AdMob
                    </li>
                    <li className={`flex items-center gap-2 ${isLightTheme ? 'text-slate-400' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${isLightTheme ? 'text-slate-400' : 'text-slate-500'}`} /> Anúncios em Banners
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    onOpenAdMob();
                    onClose();
                  }}
                  className={`w-full py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    isLightTheme
                      ? 'bg-[#f5f9fc] hover:bg-blue-50 border-blue-200 text-blue-600'
                      : 'bg-[#0b1a2a] hover:bg-[#1c2b3c] border-[#adc6ff]/20 text-[#adc6ff]'
                  }`}
                >
                  Ganhar Créditos AdMob
                </button>
              </div>

              {/* Card 2: PRO — conteúdo muda de acordo com o ciclo (Mensal/Anual) selecionado acima */}
              {isAnnual ? (
                <div className={`relative p-5 rounded-2xl border-2 shadow-2xl flex flex-col justify-between space-y-4 ${
                  isLightTheme
                    ? 'bg-gradient-to-b from-amber-50 to-[#f5f9fc] border-amber-400'
                    : 'bg-gradient-to-b from-[#162a45] to-[#0b1a2a] border-amber-500/60'
                }`}>
                  <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-mono text-[10px] font-extrabold uppercase shadow-lg">
                    Mais Popular
                  </div>

                  <div>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono border uppercase font-bold ${isLightTheme ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                      PRO Anual (Economize {pricing.annualDiscountPercent}%)
                    </span>
                    <div className="mt-3">
                      <span className={`text-2xl font-extrabold ${isLightTheme ? 'text-amber-600' : 'text-amber-300'}`}>{pricing.annualMonthlyEquivalent}</span>
                      <span className={`text-xs ${isLightTheme ? 'text-slate-500' : 'text-[#8c91a0]'}`}>/mês</span>
                      <div className={`text-[10px] font-mono mt-0.5 ${isLightTheme ? 'text-amber-700/80' : 'text-amber-200/80'}`}>
                        Faturado {pricing.annualTotalPrice} por ano
                      </div>
                    </div>

                    <ul className={`mt-4 space-y-2 text-xs ${isLightTheme ? 'text-slate-700' : 'text-white'}`}>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-500" /> 7 Dias de Teste Grátis
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-500" /> Créditos de IA Ilimitados
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-500" /> Bônus Instantâneo +5.000 XP
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-500" /> Selo Dourado Estudante VIP
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={handleSelectPlan}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1"
                  >
                    Começar 7 Dias Grátis <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className={`p-5 rounded-2xl border-2 shadow-xl flex flex-col justify-between space-y-4 ${
                  isLightTheme
                    ? 'bg-blue-50 border-blue-400 shadow-blue-500/5'
                    : 'bg-[#122238] border-[#60a5fa] shadow-blue-500/10'
                }`}>
                  <div>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono border uppercase font-bold ${isLightTheme ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-blue-500/20 text-[#60a5fa] border-blue-500/30'}`}>
                      PRO Mensal
                    </span>
                    <div className="mt-3">
                      <span className={`text-2xl font-extrabold ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>{pricing.monthlyPrice}</span>
                      <span className={`text-xs ${isLightTheme ? 'text-slate-500' : 'text-[#8c91a0]'}`}>/mês</span>
                    </div>
                    <p className={`text-xs mt-1 ${isLightTheme ? 'text-slate-500' : 'text-[#8c91a0]'}`}>
                      Ideal para flexibilidade sem compromisso de longo prazo.
                    </p>

                    <ul className={`mt-4 space-y-2 text-xs ${isLightTheme ? 'text-slate-700' : 'text-slate-200'}`}>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-blue-500" /> Créditos de IA Ilimitados
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-blue-500" /> Zero Anúncios
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-blue-500" /> Scanner Ilimitado (PDF, foto, DOCX)
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-blue-500" /> Quiz Diagnóstico Ilimitado
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={handleSelectPlan}
                    className="w-full py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold shadow-md shadow-blue-500/20"
                  >
                    Assinar Plano Mensal
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {paymentStep === 'checkout' && (
          <div className="space-y-5 max-w-md mx-auto animate-fade-in">
            <div className="text-center space-y-1">
              <h3 className={`text-lg font-bold ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>Confirmação de Assinatura PRO</h3>
              <p className={`text-xs ${isLightTheme ? 'text-slate-500' : 'text-[#8c91a0]'}`}>
                Plano Selecionado:{' '}
                <strong className={`uppercase ${isLightTheme ? 'text-amber-600' : 'text-amber-300'}`}>
                  {isAnnual
                    ? `PRO Anual (${pricing.annualTotalPrice}/ano)`
                    : `PRO Mensal (${pricing.monthlyPrice}/mês)`}
                </strong>
              </p>
            </div>

            {/* PIX QR Code & Card Switcher */}
            <div className={`p-5 rounded-2xl border space-y-4 text-center ${isLightTheme ? 'bg-slate-50 border-slate-200' : 'bg-[#122131] border-[#424754]/30'}`}>
              <div className={`flex items-center justify-center gap-2 text-xs font-bold ${isLightTheme ? 'text-blue-600' : 'text-[#60a5fa]'}`}>
                <QrCode className="w-4 h-4" /> PIX Instantâneo ou Cartão de Crédito
              </div>

              <div className="w-36 h-36 bg-white rounded-xl mx-auto p-2 flex items-center justify-center shadow-lg">
                <div className="w-32 h-32 border-2 border-black p-2 flex flex-col items-center justify-center text-black font-mono text-[9px] font-bold text-center">
                  <span>MEMORIAFLASH PRO</span>
                  <span className="text-xs my-1 font-extrabold">PIX-PRO-2026</span>
                  <span>PAGUE E ATIVE JA</span>
                </div>
              </div>

              <p className={`text-[11px] ${isLightTheme ? 'text-slate-500' : 'text-[#8c91a0]'}`}>
                Sua chave PIX ou cartão de crédito será processado com segurança via Stripe/PagBank e sua assinatura PRO ativada imediatamente.
              </p>

              <button
                onClick={handleConfirmPayment}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                Confirmar Pagamento & Ativar PRO
              </button>
            </div>

            <button
              onClick={() => setPaymentStep('plans')}
              className={`w-full text-center text-xs hover:underline ${isLightTheme ? 'text-slate-500' : 'text-[#8c91a0]'}`}
            >
              Voltar e escolher outro plano
            </button>
          </div>
        )}

        {paymentStep === 'success' && (
          <div className="text-center space-y-4 py-8 animate-fade-in max-w-md mx-auto">
            <div className={`w-16 h-16 rounded-full border flex items-center justify-center mx-auto shadow-2xl ${isLightTheme ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
              <Crown className="w-9 h-9" />
            </div>

            <h3 className={`text-xl font-extrabold ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>Parabéns! Você agora é MemoriaFlash PRO!</h3>
            <p className={`text-xs ${isLightTheme ? 'text-slate-600' : 'text-slate-300'}`}>
              Seus créditos de IA agora são <strong className={isLightTheme ? 'text-amber-600' : 'text-amber-300'}>ILIMITADOS</strong>, todos os anúncios AdMob foram desativados e seu selo VIP está ativo.
            </p>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold"
            >
              Aproveitar Recursos PRO
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
