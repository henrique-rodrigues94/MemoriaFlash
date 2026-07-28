import React, { useState, useEffect } from 'react';
import { X, Sparkles, LogOut, CheckCircle2, ShieldCheck, User as UserIcon, Cloud, AlertCircle, Loader2 } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signOut } from '../lib/firebase';
import { User } from 'firebase/auth';
import { UserStats } from '../types';

interface AuthModalProps {
  stats: UserStats;
  onUpdateStats: (newStats: Partial<UserStats>) => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  stats,
  onUpdateStats,
  onClose,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (user) {
        onUpdateStats({
          name: user.displayName || stats.name || 'Estudante FlashMind',
          avatar: user.photoURL || stats.avatar,
        });

        setSuccessMessage(`Bem-vindo(a), ${user.displayName || 'Estudante'}! Conta conectada com sucesso.`);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Erro ao fazer login com Google:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('A janela de login com o Google foi fechada antes de concluir.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage('O pop-up de login foi bloqueado pelo seu navegador. Por favor, permita pop-ups.');
      } else {
        setErrorMessage(err.message || 'Falha ao conectar com o Google. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      setSuccessMessage('Você saiu da sua conta Google.');
      setCurrentUser(null);
    } catch (err: any) {
      setErrorMessage('Erro ao desconectar.');
    } finally {
      setIsLoading(false);
    }
  };

  const isGoogleUser = currentUser && !currentUser.isAnonymous && currentUser.email;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0b1a2a] border border-[#adc6ff]/30 rounded-3xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden space-y-6">
        {/* Background glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-[#122131] border border-[#adc6ff]/20 text-[#60a5fa] shadow-inner mb-1">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Conta FlashMind AI
          </h2>
          <p className="text-xs text-[#8c91a0]">
            Acesse seus baralhos, estatísticas e sincronize em múltiplos dispositivos
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Notification */}
        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Logged in view vs Logged out view */}
        {isGoogleUser ? (
          <div className="space-y-4 bg-[#122131]/80 border border-[#adc6ff]/20 rounded-2xl p-4 text-center">
            <div className="relative inline-block">
              <img
                src={currentUser.photoURL || stats.avatar}
                alt={currentUser.displayName || 'Usuário'}
                className="w-16 h-16 rounded-full mx-auto border-2 border-emerald-400 object-cover shadow-md"
              />
              <div className="absolute bottom-0 right-0 p-1 rounded-full bg-emerald-500 text-slate-950" title="Conta Conectada">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className="font-bold text-base text-white">
                {currentUser.displayName || stats.name}
              </div>
              <div className="text-xs font-mono text-[#60a5fa]">
                {currentUser.email}
              </div>
            </div>

            <div className="pt-2 border-t border-[#424754]/30 flex items-center justify-around text-xs text-[#8c91a0]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Cloud className="w-4 h-4" /> Nuvem Ativa
              </div>
              <div className="font-mono font-bold text-[#adc6ff]">
                {stats.isPro ? 'Plano PRO' : `${stats.aiCredits || 0} Créditos`}
              </div>
            </div>

            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full mt-2 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 border border-slate-700 hover:border-rose-800 text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sair da Conta Google
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Benefits List */}
            <div className="space-y-2.5 text-xs text-slate-300 bg-[#122131]/60 p-4 rounded-2xl border border-[#424754]/30">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Sincronização instantânea na nuvem Firebase</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Acesso a turmas de professores e histórico</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Backup automático dos seus Decks e conquistas</span>
              </div>
            </div>

            {/* Official Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl shadow-white/10 flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <span>Conectando ao Google...</span>
                </>
              ) : (
                <>
                  {/* Official Google Color SVG Logo */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Entrar com o Google</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center text-[10px] text-[#8c91a0]">
          Protegido por autenticação segura Google Firebase Auth.
        </div>
      </div>
    </div>
  );
};
