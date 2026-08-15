import React, { useState } from 'react';
import {
  BookOpen,
  Camera,
  Brain,
  BarChart3,
  Layers,
  Send,
  CheckCircle2,
  HelpCircle,
  MessageSquareHeart,
  Lightbulb,
} from 'lucide-react';

interface HelpSection {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: string[];
}

const SECTIONS: HelpSection[] = [
  {
    icon: <BookOpen className="w-5 h-5 text-indigo-400" />,
    title: 'Estudar',
    description: 'Sua área de estudo com Repetição Espaçada (SRS/SM-2). Cada card é revisado no momento certo para fixar o conteúdo na memória de longo prazo.',
    items: [
      'A Home mostra os decks e os cards pendentes de revisão.',
      'Toque em "Estudar" para iniciar uma sessão de flashcards.',
      'Avalie cada card como Difícil / Bom / Fácil — o algoritmo ajusta os intervalos.',
      'Quanto mais você estuda, maior sua sequência (streak) e dominância.',
    ],
  },
  {
    icon: <Layers className="w-5 h-5 text-blue-400" />,
    title: 'Cards',
    description: 'O gerador inteligente de flashcards. Digite uma matéria e a IA cria cards completos com explicações e exemplos práticos.',
    items: [
      'Digite a matéria (ex.: Direito Penal, Biologia, Python).',
      'Selecione os tópicos e a quantidade de cards.',
      'Cada card gerado inclui pergunta, resposta, explicação e curiosidade.',
      'Você também pode criar cards manualmente com o botão "Criar Card".',
    ],
  },
  {
    icon: <Camera className="w-5 h-5 text-purple-400" />,
    title: 'Scanner & Upload',
    description: 'Tire uma foto da página ou envie um PDF/imagem. O app extrai o texto (OCR) e transforma em flashcards automaticamente.',
    items: [
      'Toque em "Tirar Foto da Página" ou envie um arquivo.',
      'A IA extrai o conteúdo das imagens e monta os cards.',
      'Confira o texto extraído antes de gerar o deck.',
    ],
  },
  {
    icon: <BarChart3 className="w-5 h-5 text-emerald-400" />,
    title: 'Estatísticas',
    description: 'Acompanhe seu desempenho: streak, cards dominados, horas estudadas, retenção e histórico de atividade.',
    items: [
      'Veja sua sequência de dias e a meta diária de estudo.',
      'O heatmap mostra sua constância ao longo do tempo.',
      'Acompanhe o percentual de dominância de cada deck.',
    ],
  },
  {
    icon: <Brain className="w-5 h-5 text-rose-400" />,
    title: 'Inteligência Artificial',
    description: 'O MemoriaFlash usa IA para gerar flashcards, explicações com exemplos, sugestões de tópicos e análise do seu desempenho.',
    items: [
      'A IA gera cards completos com pergunta, resposta, explicação e curiosidade.',
      'Durante o estudo, use "Explicar Pergunta & Ver Exemplo" para ver o conteúdo didático.',
      'As sugestões de tópicos ajudam a detalhar melhor o assunto antes de gerar.',
    ],
  },
];

const FEEDBACK_TYPES = [
  { id: 'bug', label: '🐞 Relatar um problema' },
  { id: 'suggestion', label: '💡 Sugerir uma melhoria' },
  { id: 'praise', label: '❤️ Elogio' },
  { id: 'other', label: '✉️ Outro' },
];

export const HelpView: React.FC<{ currentLanguage?: string }> = () => {
  const [feedbackType, setFeedbackType] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState(false);

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setSendError(false);
    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'feedback',
          ts: new Date().toISOString(),
          message: `[Feedback ${feedbackType}] ${message.trim()}` + (contact.trim() ? ` — contato: ${contact.trim()}` : ''),
          url: window.location.href,
        }),
        keepalive: true,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => null);
      if (data && data.ok === false) throw new Error('server reported failure');
      setSent(true);
      setMessage('');
      setContact('');
    } catch {
      setSendError(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="text-center space-y-1 pt-1">
        <div className="flex items-center justify-center gap-2 text-2xl font-extrabold">
          <HelpCircle className="w-7 h-7 text-indigo-500" /> Ajuda
        </div>
        <p className="text-xs text-[#8c91a0]">Como usar o MemoriaFlash e envie seu feedback.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((sec) => (
          <div key={sec.title} className="glass-card rounded-2xl p-5 border border-[#424754]/20 space-y-2">
            <div className="flex items-center gap-2">
              {sec.icon}
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
        ))}
      </div>

      <div className="glass-card rounded-2xl p-5 border border-[#adc6ff]/30 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquareHeart className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-extrabold">Envie seu feedback</h3>
        </div>
        <p className="text-[11px] text-[#8c91a0]">Encontrou um problema ou quer sugerir uma melhoria? Conte pra gente. Sua opinião chega diretamente aos desenvolvedores.</p>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <div className="text-sm font-bold text-emerald-400">Feedback enviado!</div>
            <p className="text-[11px] text-[#8c91a0]">Obrigado por ajudar a melhorar o MemoriaFlash. 💜</p>
            <button onClick={() => setSent(false)} className="px-4 py-2 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs font-bold hover:bg-indigo-500/25 transition cursor-pointer">Enviar outro feedback</button>
          </div>
        ) : (
          <form onSubmit={submitFeedback} className="space-y-3">
            {sendError && <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300"><span>⚠️ Não foi possível enviar. Verifique sua conexão e tente novamente — seu texto foi mantido.</span></div>}
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_TYPES.map((ft) => (
                <button key={ft.id} type="button" onClick={() => setFeedbackType(ft.id)} className={`px-3 py-2 rounded-xl text-[11px] font-bold transition cursor-pointer border ${feedbackType === ft.id ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-[#122131] text-[#8c91a0] border-[#424754]/40 hover:text-white'}`}>{ft.label}</button>
              ))}
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Descreva seu feedback, problema ou sugestão..." rows={4} className="w-full bg-[#122131] border border-[#424754]/40 rounded-xl px-4 py-3 text-sm text-white placeholder-[#8c91a0] focus:outline-none focus:border-indigo-500 transition resize-none" />
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Seu e-mail (opcional — para retornarmos)" className="flex-1 bg-[#122131] border border-[#424754]/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#8c91a0] focus:outline-none focus:border-indigo-500 transition" />
              <button type="submit" disabled={sending || !message.trim()} className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-40 cursor-pointer">
                {sending ? <Lightbulb className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
                Enviar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default HelpView;
