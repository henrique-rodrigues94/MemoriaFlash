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
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

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
        } catch (err) {
          // Anonymous auth restricted in project settings; fallback to persistent guest device ID
          unsubscribe();
          const guestUid = getGuestUserId();
          resolve({ uid: guestUid, isAnonymous: true } as User);
        }
      }
    });
  });
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
