import React, { useEffect, useState } from 'react';
import { ShieldCheck, Brain, Check } from 'lucide-react';

const CONSENT_KEY = 'flashmind_consent_v1';

export interface ConsentPrefs {
  essential: true; // sempre ativo, necessário para o app funcionar
  analytics: boolean;
  personalizedAds: boolean;
  decidedAt: string;
}

export function getStoredConsent(): ConsentPrefs | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveConsent(prefs: ConsentPrefs) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
}

// ---------------------------------------------------------------------------
// Tela de consentimento LGPD/GDPR — aparece em tela cheia bloqueante no
// PRIMEIRO acesso, antes de qualquer interação com o app. O usuário decide
// uma vez (aceitar tudo / personalizar / rejeitar não-essenciais) e a
// escolha fica salva para sempre (não reaparece).
//
// Conformidade LGPD/GDPR:
//  - "Rejeitar não-essenciais" tem o mesmo destaque visual de "Aceitar tudo"
//    (nenhum dark pattern de opt-out escondido).
//  - Essenciais ficam sempre ativos — rejeitar NÃO bloqueia o uso do app,
//    apenas desativa analytics e anúncios personalizados.
// ---------------------------------------------------------------------------
export const ConsentBanner: React.FC<{ onOpenPrivacyPolicy?: () => void }> = ({ onOpenPrivacyPolicy }) => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [personalizedAds, setPersonalizedAds] = useState(true);

  useEffect(() => {
    if (!getStoredConsent()) setVisible(true);
  }, []);

  if (!visible) return null;

  const decide = (prefs: Omit<ConsentPrefs, 'essential' | 'decidedAt'>) => {
    saveConsent({ essential: true, decidedAt: new Date().toISOString(), ...prefs });
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-md mx-auto my-8 rounded-3xl bg-[#0b1a2a] border border-[#adc6ff]/30 shadow-2xl text-white overflow-hidden">
        {/* Topo com branding */}
        <div className="px-6 pt-7 pb-5 bg-gradient-to-br from-[#0e2742] to-[#122131] border-b border-[#adc6ff]/15">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#60a5fa]/15 text-[#60a5fa]">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">MemoriaFlash</h1>
              <p className="text-[11px] text-[#8c91a0] font-medium">Flashcards inteligentes com IA</p>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#adc6ff]/10 text-[#adc6ff] flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-snug">Sua privacidade é importante para nós</h2>
              <p className="text-xs text-[#c2c6d6] leading-relaxed mt-1">
                Para começar a usar o MemoriaFlash, precisamos do seu consentimento. Usamos armazenamento local
                essencial para o app funcionar e, com sua permissão, estatísticas de uso e anúncios personalizados que
                mantêm o app gratuito.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Detalhes / opções granulares */}
          {showDetails ? (
            <div className="space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8c91a0]">Suas escolhas</p>
              <label className="flex items-center justify-between gap-3 text-xs text-[#c2c6d6] p-3 rounded-xl bg-[#122131] border border-[#adc6ff]/10">
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Essenciais <span className="text-emerald-400 font-bold">(sempre ativos)</span>
                </span>
                <input type="checkbox" checked disabled className="accent-[#adc6ff] opacity-60" />
              </label>
              <label className="flex items-center justify-between gap-3 text-xs text-[#c2c6d6] p-3 rounded-xl bg-[#122131] border border-[#adc6ff]/10 cursor-pointer">
                <span>Estatísticas de uso (analytics)</span>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="accent-[#adc6ff] cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-xs text-[#c2c6d6] p-3 rounded-xl bg-[#122131] border border-[#adc6ff]/10 cursor-pointer">
                <span>Anúncios personalizados</span>
                <input
                  type="checkbox"
                  checked={personalizedAds}
                  onChange={(e) => setPersonalizedAds(e.target.checked)}
                  className="accent-[#adc6ff] cursor-pointer"
                />
              </label>
            </div>
          ) : (
            <p className="text-[11px] text-[#8c91a0] leading-relaxed">
              Você pode aceitar tudo ou personalizar o que compartilha. Sua escolha pode ser alterada a qualquer
              momento nas configurações do dispositivo.
            </p>
          )}

          {/* Botões de ação */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={() => decide({ analytics: true, personalizedAds: true })}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#4d8eff] to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] text-white text-sm font-extrabold shadow-lg shadow-blue-500/20 cursor-pointer transition-all hover:scale-[1.01]"
            >
              Aceitar Tudo
            </button>

            {showDetails ? (
              <button
                onClick={() => decide({ analytics, personalizedAds })}
                className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-extrabold shadow-md cursor-pointer transition-all"
              >
                Salvar Preferências
              </button>
            ) : (
              <button
                onClick={() => setShowDetails(true)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold cursor-pointer transition-colors"
              >
                Personalizar
              </button>
            )}

            <button
              onClick={() => decide({ analytics: false, personalizedAds: false })}
              className="w-full px-4 py-3 rounded-xl bg-transparent hover:bg-white/5 border border-slate-700 text-white text-sm font-bold cursor-pointer transition-colors"
            >
              Rejeitar não-essenciais
            </button>
          </div>

          {/* Rodapé com link para política */}
          <div className="text-center pt-1">
            {onOpenPrivacyPolicy ? (
              <button
                onClick={onOpenPrivacyPolicy}
                className="text-[11px] underline text-[#60a5fa] hover:text-white cursor-pointer"
              >
                Ver Política de Privacidade
              </button>
            ) : (
              <p className="text-[11px] text-[#8c91a0]">
                Seus dados ficam protegidos de acordo com a LGPD.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
