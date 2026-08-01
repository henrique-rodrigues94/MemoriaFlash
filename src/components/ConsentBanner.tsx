import React, { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';

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

// Banner de consentimento LGPD/GDPR exibido ANTES de qualquer coleta de dados
// não essencial. "Rejeitar" tem o mesmo destaque visual de "Aceitar tudo",
// conforme exigido pela LGPD (nenhum "dark pattern" de opt-out escondido).
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
    <div className="fixed bottom-20 left-0 w-full z-30 p-3 sm:p-4 animate-fade-in">
      <div className="max-w-2xl mx-auto bg-[#0b1a2a] border border-[#adc6ff]/30 rounded-2xl shadow-2xl p-4 sm:p-5 text-white space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#adc6ff]/10 text-[#adc6ff] flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs text-[#c2c6d6] leading-relaxed">
            Usamos cookies e armazenamento local essenciais para o app funcionar, e — com sua permissão — para
            estatísticas de uso e anúncios personalizados que mantêm o FlashMind gratuito.{' '}
            {onOpenPrivacyPolicy && (
              <button onClick={onOpenPrivacyPolicy} className="underline text-[#60a5fa] hover:text-white cursor-pointer">
                Ver Política de Privacidade
              </button>
            )}
          </div>
        </div>

        {showDetails && (
          <div className="space-y-2 pl-1">
            <label className="flex items-center justify-between text-xs text-[#c2c6d6] p-2.5 rounded-xl bg-[#122131]">
              <span>Essenciais (sempre ativos)</span>
              <input type="checkbox" checked disabled className="accent-[#adc6ff]" />
            </label>
            <label className="flex items-center justify-between text-xs text-[#c2c6d6] p-2.5 rounded-xl bg-[#122131] cursor-pointer">
              <span>Estatísticas de uso (analytics)</span>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="accent-[#adc6ff] cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between text-xs text-[#c2c6d6] p-2.5 rounded-xl bg-[#122131] cursor-pointer">
              <span>Anúncios personalizados</span>
              <input
                type="checkbox"
                checked={personalizedAds}
                onChange={(e) => setPersonalizedAds(e.target.checked)}
                className="accent-[#adc6ff] cursor-pointer"
              />
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-end pt-1">
          {!showDetails && (
            <button
              onClick={() => setShowDetails(true)}
              className="px-3.5 py-2 rounded-xl bg-transparent hover:bg-white/5 text-[#c2c6d6] text-xs font-bold cursor-pointer transition-colors"
            >
              Personalizar
            </button>
          )}
          <button
            onClick={() => decide({ analytics: false, personalizedAds: false })}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            Rejeitar não-essenciais
          </button>
          <button
            onClick={() => decide({ analytics: true, personalizedAds: true })}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#4d8eff] to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] text-white text-xs font-extrabold shadow-md cursor-pointer transition-all"
          >
            Aceitar Tudo
          </button>
          {showDetails && (
            <button
              onClick={() => decide({ analytics, personalizedAds })}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md cursor-pointer transition-all"
            >
              Salvar Preferências
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
