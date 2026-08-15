import React, { useEffect } from 'react';
import { X, Globe, Check, Sparkles } from 'lucide-react';
import { SupportedLanguage, translations } from '../lib/i18n';

interface LanguageSelectorModalProps {
  currentLanguage: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  onClose: () => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  currentLanguage,
  onSelectLanguage,
  onClose,
}) => {
  const t = translations.pt;

  // O produto é exclusivamente Português (Brasil). Corrige instalações
  // antigas que ainda tenham outro idioma salvo no localStorage.
  useEffect(() => {
    if (currentLanguage !== 'pt') {
      localStorage.setItem('flashmind_lang', 'pt');
      onSelectLanguage('pt');
    }
  }, [currentLanguage, onSelectLanguage]);

  const handleSelect = () => {
    localStorage.setItem('flashmind_lang', 'pt');
    onSelectLanguage('pt');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#0b1a2a] border border-[#adc6ff]/30 rounded-3xl p-6 text-white shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#424754]/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-blue-500/20 text-[#60a5fa]"><Globe className="w-5 h-5" /></div>
            <div>
              <h3 className="text-base font-bold">{t.language}</h3>
              <p className="text-[11px] text-[#8c91a0] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Português (Brasil)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleSelect}
          className="w-full p-3.5 rounded-2xl border flex items-center justify-between bg-[#122131] border-[#60a5fa] text-white shadow-lg shadow-blue-500/10 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇧🇷</span>
            <div className="text-left">
              <div className="text-sm font-bold">Português (BR)</div>
              <div className="text-[11px] text-[#8c91a0] font-mono uppercase">pt-BR</div>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full bg-[#3b82f6] text-white flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
        </button>

        <p className="text-[10px] text-center text-[#8c91a0]">
          O MemoriaFlash está disponível somente em Português (Brasil).
        </p>
      </div>
    </div>
  );
};
