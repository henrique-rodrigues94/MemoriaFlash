import { db, ensureAuthenticated, collection, doc, setDoc, deleteDoc, onSnapshot, query, where } from '../lib/firebase';
import { Deck, UserStats } from '../types';

async function getAuthenticatedUserId(): Promise<string | null> {
  try { const user = await ensureAuthenticated(); if (!user?.uid || user.uid.startsWith('guest_')) return null; return user.uid; }
  catch (error) { console.warn('[Firestore] Authentication unavailable; using local storage.', error); return null; }
}

export async function getCurrentUserId(): Promise<string> {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error('Firebase Auth indisponível. Os dados permanecerão no armazenamento local até a autenticação ser restabelecida.');
  return userId;
}

export async function syncDecksFromFirestore(onUpdate: (decks: Deck[]) => void): Promise<() => void> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return () => {};
  try {
    const q = query(collection(db, 'decks'), where('userId', 'in', [userId, 'public', 'system']));
    return onSnapshot(q, (snapshot) => { const list: Deck[] = []; snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as Deck)); onUpdate(list); }, (error) => console.warn('Firestore snapshot error (decks):', error));
  } catch (e) { console.error('Failed to listen to Firestore decks:', e); return () => {}; }
}

function cleanForFirestore<T>(data: T): T { return JSON.parse(JSON.stringify(data)); }

/** Salva com pequenas tentativas de retry para evitar perder um deck por uma falha transitória de rede. */
export async function saveDeckToFirestore(deck: Deck): Promise<boolean> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;
  const payload = cleanForFirestore({ ...deck, userId });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { await setDoc(doc(db, 'decks', deck.id), payload, { merge: true }); return true; }
    catch (e) {
      console.error(`[Firestore] Error saving deck (attempt ${attempt}/3):`, e);
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 250 * attempt));
    }
  }
  return false;
}

export async function deleteDeckFromFirestore(deckId: string): Promise<void> {
  try { const userId = await getAuthenticatedUserId(); if (!userId) return; await deleteDoc(doc(db, 'decks', deckId)); }
  catch (e) { console.error('Error deleting deck:', e); }
}

export async function syncStatsFromFirestore(onUpdate: (stats: UserStats) => void): Promise<() => void> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return () => {};
    return onSnapshot(doc(db, 'userStats', userId), (docSnap) => {
      if (docSnap.exists()) onUpdate(docSnap.data() as UserStats);
    }, (err) => console.warn('Firestore snapshot error (stats):', err));
  } catch (e) { console.error('Failed to listen to Firestore stats:', e); return () => {}; }
}

export async function saveStatsToFirestore(stats: UserStats): Promise<void> {
  try { const userId = await getAuthenticatedUserId(); if (!userId) return; await setDoc(doc(db, 'userStats', userId), cleanForFirestore(stats), { merge: true }); }
  catch (e) { console.error('Error saving stats to Firestore:', e); }
}
