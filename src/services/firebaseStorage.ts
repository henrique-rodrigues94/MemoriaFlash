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

export async function getCurrentUserId(): Promise<string> {
  const user = await ensureAuthenticated();
  return user.uid;
}

// Decks Firestore Sync
export async function syncDecksFromFirestore(
  onUpdate: (decks: Deck[]) => void
): Promise<() => void> {
  try {
    const userId = await getCurrentUserId();
    const q = query(
      collection(db, 'decks'),
      where('userId', 'in', [userId, 'public', 'system'])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Deck[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Deck);
          });
          onUpdate(list);
        }
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

export async function saveDeckToFirestore(deck: Deck): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const docRef = doc(db, 'decks', deck.id);
    const cleanData = cleanForFirestore({ ...deck, userId });
    await setDoc(docRef, cleanData, { merge: true });
  } catch (e) {
    console.error('Error saving deck to Firestore:', e);
  }
}

export async function deleteDeckFromFirestore(deckId: string): Promise<void> {
  try {
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
    const userId = await getCurrentUserId();
    const docRef = doc(db, 'userStats', userId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as UserStats);
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
    const userId = await getCurrentUserId();
    const docRef = doc(db, 'userStats', userId);
    const cleanData = cleanForFirestore({ ...stats, userId });
    await setDoc(docRef, cleanData, { merge: true });
  } catch (e) {
    console.error('Error saving stats to Firestore:', e);
  }
}
