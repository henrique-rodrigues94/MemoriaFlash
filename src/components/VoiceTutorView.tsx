import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  VolumeX,
  PlusCircle,
  Clock,
  Settings2,
  Send,
  Brain,
  CheckCircle,
  AlertCircle,
  Radio,
  Zap,
  HelpCircle,
  RefreshCw,
  MessageSquare,
  BookOpen,
  Command,
} from 'lucide-react';
import { VoiceSettings, VoiceHistoryItem, Deck, UserStats } from '../types';
import { apiVoiceTutor } from '../services/api';
import { SupportedLanguage, translations } from '../lib/i18n';

interface VoiceTutorViewProps {
  settings: VoiceSettings;
  history: VoiceHistoryItem[];
  decks: Deck[];
  stats: UserStats;
  currentLanguage: SupportedLanguage;
  onOpenVoiceSettings: () => void;
  onSaveHistory: (newHistory: VoiceHistoryItem[]) => void;
  onAddCardToDeck: (deckId: string, card: { front: string; back: string }) => void;
  onDeductCredit: (amount: number) => void;
  onOpenAdMob: () => void;
  onOpenSubscription: () => void;
}

export const VoiceTutorView: React.FC<VoiceTutorViewProps> = ({
  settings,
  history,
  decks,
  stats,
  currentLanguage,
  onOpenVoiceSettings,
  onSaveHistory,
  onAddCardToDeck,
  onDeductCredit,
  onOpenAdMob,
  onOpenSubscription,
}) => {
  const t = translations[currentLanguage] || translations.pt;

  const [isListening, setIsListening] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [currentAiAnswer, setCurrentAiAnswer] = useState<string | null>(null);
  const [suggestedCard, setSuggestedCard] = useState<{ front: string; back: string } | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<string>(decks[0]?.id || '');
  const [isAddedSuccess, setIsAddedSuccess] = useState(false);
  const [isHandsFreeMode, setIsHandsFreeMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showCommandsGuide, setShowCommandsGuide] = useState(false);

  // Dynamic locale mapping
  const langLocales: Record<SupportedLanguage, string> = {
    pt: 'pt-BR',
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
  };
  const activeLocale = langLocales[currentLanguage] || 'pt-BR';

  // Dynamic context-aware suggested quick questions per language
  const defaultSuggestionsMap: Record<SupportedLanguage, string[]> = {
    pt: [
      'O que é Habeas Corpus?',
      'Diferença de SN1 e SN2?',
      'Heurísticas de Nielsen',
      'Explique o Artigo 5º da CF',
      'Como funciona a fotossíntese?',
    ],
    en: [
      'What is Habeas Corpus?',
      'Difference between SN1 and SN2?',
      'Nielsen Usability Heuristics',
      'Explain the First Amendment',
      'How does photosynthesis work?',
    ],
    es: [
      '¿Qué es el Habeas Corpus?',
      '¿Diferencia entre SN1 y SN2?',
      'Heurísticas de Nielsen',
      'Explique el Artículo 1º de la Constitución',
      '¿Cómo funciona la fotosíntesis?',
    ],
    fr: [
      'Qu’est-ce que le Habeas Corpus ?',
      'Différence entre SN1 et SN2 ?',
      'Heuristiques de Nielsen',
      'Expliquez les Droits Fondamentaux',
      'Comment fonctionne la photosynthèse ?',
    ],
    de: [
      'Was ist Habeas Corpus?',
      'Unterschied zwischen SN1 und SN2?',
      'Nielsen Usability Heuristiken',
      'Erkläre das Grundgesetz',
      'Wie funktioniert Photosynthese?',
    ],
  };

  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>(
    defaultSuggestionsMap[currentLanguage] || defaultSuggestionsMap.pt
  );

  useEffect(() => {
    setDynamicSuggestions(defaultSuggestionsMap[currentLanguage] || defaultSuggestionsMap.pt);
  }, [currentLanguage]);

  const recognitionRef = useRef<any>(null);
  const handsFreeSilenceTimerRef = useRef<any>(null);
  const isHandsFreeRef = useRef(isHandsFreeMode);
  isHandsFreeRef.current = isHandsFreeMode;

  const handleStopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Generate follow-up suggestions based on response or user query
  const generateFollowUpSuggestions = (query: string, answer?: string) => {
    const qLower = query.toLowerCase();
    const suggestions: string[] = [];

    if (qLower.includes('habeas corpus') || qLower.includes('artigo') || qLower.includes('direito') || qLower.includes('lei')) {
      suggestions.push('Pode me dar um caso prático?');
      suggestions.push('Como isso é cobrado na prova da OAB?');
      suggestions.push('Quais são os principais prazos?');
      suggestions.push('Resuma a regra em uma frase simples');
    } else if (qLower.includes('química') || qLower.includes('sn1') || qLower.includes('molécula') || qLower.includes('reação')) {
      suggestions.push('Qual é o mecanismo passo a passo?');
      suggestions.push('Quais fatores aceleram essa reação?');
      suggestions.push('Crie uma questão de fixação');
      suggestions.push('Exemplo do cotidiano');
    } else if (qLower.includes('nielsen') || qLower.includes('design') || qLower.includes('ux') || qLower.includes('interface')) {
      suggestions.push('Dê exemplos de violação dessa heurística');
      suggestions.push('Como aplicar isso no mobile?');
      suggestions.push('Pergunte para testar meu conhecimento');
    } else {
      suggestions.push('Me dê um exemplo do mundo real');
      suggestions.push('Explique como se eu tivesse 10 anos');
      suggestions.push('Como isso cai no ENEM/Concurso?');
      suggestions.push('Crie um flashcard de revisão');
    }

    setDynamicSuggestions(suggestions);
  };

  useEffect(() => {
    // Check SpeechRecognition browser capability
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = activeLocale;

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        if (transcript.trim()) {
          setInputQuery(transcript);

          // Voice Command shortcuts detected live
          const lower = transcript.toLowerCase().trim();
          if (lower.includes('parar áudio') || lower.includes('cale a boca') || lower.includes('silêncio')) {
            handleStopAudio();
          }

          // Hands-Free silence auto-send trigger (auto submits after 1.8s of speech pause)
          if (isHandsFreeRef.current) {
            if (handsFreeSilenceTimerRef.current) clearTimeout(handsFreeSilenceTimerRef.current);
            handsFreeSilenceTimerRef.current = setTimeout(() => {
              if (transcript.trim() && !isThinking && !isSpeaking) {
                handleSendVoiceQuery(transcript);
              }
            }, 1800);
          }
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        // If in hands-free mode and not currently speaking answer or thinking, restart listening!
        if (isHandsFreeRef.current && !isSpeaking && !isThinking) {
          setTimeout(() => {
            try {
              recognition.start();
              setIsListening(true);
            } catch {
              // ignore
            }
          }, 300);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (handsFreeSilenceTimerRef.current) clearTimeout(handsFreeSilenceTimerRef.current);
    };
  }, [currentLanguage, activeLocale]);

  const toggleListening = () => {
    if (isListening) {
      if (handsFreeSilenceTimerRef.current) clearTimeout(handsFreeSilenceTimerRef.current);
      if (isHandsFreeMode) {
        setIsHandsFreeMode(false);
        isHandsFreeRef.current = false;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
    } else {
      setInputQuery('');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch {
          setIsListening(false);
        }
      } else {
        setIsListening(true);
      }
    }
  };

  const toggleHandsFreeMode = () => {
    const nextState = !isHandsFreeMode;
    setIsHandsFreeMode(nextState);
    isHandsFreeRef.current = nextState;

    if (nextState) {
      if (!isListening && recognitionRef.current) {
        try {
          setInputQuery('');
          recognitionRef.current.start();
          setIsListening(true);
        } catch {
          setIsListening(false);
        }
      }
    } else {
      if (handsFreeSilenceTimerRef.current) clearTimeout(handsFreeSilenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
    }
  };

  const handleSendVoiceQuery = async (queryText?: string) => {
    const query = queryText || inputQuery;
    if (!query.trim()) return;

    if (handsFreeSilenceTimerRef.current) clearTimeout(handsFreeSilenceTimerRef.current);

    // Special voice command checks before sending to Gemini
    const lowerQuery = query.toLowerCase().trim();
    if (lowerQuery.includes('limpar conversa') || lowerQuery.includes('reiniciar voz')) {
      setCurrentAiAnswer(null);
      setSuggestedCard(null);
      setInputQuery('');
      return;
    }
    if (lowerQuery.includes('salvar card') || lowerQuery.includes('salvar flashcard')) {
      if (suggestedCard && selectedDeckId) {
        handleSaveSuggestedCard();
      }
      setInputQuery('');
      return;
    }

    if (!stats.isPro && (stats.aiCredits || 0) <= 0) {
      onOpenAdMob();
      return;
    }

    if (isListening && recognitionRef.current && !isHandsFreeMode) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }

    setIsThinking(true);
    setCurrentAiAnswer(null);
    setSuggestedCard(null);
    setIsAddedSuccess(false);

    try {
      const res = await apiVoiceTutor(query, 'Geral', currentLanguage);
      if (!stats.isPro) {
        onDeductCredit(1);
      }
      setCurrentAiAnswer(res.answer);

      if (res.suggestedFlashcard) {
        setSuggestedCard(res.suggestedFlashcard);
      }

      // Generate context-aware follow-up suggestions
      generateFollowUpSuggestions(query, res.answer);

      // Voice output synthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(true);

        const utterance = new SpeechSynthesisUtterance(res.answer);
        utterance.lang = activeLocale;
        utterance.rate = settings.speechSpeed || 1.1;
        utterance.pitch = settings.speechPitch || 1.0;

        if (settings.selectedVoiceURI) {
          const voices = window.speechSynthesis.getVoices();
          const matched = voices.find((v) => v.voiceURI === settings.selectedVoiceURI);
          if (matched) utterance.voice = matched;
        }

        utterance.onend = () => {
          setIsSpeaking(false);
          // If in hands-free mode, resume auto-listening!
          if (isHandsFreeRef.current && recognitionRef.current) {
            setInputQuery('');
            try {
              recognitionRef.current.start();
              setIsListening(true);
            } catch {}
          }
        };

        utterance.onerror = () => {
          setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
      }

      // Update history list
      const newItem: VoiceHistoryItem = {
        id: `vh-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        userMessage: query,
        aiResponse: res.answer,
        voicePersona: 'Nova Voice AI',
        status: 'success',
        suggestedCard: res.suggestedFlashcard,
      };

      onSaveHistory([newItem, ...history]);
      setInputQuery('');
    } catch (err: any) {
      const errorItem: VoiceHistoryItem = {
        id: `vh-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        userMessage: query,
        aiResponse: 'Não foi possível processar a dúvida por voz. Verifique sua conexão.',
        voicePersona: 'Nova Voice AI',
        status: 'error',
      };
      onSaveHistory([errorItem, ...history]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSaveSuggestedCard = () => {
    if (!suggestedCard || !selectedDeckId) return;
    onAddCardToDeck(selectedDeckId, suggestedCard);
    setIsAddedSuccess(true);
    setTimeout(() => setIsAddedSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 animate-fade-in">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Mic className="w-5 h-5 text-[#60a5fa]" /> {t.voiceTitle}
          </h2>
          <p className="text-xs text-[#8c91a0]">
            {t.voiceSub}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCommandsGuide(!showCommandsGuide)}
            className="px-3 py-1.5 rounded-xl bg-[#122131] hover:bg-[#1c2b3c] text-[#adc6ff] text-xs font-medium flex items-center gap-1.5 border border-[#adc6ff]/20 transition-all cursor-pointer"
          >
            <Command className="w-4 h-4 text-emerald-400" /> {t.voiceCommands}
          </button>

          <button
            id="btn-open-voice-settings"
            onClick={onOpenVoiceSettings}
            className="px-3 py-1.5 rounded-xl bg-[#122131] hover:bg-[#1c2b3c] text-[#adc6ff] text-xs font-medium flex items-center gap-1.5 border border-[#adc6ff]/20 transition-all cursor-pointer"
          >
            <Settings2 className="w-4 h-4" /> {t.voiceSettings}
          </button>
        </div>
      </div>

      {/* Voice Commands Instructions Modal / Panel */}
      {showCommandsGuide && (
        <div className="p-5 rounded-2xl bg-[#0b1a2a] border border-emerald-500/30 text-white space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#424754]/30 pb-2">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
              <Zap className="w-4 h-4" /> {t.voiceCommands}
            </div>
            <button
              onClick={() => setShowCommandsGuide(false)}
              className="text-xs text-[#8c91a0] hover:text-white cursor-pointer"
            >
              {t.close} ✕
            </button>
          </div>

          <p className="text-xs text-slate-300">
            {t.handsFreeInactive}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[#122131] border border-[#424754]/20">
              <strong className="text-[#60a5fa]">"Explicar mais simples"</strong>
              <div className="text-[11px] text-[#8c91a0]">Reescreve o assunto com linguagem didática fácil.</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#122131] border border-[#424754]/20">
              <strong className="text-[#60a5fa]">"Me dê um exemplo prático"</strong>
              <div className="text-[11px] text-[#8c91a0]">Traz aplicação real do conceito.</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#122131] border border-[#424754]/20">
              <strong className="text-[#60a5fa]">"Salvar flashcard"</strong>
              <div className="text-[11px] text-[#8c91a0]">Salva o card gerado diretamente no deck ativo.</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#122131] border border-[#424754]/20">
              <strong className="text-[#60a5fa]">"Parar áudio" / "Silêncio"</strong>
              <div className="text-[11px] text-[#8c91a0]">Interrompe a síntese de voz na hora.</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Waveform / Listening Display Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[#adc6ff]/20 text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#3b82f6]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Hands-Free Mode Banner Toggle */}
        <div
          onClick={toggleHandsFreeMode}
          className={`flex items-center justify-between p-3.5 rounded-2xl max-w-lg mx-auto cursor-pointer transition-all border ${
            isHandsFreeMode
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
              : 'bg-[#0b1a2a]/80 border-[#424754]/40 hover:border-[#adc6ff]/30'
          }`}
        >
          <div className="flex items-center gap-2.5 text-left">
            <div
              className={`p-2 rounded-xl transition-colors ${
                isHandsFreeMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Radio className={`w-5 h-5 ${isHandsFreeMode ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                {t.handsFreeMode}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold transition-all border ${
                    isHandsFreeMode
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {isHandsFreeMode ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="text-[11px] text-[#8c91a0]">
                {isHandsFreeMode ? t.handsFreeActive : t.handsFreeInactive}
              </div>
            </div>
          </div>

          <div
            className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${
              isHandsFreeMode ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
                isHandsFreeMode ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </div>
        </div>

        {/* Waveform Visualizer */}
        <div className="h-16 flex items-center justify-center gap-1.5 my-2">
          {[40, 75, 30, 90, 100, 60, 85, 45, 95, 50, 80, 35].map((h, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-300 ${
                isListening
                  ? 'bg-gradient-to-t from-[#3b82f6] to-[#60a5fa] waveform-bar'
                  : isSpeaking
                  ? 'bg-gradient-to-t from-emerald-500 to-teal-400 waveform-bar'
                  : 'bg-slate-700 h-2'
              }`}
              style={{
                height: isListening ? `${h}%` : isSpeaking ? `${h * 0.8}%` : '8px',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>

        {/* Status indicator */}
        <div className="text-sm font-semibold text-white">
          {isSpeaking ? (
            <span className="text-emerald-400 flex items-center justify-center gap-2">
              <Volume2 className="w-4 h-4 animate-bounce" /> {t.speaking}
            </span>
          ) : isListening ? (
            <span className="text-[#60a5fa] animate-pulse">
              {t.listening}
            </span>
          ) : isThinking ? (
            <span className="text-amber-400 animate-pulse">{t.thinking}</span>
          ) : (
            <span className="text-slate-300">{t.tapMic}</span>
          )}
        </div>

        {/* Mic Toggle Button */}
        <div className="flex justify-center items-center gap-3">
          <button
            id="btn-toggle-mic"
            onClick={toggleListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xl ${
              isListening
                ? 'bg-red-500 text-white shadow-red-500/50 scale-110 animate-pulse'
                : 'bg-gradient-to-tr from-[#3b82f6] to-[#60a5fa] text-white shadow-blue-500/30 hover:scale-105'
            }`}
          >
            {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </button>

          {isSpeaking && (
            <button
              onClick={handleStopAudio}
              className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
              title="Parar de Falar"
            >
              <VolumeX className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Manual Text Fallback Query Input */}
        <div className="pt-2 max-w-md mx-auto flex items-center gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendVoiceQuery()}
            placeholder="Ou digite sua pergunta de estudo aqui..."
            className="flex-1 bg-[#0b1a2a] border border-[#424754]/40 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#adc6ff]"
          />
          <button
            id="btn-send-voice-query"
            onClick={() => handleSendVoiceQuery()}
            disabled={isThinking || !inputQuery.trim()}
            className="p-2.5 rounded-xl bg-[#4d8eff] hover:bg-[#3b82f6] text-white transition-all disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Context-Aware Quick Questions */}
        <div className="space-y-2 pt-2 border-t border-[#424754]/20">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#adc6ff]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Sugestões de Perguntas do Tópico:
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
            {dynamicSuggestions.map((sample, i) => (
              <button
                key={i}
                onClick={() => {
                  setInputQuery(sample);
                  handleSendVoiceQuery(sample);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#122131] hover:bg-[#1c2b3c] text-[#adc6ff] border border-[#adc6ff]/20 hover:border-[#adc6ff]/50 transition-all cursor-pointer font-medium text-left shadow-sm"
              >
                "{sample}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Answer Display & Flashcard Generator Result */}
      {currentAiAnswer && (
        <div className="glass-card rounded-2xl p-6 border border-[#60a5fa]/40 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#424754]/20 pb-3">
            <span className="text-xs font-bold text-[#60a5fa] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Resposta do Tutor Voice IA
            </span>
            <button
              onClick={() => {
                if ('speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                  setIsSpeaking(true);
                  const u = new SpeechSynthesisUtterance(currentAiAnswer);
                  u.lang = settings.language === 'pt' ? 'pt-BR' : settings.language === 'en' ? 'en-US' : settings.language;
                  u.rate = settings.speechSpeed || 1.1;
                  u.pitch = settings.speechPitch || 1.0;
                  if (settings.selectedVoiceURI) {
                    const voices = window.speechSynthesis.getVoices();
                    const matched = voices.find((v) => v.voiceURI === settings.selectedVoiceURI);
                    if (matched) u.voice = matched;
                  }
                  u.onend = () => setIsSpeaking(false);
                  u.onerror = () => setIsSpeaking(false);
                  window.speechSynthesis.speak(u);
                }
              }}
              className="p-1.5 rounded-lg bg-[#122131] text-[#adc6ff] hover:text-white cursor-pointer"
              title="Ouvir resposta novamente"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-slate-100 leading-relaxed font-medium">
            {currentAiAnswer}
          </p>

          {suggestedCard && (
            <div className="p-4 rounded-xl bg-[#0b1a2a] border border-[#adc6ff]/20 space-y-3 pt-3">
              <div className="text-xs font-bold text-[#adc6ff] flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-[#60a5fa]" /> Flashcard Sugerido Automaticamente
              </div>

              <div className="text-xs text-slate-200 bg-[#122131] p-3 rounded-lg border border-[#424754]/20 space-y-1">
                <div>
                  <strong className="text-[#8c91a0]">Frente:</strong> {suggestedCard.front}
                </div>
                <div>
                  <strong className="text-[#8c91a0]">Verso:</strong> {suggestedCard.back}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <select
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  className="w-full sm:w-auto bg-[#122131] border border-[#424754]/40 text-xs text-white rounded-lg px-3 py-1.5"
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      Salvar em: {d.title}
                    </option>
                  ))}
                </select>

                <button
                  id="btn-save-voice-card"
                  onClick={handleSaveSuggestedCard}
                  className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" /> Salvar Card no Deck
                </button>
              </div>

              {isAddedSuccess && (
                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Adicionado com sucesso ao seu deck!
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Voice History Log */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#8c91a0]" /> Histórico de Consultas por Voz
        </h3>

        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-[#0b1a2a]/60 border border-[#424754]/30 space-y-2"
            >
              <div className="flex items-center justify-between text-[11px] text-[#8c91a0]">
                <span>{item.timestamp} • {item.voicePersona}</span>
                {item.status === 'success' ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Concluído
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Falha
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-white">"{item.userMessage}"</div>
              <div className="text-xs text-[#8c91a0] line-clamp-2">{item.aiResponse}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

