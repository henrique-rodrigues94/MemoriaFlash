import React, { useState } from 'react';
import { CheckCircle2, FileText, LockKeyhole, ShieldCheck, Loader2, ExternalLink } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../lib/firebase';

const LEGAL_VERSION = '2026-08-16';
const LEGAL_KEY = `memoriaflash_legal_acceptance_${LEGAL_VERSION}`;

export function hasAcceptedLegal(): boolean {
  try {
    return localStorage.getItem(LEGAL_KEY) === 'accepted';
  } catch {
    return false;
  }
}

interface EntryGateProps {
  onAuthenticated: () => void;
}

export const EntryGate: React.FC<EntryGateProps> = ({ onAuthenticated }) => {
  const [accepted, setAccepted] = useState(hasAcceptedLegal());
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAcceptAndContinue = async () => {
    if (!accepted) return;
    setError(null);
    try {
      localStorage.setItem(LEGAL_KEY, 'accepted');
    } catch {
      setError('Não foi possível salvar sua confirmação. Verifique as permissões de armazenamento do aplicativo.');
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!result.user || result.user.isAnonymous) throw new Error('O login precisa ser feito com uma conta Google.');
      onAuthenticated();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível entrar com o Google. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#061322] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-blue-400/20 bg-[#0b1a2a] shadow-2xl overflow-hidden">
        <div className="px-6 pt-8 pb-6 text-center bg-gradient-to-br from-[#0d2742] to-[#0b1a2a]">
          <div className="mx-auto mb-4 w-20 h-20 rounded-[24px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-4xl font-black">M</span>
          </div>
          <h1 className="text-2xl font-black">MemoriaFlash</h1>
          <p className="mt-2 text-sm text-slate-300">Seu espaço de estudos com flashcards inteligentes.</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex gap-3">
              <LockKeyhole className="w-5 h-5 text-emerald-400 shrink-0" />
              <div><b className="text-sm">Login obrigatório</b><p className="text-xs text-slate-400 mt-1">Para proteger seus dados, sincronizar seus estudos e evitar contas duplicadas, o acesso é feito exclusivamente com o Google.</p></div>
            </div>
            <div className="flex gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
              <div><b className="text-sm">Privacidade e transparência</b><p className="text-xs text-slate-400 mt-1">Antes do primeiro acesso, você precisa ler e aceitar os Termos de Uso e a Política de Privacidade/LGPD.</p></div>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 w-5 h-5 accent-blue-500" />
            <span className="text-xs leading-relaxed text-slate-300">Li e concordo com os <button type="button" onClick={() => setShowTerms(true)} className="text-blue-400 underline font-bold">Termos de Uso</button> e com a <button type="button" onClick={() => setShowPrivacy(true)} className="text-blue-400 underline font-bold">Política de Privacidade (LGPD)</button> do MemoriaFlash.</span>
          </label>

          {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</div>}

          <button type="button" onClick={handleAcceptAndContinue} disabled={!accepted || loading} className="w-full py-3.5 rounded-2xl bg-white text-slate-900 font-extrabold text-sm flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-all">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin text-blue-600" /> Entrando...</> : <><span className="text-lg font-black">G</span> Continuar com Google</>}
          </button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500"><CheckCircle2 className="w-3.5 h-3.5" /> Acesso seguro pelo Firebase Authentication</div>
        </div>
      </div>

      {(showTerms || showPrivacy) && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-[#0b1a2a] border border-slate-700 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5"><div className="flex items-center gap-2"><FileText className="w-5 h-5 text-blue-400" /><h2 className="text-lg font-black">{showTerms ? 'Termos de Uso' : 'Política de Privacidade e LGPD'}</h2></div><button onClick={() => { setShowTerms(false); setShowPrivacy(false); }} className="text-slate-400 hover:text-white">Fechar</button></div>
            {showTerms ? <TermsContent /> : <PrivacyContent />}
            <div className="mt-6 pt-4 border-t border-slate-700 text-xs text-slate-500">Versão jurídica exibida no primeiro acesso: {LEGAL_VERSION}. <span className="inline-flex items-center gap-1 ml-1"><ExternalLink className="w-3 h-3" /> Documento versionado no projeto.</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

function TermsContent() {
  return <div className="space-y-4 text-sm text-slate-300 leading-relaxed"><p><b>1. Serviço.</b> O MemoriaFlash é uma plataforma de estudos com flashcards, repetição espaçada e recursos de geração assistida por IA.</p><p><b>2. Conta.</b> O acesso exige uma conta Google. Você é responsável pelo uso da sua conta e pelos conteúdos enviados ao aplicativo.</p><p><b>3. IA.</b> Conteúdos gerados por IA podem conter erros. Sempre confira informações antes de utilizá-las em provas, concursos ou decisões importantes.</p><p><b>4. Uso adequado.</b> É proibido tentar fraudar limites, anúncios, indicações, assinaturas ou sistemas de segurança, bem como utilizar o serviço para atividades ilícitas.</p><p><b>5. Anúncios e planos.</b> O plano gratuito pode exibir anúncios. Planos pagos seguem as condições apresentadas no aplicativo e nas regras da loja.</p><p><b>6. Disponibilidade.</b> O serviço depende de infraestrutura própria e de terceiros, incluindo Firebase, provedores de IA e redes de anúncios. Podem ocorrer indisponibilidades.</p><p><b>7. Conteúdo do usuário.</b> Seus decks e materiais enviados permanecem sob seu controle, respeitados os tratamentos necessários para prestar o serviço e as obrigações legais.</p><p><b>8. Exclusão.</b> Você pode solicitar a exclusão da conta e dos dados pelos mecanismos disponibilizados no aplicativo.</p><p><b>9. Alterações.</b> Estes termos podem ser atualizados. Alterações relevantes serão comunicadas no aplicativo quando aplicável.</p><p><b>10. Legislação.</b> Aplicam-se as leis brasileiras, observados os direitos previstos na legislação de defesa do consumidor e na LGPD.</p></div>;
}

function PrivacyContent() {
  return <div className="space-y-4 text-sm text-slate-300 leading-relaxed"><p><b>Controlador.</b> As informações de identificação e contato do controlador devem ser mantidas atualizadas na versão pública da política antes da publicação comercial.</p><p><b>Dados tratados.</b> Para o funcionamento da conta, o MemoriaFlash pode tratar nome, e-mail, foto de perfil, identificador do Firebase, decks, flashcards, progresso, preferências e informações técnicas necessárias ao serviço.</p><p><b>Finalidades.</b> Usamos esses dados para autenticação, sincronização, funcionamento dos estudos, segurança, prevenção a fraude, suporte e, quando permitido, publicidade.</p><p><b>IA e terceiros.</b> Conteúdo educacional enviado para geração pode ser processado por provedores de IA configurados pelo serviço. Não envie informações pessoais desnecessárias em prompts ou documentos.</p><p><b>Publicidade.</b> O plano gratuito pode utilizar Google AdMob. As preferências de anúncios devem respeitar o consentimento e as opções de anúncios personalizados/não personalizados.</p><p><b>Direitos LGPD.</b> Você pode solicitar confirmação, acesso, correção, eliminação, portabilidade e informações sobre o tratamento de seus dados, além de revogar consentimentos quando aplicável.</p><p><b>Segurança.</b> Adotamos autenticação Firebase, regras de acesso e controles no servidor para reduzir acesso indevido, sem prometer segurança absoluta.</p><p><b>Exclusão.</b> A exclusão da conta remove os dados do usuário conforme os procedimentos e prazos descritos na política completa de privacidade.</p><p><b>Contato.</b> O canal oficial de privacidade deverá ser preenchido com o e-mail real do controlador antes da publicação na Play Store.</p></div>;
}
