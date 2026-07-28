import React from 'react';
import { X, Globe, Check, Sparkles } from 'lucide-react';
import { SupportedLanguage, SUPPORTED_LANGUAGES, translations } from '../lib/i18n';

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
  const t = translations[currentLanguage] || translations.pt;

  const handleSelect = (code: SupportedLanguage) => {
    localStorage.setItem('flashmind_lang', code);
    onSelectLanguage(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#0b1a2a] border border-[#adc6ff]/30 rounded-3xl p-6 text-white shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#424754]/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-blue-500/20 text-[#60a5fa]">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">{t.language}</h3>
              <p className="text-[11px] text-[#8c91a0] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> {t.autoDetected}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Options List */}
        <div className="space-y-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = currentLanguage === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#122131] border-[#60a5fa] text-white shadow-lg shadow-blue-500/10'
                    : 'bg-[#122131]/50 border-[#424754]/30 text-slate-300 hover:bg-[#122131] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <div className="text-left">
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      {lang.nativeName}
                    </div>
                    <div className="text-[11px] text-[#8c91a0] font-mono uppercase">
                      {lang.code}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-[#3b82f6] text-white flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <p className="text-[10px] text-center text-[#8c91a0]">
          O FlashMind adapta a interface e as vozes do tutor ao idioma selecionado.
        </p>
      </div>
    </div>
  );
};
