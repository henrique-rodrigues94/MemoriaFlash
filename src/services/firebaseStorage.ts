import { db, ensureAuthenticated, collection, doc, setDoc, deleteDoc, onSnapshot, query, where } from '../lib/firebase';
import { Deck, UserStats } from '../types';

function normalizePlanState(stats: UserStats): UserStats {
  const result = { ...stats };
  if (result.isPro === true) {
    const expiry = result.proExpiryDate ? Date.parse(result.proExpiryDate) : NaN;
    // Um estado PRO sem uma validade verificável é legado/stale e não deve
    // desbloquear recursos pagos. O backend de Billing continua sendo a fonte
    // de verdade para uma assinatura real.
    if (!Number.isFinite(expiry) || expiry <= Date.now()) {
      result.isPro = false;
      result.proPlanType = undefined;
      result.proExpiryDate = undefined;
    }
  }
  return result;
}

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const user = await ensureAuthenticated();
    if (!user?.uid || user.isAnonymous || user.uid.startsWith('guest_')) return null;
    return user.uid;
  } catch (error) {
    console.warn('[Firestore] Authentication unavailable; keeping local data until login is restored.', error);
    return null;
  }
}

export async function getCurrentUserId(): Promise<string> {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error('Firebase Auth indisponível. Entre com sua conta Google para sincronizar os dados.');
  return userId;
}

export async function syncDecksFromFirestore(onUpdate: (decks: Deck[]) => void): Promise<() => void> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return () => {};

  try {
    // Nunca misture documentos públicos/system com a coleção privada de decks.
    // As regras do Firestore permitem ao usuário ler somente os próprios decks.
    const q = query(collection(db, 'decks'), where('userId', '==', userId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Deck[] = [];
        snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as Deck));
        onUpdate(list);
      },
      (error) => console.warn('[Firestore] snapshot error (decks):', error),
    );
  } catch (e) {
    console.error('[Firestore] Failed to listen to decks:', e);
    return () => {};
  }
}

function cleanForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export async function saveDeckToFirestore(deck: Deck): Promise<boolean> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;
  const payload = cleanForFirestore({ ...deck, userId });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await setDoc(doc(db, 'decks', deck.id), payload, { merge: true });
      return true;
    } catch (e) {
      console.error(`[Firestore] Error saving deck (attempt ${attempt}/3):`, e);
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 250 * attempt));
    }
  }
  return false;
}

export async function deleteDeckFromFirestore(deckId: string): Promise<void> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return;
    const ref = doc(db, 'decks', deckId);
    // Firestore rules enforce ownership. Keep the client-side lookup simple.
    await deleteDoc(ref);
  } catch (e) {
    console.error('Error deleting deck:', e);
  }
}

export async function syncStatsFromFirestore(onUpdate: (stats: UserStats) => void): Promise<() => void> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return () => {};
    return onSnapshot(
      doc(db, 'userStats', userId),
      (docSnap) => {
        if (docSnap.exists()) onUpdate(normalizePlanState(docSnap.data() as UserStats));
      },
      (err) => console.warn('[Firestore] snapshot error (stats):', err),
    );
  } catch (e) {
    console.error('[Firestore] Failed to listen to stats:', e);
    return () => {};
  }
}

export async function saveStatsToFirestore(stats: UserStats): Promise<void> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return;
    await setDoc(doc(db, 'userStats', userId), cleanForFirestore(normalizePlanState(stats)), { merge: true });
  } catch (e) {
    console.error('Error saving stats to Firestore:', e);
  }
}
