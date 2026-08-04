import React, { useState } from 'react';
import {
  BookOpen,
  Camera,
  Sparkles,
  Brain,
  BarChart3,
  Layers,
  Send,
  CheckCircle2,
  HelpCircle,
  MessageSquareHeart,
  Lightbulb,
} from 'lucide-react';
import { translations, SupportedLanguage } from '../lib/i18n';

// ============================================================================
// Ajuda — explicações do sistema + envio de feedback.
// O feedback é enviado para o endpoint /api/log (type: 'feedback') e agora é
// persistido no Firestore (ver server.ts) em vez de só logado no terminal.
//
// BUG CORRIGIDO: este componente recebia `currentLanguage` mas o ignorava
// por completo — era a única aba do app que ficava presa em português mesmo
// com o resto totalmente traduzido (PT/EN/ES/FR/DE via src/lib/i18n.ts).
// Agora todo o conteúdo (seções de ajuda + formulário de feedback) vem do
// dicionário de traduções, como as demais telas.
// ============================================================================

// Cada seção referencia um ícone fixo + a chave em `translations.<lang>.help.sections`
// correspondente. O conteúdo (título/descrição/itens) é 100% localizado.
const SECTION_ICONS: { id: 'study' | 'cards' | 'scanner' | 'stats' | 'ai' | 'credits'; icon: React.ReactNode }[] = [
  { id: 'study', icon: <BookOpen className="w-5 h-5 text-indigo-400" /> },
  { id: 'cards', icon: <Layers className="w-5 h-5 text-blue-400" /> },
  { id: 'scanner', icon: <Camera className="w-5 h-5 text-purple-400" /> },
  { id: 'stats', icon: <BarChart3 className="w-5 h-5 text-emerald-400" /> },
  { id: 'ai', icon: <Brain className="w-5 h-5 text-rose-400" /> },
  { id: 'credits', icon: <Sparkles className="w-5 h-5 text-amber-400" /> },
];

const FEEDBACK_TYPE_IDS = ['bug', 'suggestion', 'praise', 'other'] as const;

export const HelpView: React.FC<{ currentLanguage?: string }> = ({ currentLanguage }) => {
  const lang: SupportedLanguage = (currentLanguage as SupportedLanguage) || 'pt';
  const t = (translations[lang] || translations.pt).help;

  const FEEDBACK_TYPES = FEEDBACK_TYPE_IDS.map((id) => ({
    id,
    label:
      id === 'bug'
        ? t.feedback.typeBug
        : id === 'suggestion'
        ? t.feedback.typeSuggestion
        : id === 'praise'
        ? t.feedback.typePraise
        : t.feedback.typeOther,
  }));
  const [feedbackType, setFeedbackType] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validação simples de e-mail — o campo é opcional, mas se preenchido,
  // deve ao menos ter o formato de um e-mail (evita "contatos" inúteis
  // como "nao sei" ou "-" que impedem qualquer retorno ao usuário).
  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    setError(null);

    if (!trimmedMessage) {
      setError(t.feedback.errorEmpty);
      return;
    }
    if (trimmedMessage.length < 5) {
      setError(t.feedback.errorShort);
      return;
    }
    if (contact.trim() && !isValidEmail(contact)) {
      setError(t.feedback.errorEmail);
      return;
    }

    setSending(true);
    try {
      // Reutiliza o endpoint /api/log — tipo 'feedback'. O backend agora
      // persiste isso de verdade (ver server.ts) em vez de só logar.
      const response = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'feedback',
          ts: new Date().toISOString(),
          message: `[Feedback ${feedbackType}] ${trimmedMessage}` + (contact.trim() ? ` — contato: ${contact.trim()}` : ''),
          url: window.location.href,
        }),
        keepalive: true,
      });

      // BUG CORRIGIDO: antes, qualquer falha de rede/servidor ainda mostrava
      // "Feedback enviado!" para o usuário — a mensagem digitada era
      // descartada e o feedback se perdia silenciosamente, sem chance de o
      // usuário tentar de novo. Agora só confirmamos sucesso quando o
      // servidor de fato confirma (`ok: true`), e mantemos o texto digitado
      // no campo em caso de erro, para o usuário só reenviar.
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || 'Não foi possível enviar. Tente novamente.');
      }

      setSent(true);
      setMessage('');
      setContact('');
    } catch (err) {
      setError(
        err instanceof Error && err.message ? err.message : t.feedback.errorGeneric
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Cabeçalho */}
      <div className="text-center space-y-1 pt-1">
        <div className="flex items-center justify-center gap-2 text-2xl font-extrabold">
          <HelpCircle className="w-7 h-7 text-indigo-500" /> {t.title}
        </div>
        <p className="text-xs text-[#8c91a0]">{t.subtitle}</p>
      </div>

      {/* Explicações do sistema */}
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTION_ICONS.map(({ id, icon }) => {
          const sec = t.sections[id];
          return (
            <div key={id} className="glass-card rounded-2xl p-5 border border-[#424754]/20 space-y-2">
              <div className="flex items-center gap-2">
                {icon}
                <h3 className="text-sm font-extrabold">{sec.title}</h3>
              </div>
              <p className="text-xs text-[#8c91a0] leading-relaxed">{sec.description}</p>
              <ul className="space-y-1.5 pt-1">
                {sec.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-[#8c91a0]">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Feedback */}
      <div className="glass-card rounded-2xl p-5 border border-[#adc6ff]/30 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquareHeart className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-extrabold">{t.feedback.heading}</h3>
        </div>
        <p className="text-[11px] text-[#8c91a0]">{t.feedback.intro}</p>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <div className="text-sm font-bold text-emerald-400">{t.feedback.sentTitle}</div>
            <p className="text-[11px] text-[#8c91a0]">{t.feedback.sentBody}</p>
            <button
              onClick={() => setSent(false)}
              className="px-4 py-2 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs font-bold hover:bg-indigo-500/25 transition cursor-pointer"
            >
              {t.feedback.sendAnother}
            </button>
          </div>
        ) : (
          <form onSubmit={submitFeedback} className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_TYPES.map((ft) => (
                <button
                  key={ft.id}
                  type="button"
                  onClick={() => setFeedbackType(ft.id)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-bold transition cursor-pointer border ${
                    feedbackType === ft.id
                      ? 'bg-indigo-500 text-white border-indigo-500'
                      : 'bg-[#122131] text-[#8c91a0] border-[#424754]/40 hover:text-white'
                  }`}
                >
                  {ft.label}
                </button>
              ))}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.feedback.placeholder}
              rows={4}
              className="w-full bg-[#122131] border border-[#424754]/40 rounded-xl px-4 py-3 text-sm text-white placeholder-[#8c91a0] focus:outline-none focus:border-indigo-500 transition resize-none"
            />
            {error && (
              <p className="text-[11px] text-rose-400 font-medium">{error}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={t.feedback.contactPlaceholder}
                className="flex-1 bg-[#122131] border border-[#424754]/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#8c91a0] focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-40 cursor-pointer"
              >
                {sending ? <Lightbulb className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
                {t.feedback.send}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default HelpView;
