import {
  db,
  ensureAuthenticated,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from '../lib/firebase';
import { Deck, UserStats } from '../types';

/**
 * Returns the Firebase UID only when Firebase Auth actually produced a real
 * authenticated user. The firebase.ts guest fallback uses a synthetic
 * `guest_*` UID, which Firestore rules correctly reject because request.auth
 * is null. Local storage remains the fallback in that situation.
 */
async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const user = await ensureAuthenticated();
    if (!user?.uid || user.uid.startsWith('guest_')) return null;
    return user.uid;
  } catch (error) {
    console.warn('[Firestore] Authentication unavailable; using local storage.', error);
    return null;
  }
}

export async function getCurrentUserId(): Promise<string> {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error('Firebase Auth indisponível. Os dados permanecerão no armazenamento local até a autenticação ser restabelecida.');
  return userId;
}

// Decks Firestore Sync
export async function syncDecksFromFirestore(
  onUpdate: (decks: Deck[]) => void
): Promise<() => void> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    console.info('[Firestore] Sem usuário autenticado; decks locais serão usados.');
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'decks'),
      where('userId', 'in', [userId, 'public', 'system'])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Deck[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Deck);
        });
        onUpdate(list);
      },
      (error) => {
        console.warn('Firestore snapshot error (decks):', error);
      }
    );

    return unsubscribe;
  } catch (e) {
    console.error('Failed to listen to Firestore decks:', e);
    return () => {};
  }
}

function cleanForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export async function saveDeckToFirestore(deck: Deck): Promise<boolean> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    console.info('[Firestore] Deck mantido no armazenamento local; autenticação não disponível.', deck.id);
    return false;
  }

  try {
    const docRef = doc(db, 'decks', deck.id);
    const cleanData = cleanForFirestore({ ...deck, userId });
    await setDoc(docRef, cleanData, { merge: true });
    return true;
  } catch (e) {
    console.error('[Firestore] Error saving deck:', e);
    return false;
  }
}

export async function deleteDeckFromFirestore(deckId: string): Promise<void> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return;
    const docRef = doc(db, 'decks', deckId);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('Error deleting deck from Firestore:', e);
  }
}

// User Stats Firestore Sync
export async function syncStatsFromFirestore(
  onUpdate: (stats: UserStats) => void
): Promise<() => void> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return () => {};
    const docRef = doc(db, 'userStats', userId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate({ ...(docSnap.data() as UserStats), isPro: false });
        }
      },
      (err) => console.warn('Firestore snapshot error (stats):', err)
    );

    return unsubscribe;
  } catch (e) {
    console.error('Failed to listen to Firestore stats:', e);
    return () => {};
  }
}

export async function saveStatsToFirestore(stats: UserStats): Promise<void> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return;
    const docRef = doc(db, 'userStats', userId);
    const cleanData = cleanForFirestore(stats);
    await setDoc(docRef, cleanData, { merge: true });
  } catch (e) {
    console.error('Error saving stats to Firestore:', e);
  }
}
