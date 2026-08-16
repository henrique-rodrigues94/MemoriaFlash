import React, { useState, useEffect } from 'react';
import { X, Sparkles, LogOut, CheckCircle2, ShieldCheck, Cloud, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signOut } from '../lib/firebase';
import { User } from 'firebase/auth';
import { UserStats } from '../types';
import { deleteCurrentAccount } from '../services/accountDeletionService';
import { clearStoredUserData } from '../services/storage';

interface AuthModalProps { stats: UserStats; onUpdateStats: (newStats: Partial<UserStats>) => void; onClose: () => void; }

function isProActive(stats: UserStats): boolean {
  if (stats.isPro !== true) return false;
  const expiry = stats.proExpiryDate ? Date.parse(stats.proExpiryDate) : NaN;
  return Number.isFinite(expiry) && expiry > Date.now();
}

export const AuthModal: React.FC<AuthModalProps> = ({ stats, onUpdateStats, onClose }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => setCurrentUser(user));
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoading(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (user && !user.isAnonymous) {
        onUpdateStats({ name: user.displayName || stats.name || 'Estudante MemoriaFlash', avatar: user.photoURL || stats.avatar, isPro: false, proPlanType: undefined, proExpiryDate: undefined });
        setSuccessMessage(`Bem-vindo(a), ${user.displayName || 'Estudante'}! Conta conectada com sucesso.`);
        setTimeout(() => onClose(), 1000);
      }
    } catch (err: any) {
      console.error('Erro ao fazer login com Google:', err);
      if (err.code === 'auth/popup-closed-by-user') setErrorMessage('A janela de login com o Google foi fechada antes de concluir.');
      else if (err.code === 'auth/popup-blocked') setErrorMessage('O pop-up de login foi bloqueado pelo seu navegador. Por favor, permita pop-ups.');
      else setErrorMessage(err.message || 'Falha ao conectar com o Google. Tente novamente.');
    } finally { setIsLoading(false); }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try { await signOut(auth); clearStoredUserData(); setSuccessMessage('Você saiu da sua conta Google.'); setCurrentUser(null); }
    catch { setErrorMessage('Erro ao desconectar.'); }
    finally { setIsLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser || currentUser.isAnonymous) return;
    setIsLoading(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      await deleteCurrentAccount();
      clearStoredUserData();
      try { await signOut(auth); } catch { /* o usuário já pode ter sido removido pelo Admin SDK */ }
      setCurrentUser(null);
      setSuccessMessage('Conta e dados excluídos com sucesso.');
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Não foi possível excluir a conta. Faça login novamente e tente outra vez.');
      setConfirmDelete(false);
    } finally { setIsLoading(false); }
  };

  const isGoogleUser = Boolean(currentUser && !currentUser.isAnonymous && currentUser.email);
  const activePro = isProActive(stats);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white border border-[#CDD2E8] rounded-3xl p-6 sm:p-8 text-[#1A1F36] shadow-2xl overflow-hidden space-y-6">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-100 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-100 rounded-full blur-3xl pointer-events-none" />
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-[#5A6380] hover:text-[#1A1F36] rounded-full bg-[#F0F2F8] hover:bg-[#E5E8F4] transition-colors cursor-pointer"><X className="w-5 h-5" /></button>

        <div className="text-center space-y-2"><div className="inline-flex p-3 rounded-2xl bg-[#EEF0F8] border border-[#CDD2E8] text-[#4F6EF7] shadow-inner mb-1"><Sparkles className="w-8 h-8" /></div><h2 className="text-2xl font-bold tracking-tight">Conta MemoriaFlash</h2><p className="text-xs text-[#5A6380]">Acesse seus baralhos, estatísticas e sincronize em múltiplos dispositivos</p></div>

        {errorMessage && <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5"><AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" /><span>{errorMessage}</span></div>}
        {successMessage && <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" /><span>{successMessage}</span></div>}

        {isGoogleUser ? (
          <div className="space-y-4 bg-[#F0F2F8] border border-[#CDD2E8] rounded-2xl p-4 text-center">
            <div className="relative inline-block"><img src={currentUser!.photoURL || stats.avatar} alt={currentUser!.displayName || 'Usuário'} className="w-16 h-16 rounded-full mx-auto border-2 border-emerald-400 object-cover shadow-md" /><div className="absolute bottom-0 right-0 p-1 rounded-full bg-emerald-500 text-slate-950"><ShieldCheck className="w-3.5 h-3.5" /></div></div>
            <div><div className="font-bold text-base">{currentUser!.displayName || stats.name}</div><div className="text-xs font-mono text-[#4F6EF7]">{currentUser!.email}</div></div>
            <div className="pt-2 border-t border-[#CDD2E8] flex items-center justify-around text-xs text-[#5A6380]"><div className="flex items-center gap-1.5 text-emerald-600 font-medium"><Cloud className="w-4 h-4" /> Nuvem Ativa</div><div className="font-mono font-bold text-[#4F6EF7]">{activePro ? (stats.proPlanType === 'monthly' ? 'Plano Mensal' : stats.proPlanType === 'annual' ? 'Plano Anual' : 'Plano Pro') : 'Plano Gratuito'}</div></div>
            <button onClick={() => void handleSignOut()} disabled={isLoading} className="w-full mt-2 py-2.5 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-600 border border-[#CDD2E8] hover:border-rose-200 text-xs font-bold text-[#5A6380] flex items-center justify-center gap-2 transition-colors cursor-pointer"><LogOut className="w-4 h-4" /> Sair da Conta Google</button>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} disabled={isLoading} className="w-full py-2.5 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Excluir minha conta e meus dados</button>
            ) : (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-left space-y-2"><b className="block text-xs text-rose-700">Excluir definitivamente?</b><p className="text-[11px] text-rose-700/80">Seus decks, estatísticas, preferências, feedbacks e documentos enviados serão excluídos. A conta Google do MemoriaFlash também será removida.</p><div className="flex gap-2"><button onClick={() => setConfirmDelete(false)} disabled={isLoading} className="flex-1 py-2 rounded-lg bg-white border border-rose-200 text-xs">Cancelar</button><button onClick={() => void handleDeleteAccount()} disabled={isLoading} className="flex-1 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold">{isLoading ? 'Excluindo…' : 'Sim, excluir'}</button></div></div>
            )}
          </div>
        ) : (
          <div className="space-y-5"><div className="space-y-2.5 text-xs text-[#5A6380] bg-[#F0F2F8] p-4 rounded-2xl border border-[#CDD2E8]"><div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span>Sincronização instantânea na nuvem Firebase</span></div><div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span>Lembretes de revisão e aviso de sequência em risco</span></div><div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span>Backup automático dos seus Decks e conquistas</span></div></div><button onClick={() => void handleGoogleSignIn()} disabled={isLoading} className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-[#F6F7FC] border border-[#CDD2E8] text-[#1A1F36] font-bold text-sm shadow-md flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-70">{isLoading ? <><Loader2 className="w-5 h-5 text-[#4F6EF7] animate-spin" /><span>Conectando ao Google...</span></> : <><svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h-3.57c2.08-1.92 3.78-4.74 3.78-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98-.66-3.3-1.93-6.16-4.53H2.18v2.84C3.99 20.47 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.47 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg><span>Entrar com o Google</span></>}</button></div>
        )}
        <div className="text-center text-[10px] text-[#666B87]">Protegido por autenticação segura Google Firebase Auth.</div>
      </div>
    </div>
  );
};
