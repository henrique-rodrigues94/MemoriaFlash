import { Capacitor } from '@capacitor/core';
import {
  initializeApp,
} from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup as firebaseSignInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { SocialLogin } from '@capgo/capacitor-social-login';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export { app };
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

const isNative = Capacitor.isNativePlatform();
const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const googleWebClientId = String(import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '').trim();
let socialLoginInitialized = false;

function getGuestUserId(): string {
  const stored = localStorage.getItem('flashmind_guest_uid');
  if (stored) return stored;
  const newId = 'guest_' + Math.random().toString(36).substring(2, 11);
  localStorage.setItem('flashmind_guest_uid', newId);
  return newId;
}

async function ensureSocialLoginInitialized(): Promise<void> {
  if (!isNative || socialLoginInitialized) return;
  if (!googleWebClientId) {
    throw new Error('Login Google nativo não configurado. Defina VITE_GOOGLE_WEB_CLIENT_ID antes de gerar o APK.');
  }

  await SocialLogin.initialize({
    google: {
      webClientId: googleWebClientId,
      mode: 'online',
    },
  });
  socialLoginInitialized = true;
}

/**
 * Mantém a mesma API usada pelos componentes, mas troca o popup WebView pelo
 * Google Sign-In nativo quando o app roda no Android/iOS via Capacitor.
 */
export async function signInWithPopup(authInstance: typeof auth, provider: GoogleAuthProvider) {
  if (!isNative || provider.providerId !== 'google.com') {
    return firebaseSignInWithPopup(authInstance, provider);
  }

  await ensureSocialLoginInitialized();

  const response = await SocialLogin.login({
    provider: 'google',
    options: {
      scopes: ['profile', 'email'],
      filterByAuthorizedAccounts: false,
    },
  });

  const result = response?.result as { idToken?: string | null; accessToken?: { token?: string } | null } | undefined;
  const idToken = result?.idToken || null;
  const accessToken = result?.accessToken?.token || undefined;

  if (!idToken) {
    throw new Error('O Google não retornou um ID token válido. Verifique o SHA-1 e o Web Client ID no Firebase/Google Cloud.');
  }

  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  return signInWithCredential(authInstance, credential);
}

export async function signOut(authInstance: typeof auth): Promise<void> {
  if (isNative && socialLoginInitialized) {
    try {
      await SocialLogin.logout({ provider: 'google' });
    } catch {
      // O logout do Firebase JS continua mesmo se a sessão nativa já tiver expirado.
    }
  }
  await firebaseSignOut(authInstance);
}

export async function ensureAuthenticated(): Promise<User> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        try {
          const anon = await signInAnonymously(auth);
          unsubscribe();
          resolve(anon.user);
        } catch {
          unsubscribe();
          const guestUid = getGuestUserId();
          resolve({ uid: guestUid, isAnonymous: true } as User);
        }
      }
    });
  });
}

// Todas as chamadas /api/* precisam alcançar o Express quando o app estiver
// empacotado no Capacitor. No navegador continuam relativas ao host atual.
if (typeof window !== 'undefined' && !(window as any).__memoriaFlashApiFetchInstalled) {
  const originalFetch = window.fetch.bind(window);
  (window as any).__memoriaFlashApiFetchInstalled = true;
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const originalUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    let resolvedInput: RequestInfo | URL = input;
    let url = originalUrl;

    if (isNative && originalUrl.startsWith('/api/')) {
      if (!configuredApiBaseUrl) {
        throw new Error('Servidor do MemoriaFlash não configurado para o aplicativo. Defina VITE_API_BASE_URL com a URL HTTPS da API.');
      }
      url = `${configuredApiBaseUrl}${originalUrl}`;
      if (input instanceof Request) {
        resolvedInput = new Request(url, input);
      } else {
        resolvedInput = url;
      }
    }

    if (url.includes('/api/gemini/generate-flashcards') || url.includes('/api/gemini/scanner-process')) {
      const user = auth.currentUser;
      if (user) {
        try {
          const token = await user.getIdToken();
          const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
          if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
          init = { ...init, headers };
        } catch {
          // O endpoint retornará 401 caso não seja possível obter o token.
        }
      }
    }

    return originalFetch(resolvedInput, init);
  };
}

export {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  GoogleAuthProvider,
  onAuthStateChanged,
};
