import React, { useState, useEffect } from 'react';
import { X, Mic, Volume2, Globe, Shield, Check, Play, Sparkles, Sliders } from 'lucide-react';
import { VoiceSettings } from '../types';

interface VoiceSettingsModalProps {
  settings: VoiceSettings;
  onSave: (updated: VoiceSettings) => void;
  onClose: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  settings,
  onSave,
  onClose,
}) => {
  const [form, setForm] = useState<VoiceSettings>({
    ...settings,
    speechPitch: settings.speechPitch ?? 1.0,
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      }
    };

    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleTestVoice = () => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    setIsPlayingTest(true);

    const testText =
      form.language === 'en'
        ? 'Hello! I am your MemoriaFlash AI study assistant. All voice synthesis APIs are completely free.'
        : 'Olá! Eu sou o assistente de inteligência artificial do MemoriaFlash. Todas as opções de voz são cem por cento gratuitas!';

    const utterance = new SpeechSynthesisUtterance(testText);
    utterance.rate = form.speechSpeed || 1.1;
    utterance.pitch = form.speechPitch || 1.0;
    utterance.lang = form.language === 'pt' ? 'pt-BR' : form.language === 'en' ? 'en-US' : form.language;

    if (form.selectedVoiceURI) {
      const matched = availableVoices.find((v) => v.voiceURI === form.selectedVoiceURI);
      if (matched) utterance.voice = matched;
    }

    utterance.onend = () => setIsPlayingTest(false);
    utterance.onerror = () => setIsPlayingTest(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleSaveAndClose = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    onSave(form);
    onClose();
  };

  // Filter voices by selected language
  const langPrefix = form.language === 'pt' ? 'pt' : form.language === 'en' ? 'en' : form.language;
  const filteredVoices = availableVoices.filter((v) =>
    v.lang.toLowerCase().startsWith(langPrefix)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0b1a2a] border border-[#adc6ff]/30 rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#424754]/30 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-blue-500/20 text-[#60a5fa]">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Voz da IA & Sintetizador Gratuito</h3>
              <p className="text-xs text-[#8c91a0]">Escolha a voz nativa e personalize o tom</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free API Banner */}
        <div className="p-3.5 rounded-2xl bg-[#122131] border border-emerald-500/30 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="text-xs">
            <div className="font-bold text-emerald-300">APIs 100% Gratuitas & Nativas</div>
            <p className="text-[#8c91a0] text-[11px]">
              O MemoriaFlash utiliza o sintetizador <strong className="text-white">Web Speech API</strong> do navegador e o <strong className="text-white">Gemini 3.6 Flash</strong> sem custos adicionais.
            </p>
          </div>
        </div>

        {/* Wake Word */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#122131] border border-[#424754]/30">
          <div>
            <div className="text-xs font-bold text-white">Comando de Ativação ("Ok MemoriaFlash")</div>
            <div className="text-[11px] text-[#8c91a0]">Escuta contínua via microfone local.</div>
          </div>
          <button
            onClick={() => setForm({ ...form, wakeWordEnabled: !form.wakeWordEnabled })}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              form.wakeWordEnabled ? 'bg-[#3b82f6]' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
                form.wakeWordEnabled ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Language Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#8c91a0] uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-[#60a5fa]" /> Idioma da Sintetização
          </label>
          <select
            value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value })}
            className="w-full bg-[#122131] border border-[#424754]/40 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#60a5fa]"
          >
            <option value="pt">Português (Brasil)</option>
            <option value="en">English (US)</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
          </select>
        </div>

        {/* Voice Selection (Nativas do Navegador) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#8c91a0] uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-[#60a5fa]" /> Selecionar Voz Específica
            </label>
            <span className="text-[10px] text-emerald-400 font-mono">
              {filteredVoices.length || availableVoices.length} vozes disponíveis
            </span>
          </div>

          <select
            value={form.selectedVoiceURI || ''}
            onChange={(e) => setForm({ ...form, selectedVoiceURI: e.target.value, voicePersona: 'custom' })}
            className="w-full bg-[#122131] border border-[#424754]/40 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#60a5fa]"
          >
            <option value="">-- Voz Padrão do Sistema --</option>
            {(filteredVoices.length > 0 ? filteredVoices : availableVoices).map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang}) {voice.default ? '★ Padrão' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Persona Quick Presets */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#8c91a0] uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-[#60a5fa]" /> Presets de Perfil de Voz
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'female', label: 'Feminina Suave', pitch: 1.2, speed: 1.1 },
              { id: 'male', label: 'Masculina Grave', pitch: 0.8, speed: 1.0 },
              { id: 'neutral', label: 'Neutra Dinâmica', pitch: 1.0, speed: 1.2 },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() =>
                  setForm({
                    ...form,
                    voicePersona: p.id as any,
                    speechPitch: p.pitch,
                    speechSpeed: p.speed,
                  })
                }
                className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                  form.voicePersona === p.id
                    ? 'bg-[#3b82f6] border-[#60a5fa] text-white shadow-lg shadow-blue-500/20'
                    : 'bg-[#122131] border-[#424754]/30 text-[#c2c6d6] hover:bg-[#1c2b3c]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Speech Speed & Pitch Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-[#8c91a0] uppercase tracking-wider">Velocidade:</span>
              <span className="font-mono text-[#60a5fa] font-bold">{form.speechSpeed}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={form.speechSpeed}
              onChange={(e) => setForm({ ...form, speechSpeed: parseFloat(e.target.value) })}
              className="w-full accent-[#3b82f6] cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-[#8c91a0] uppercase tracking-wider">Tom de Voz:</span>
              <span className="font-mono text-[#60a5fa] font-bold">
                {form.speechPitch ? form.speechPitch.toFixed(1) : '1.0'}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={form.speechPitch || 1.0}
              onChange={(e) => setForm({ ...form, speechPitch: parseFloat(e.target.value) })}
              className="w-full accent-[#3b82f6] cursor-pointer"
            />
          </div>
        </div>

        {/* Test Voice Button */}
        <button
          type="button"
          onClick={handleTestVoice}
          className="w-full py-2.5 rounded-xl bg-[#122131] hover:bg-[#1c2b3c] border border-[#adc6ff]/30 text-xs font-bold text-[#adc6ff] hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <Play className={`w-4 h-4 fill-current ${isPlayingTest ? 'text-emerald-400 animate-spin' : ''}`} />
          {isPlayingTest ? 'Reproduzindo Teste de Voz...' : 'Ouvir Exemplo da Voz Selecionada'}
        </button>

        {/* Save Button */}
        <button
          onClick={handleSaveAndClose}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Check className="w-4 h-4" /> Salvar Preferências de Voz
        </button>
      </div>
    </div>
  );
};
