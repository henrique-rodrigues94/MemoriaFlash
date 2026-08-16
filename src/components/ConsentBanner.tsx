import React, { useEffect, useState } from 'react';
import { ShieldCheck, Brain, Check, Loader2 } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, onAuthStateChanged } from '../lib/firebase';

const CONSENT_KEY = 'flashmind_consent_v1';
const LEGAL_VERSION = '2026-08-16';
const LEGAL_KEY = `memoriaflash_legal_acceptance_${LEGAL_VERSION}`;

export interface ConsentPrefs {
  essential: true;
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

function hasLegalAcceptance(): boolean {
  try { return localStorage.getItem(LEGAL_KEY) === 'accepted'; } catch { return false; }
}

/**
 * Porta de entrada obrigatória: primeiro consentimento/legal, depois Google.
 * O usuário nunca entra no aplicativo com conta anônima/guest.
 */
export const ConsentBanner: React.FC<{ onOpenPrivacyPolicy?: () => void }> = ({ onOpenPrivacyPolicy }) => {
  const [visible, setVisible] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [personalizedAds, setPersonalizedAds] = useState(true);
  const [legalAccepted, setLegalAccepted] = useState(hasLegalAcceptance());
  const [authenticated, setAuthenticated] = useState(Boolean(auth.currentUser && !auth.currentUser.isAnonymous));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthenticated(Boolean(user && !user.isAnonymous));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (getStoredConsent()) {
      const prefs = getStoredConsent()!;
      setAnalytics(prefs.analytics);
      setPersonalizedAds(prefs.personalizedAds);
    }
  }, []);

  if (!visible || authenticated) return null;

  const decide = (prefs: Omit<ConsentPrefs, 'essential' | 'decidedAt'>) => {
    saveConsent({ essential: true, decidedAt: new Date().toISOString(), ...prefs });
    setAnalytics(prefs.analytics);
    setPersonalizedAds(prefs.personalizedAds);
  };

  const handleLogin = async () => {
    if (!legalAccepted) return;
    setError(null);
    try {
      localStorage.setItem(LEGAL_KEY, 'accepted');
    } catch {
      setError('Não foi possível salvar a confirmação dos documentos legais.');
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!result.user || result.user.isAnonymous) throw new Error('É necessário entrar com uma conta Google válida.');
      setVisible(false);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível entrar com o Google. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const legalBox = (title: string, content: React.ReactNode) => (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-[#0b1a2a] border border-slate-700 text-white shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-extrabold">{title}</h2><button onClick={() => { setShowTerms(false); setShowPrivacy(false); }} className="text-xs text-slate-400 hover:text-white">Fechar</button></div>
        <div className="text-xs leading-relaxed text-slate-300 space-y-4">{content}</div>
        <div className="mt-6 pt-4 border-t border-slate-700 text-[10px] text-slate-500">Versão dos documentos: {LEGAL_VERSION}</div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md mx-auto my-8 rounded-3xl bg-[#0b1a2a] border border-[#adc6ff]/30 shadow-2xl text-white overflow-hidden">
        <div className="px-6 pt-7 pb-5 bg-gradient-to-br from-[#0e2742] to-[#122131] border-b border-[#adc6ff]/15">
          <div className="flex items-center gap-3"><div className="p-2.5 rounded-2xl bg-[#60a5fa]/15 text-[#60a5fa]"><Brain className="w-6 h-6" /></div><div><h1 className="text-lg font-extrabold">MemoriaFlash</h1><p className="text-[11px] text-[#8c91a0]">Flashcards inteligentes com IA</p></div></div>
          <div className="mt-5 flex items-start gap-3"><ShieldCheck className="w-5 h-5 text-[#adc6ff] shrink-0" /><div><h2 className="text-sm font-bold">Antes de começar</h2><p className="text-xs text-[#c2c6d6] leading-relaxed mt-1">Leia e aceite os documentos legais e depois entre exclusivamente com sua conta Google.</p></div></div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-2xl border border-slate-700 bg-[#122131] p-4 space-y-2.5">
            <button onClick={() => setShowTerms(true)} className="w-full text-left text-xs text-blue-300 underline">Termos de Uso</button>
            <button onClick={() => setShowPrivacy(true)} className="w-full text-left text-xs text-blue-300 underline">Política de Privacidade e LGPD</button>
          </div>

          <label className="flex items-start gap-3 p-4 rounded-2xl bg-[#122131] border border-[#adc6ff]/10 cursor-pointer">
            <input type="checkbox" checked={legalAccepted} onChange={(e) => setLegalAccepted(e.target.checked)} className="mt-1 w-5 h-5 accent-blue-500" />
            <span className="text-xs text-[#c2c6d6] leading-relaxed">Li e concordo com os Termos de Uso e com a Política de Privacidade/LGPD.</span>
          </label>

          {!getStoredConsent() && (
            <div className="space-y-2">
              <p className="text-[11px] text-[#8c91a0]">Você também pode escolher como usamos dados não essenciais:</p>
              <button onClick={() => setShowDetails((v) => !v)} className="text-xs text-blue-300 underline">{showDetails ? 'Ocultar opções' : 'Personalizar consentimento'}</button>
              {showDetails && <div className="space-y-2 p-3 rounded-xl bg-slate-900/40 border border-slate-700"><label className="flex justify-between text-xs text-slate-300">Analytics <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} /></label><label className="flex justify-between text-xs text-slate-300">Anúncios personalizados <input type="checkbox" checked={personalizedAds} onChange={(e) => setPersonalizedAds(e.target.checked)} /></label></div>}
              <div className="grid grid-cols-2 gap-2"><button onClick={() => decide({ analytics: true, personalizedAds: true })} className="py-2.5 rounded-xl bg-blue-600 text-xs font-bold">Aceitar tudo</button><button onClick={() => decide({ analytics: false, personalizedAds: false })} className="py-2.5 rounded-xl border border-slate-700 text-xs font-bold">Rejeitar não essenciais</button></div>
            </div>
          )}

          {getStoredConsent() && <div className="text-[11px] text-emerald-300 flex items-center gap-2"><Check className="w-4 h-4" /> Preferências de privacidade salvas.</div>}
          {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">{error}</div>}

          <button onClick={() => void handleLogin()} disabled={!legalAccepted || loading} className="w-full py-3.5 rounded-2xl bg-white text-slate-900 font-extrabold text-sm flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin text-blue-600" /> Entrando...</> : <><span className="font-black text-lg">G</span> Entrar com Google</>}
          </button>
          <p className="text-center text-[10px] text-slate-500">O aplicativo não permite acesso anônimo ou como convidado.</p>
        </div>
      </div>

      {showTerms && legalBox('Termos de Uso', <>
        <p><b>Serviço:</b> o MemoriaFlash oferece ferramentas de estudo, flashcards, repetição espaçada e geração assistida por IA.</p>
        <p><b>Conta:</b> o acesso exige uma conta Google. Você é responsável pelo uso da sua conta e pelo conteúdo enviado.</p>
        <p><b>IA:</b> conteúdos gerados podem conter erros. Confira informações antes de utilizá-las em provas, concursos ou decisões importantes.</p>
        <p><b>Uso adequado:</b> é proibido fraudar limites, anúncios, indicações, assinaturas ou mecanismos de segurança.</p>
        <p><b>Planos e anúncios:</b> o plano gratuito pode exibir anúncios; planos pagos seguem as condições mostradas no aplicativo e na loja.</p>
        <p><b>Dados:</b> decks, progresso e dados de conta são tratados para prestar o serviço e podem ser excluídos pelos mecanismos disponíveis no aplicativo.</p>
        <p><b>Legislação:</b> aplicam-se as leis brasileiras, respeitando os direitos previstos no CDC e na LGPD.</p>
      </>)}
      {showPrivacy && legalBox('Política de Privacidade e LGPD', <>
        <p><b>Dados:</b> nome, e-mail, foto, UID do Firebase, decks, flashcards, progresso, preferências e dados técnicos necessários ao funcionamento podem ser tratados.</p>
        <p><b>Finalidades:</b> autenticação, sincronização, estudo, segurança, prevenção a fraude, suporte e publicidade quando permitida.</p>
        <p><b>IA:</b> conteúdo educacional enviado para geração pode ser processado por provedores de IA configurados no serviço. Evite enviar dados pessoais desnecessários.</p>
        <p><b>AdMob:</b> o plano gratuito pode utilizar publicidade. O consentimento para anúncios personalizados pode ser recusado sem impedir o uso das funções gratuitas.</p>
        <p><b>Direitos LGPD:</b> você pode solicitar acesso, correção, eliminação, portabilidade e informações sobre o tratamento, além de revogar consentimentos quando aplicável.</p>
        <p><b>Segurança:</b> utilizamos Firebase Authentication, regras de acesso e controles de servidor para reduzir acessos indevidos.</p>
        <p><b>Controlador e contato:</b> a identificação jurídica e o e-mail oficial do controlador devem ser preenchidos na política pública antes da publicação comercial.</p>
      </>)}
    </div>
  );
};
