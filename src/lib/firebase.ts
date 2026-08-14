import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
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
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export { app };
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

function getGuestUserId(): string {
  const stored = localStorage.getItem('flashmind_guest_uid');
  if (stored) return stored;
  const newId = 'guest_' + Math.random().toString(36).substring(2, 11);
  localStorage.setItem('flashmind_guest_uid', newId);
  return newId;
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

// Adiciona automaticamente o ID token às chamadas do backend que geram cards.
// Isso permite que o servidor identifique o usuário e aplique o limite gratuito
// também ao Scanner, sem exigir alterações em cada componente que usa fetch.
if (typeof window !== 'undefined' && !(window as any).__memoriaFlashAuthFetchInstalled) {
  const originalFetch = window.fetch.bind(window);
  (window as any).__memoriaFlashAuthFetchInstalled = true;
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
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
    return originalFetch(input, init);
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
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
};
