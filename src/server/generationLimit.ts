import { getAdminAuth, getAdminFirestore } from './firebaseAdmin';

export const FREE_AI_CARD_LIMIT = 200;

export interface GenerationAuthorization {
  uid: string;
  isPro: boolean;
  generated: number;
  firebaseCards: number;
  remaining: number;
}

function readBearerToken(req: any): string | null {
  const header = req.headers?.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

function isProActive(data: Record<string, any>): boolean {
  if (data.isPro !== true) return false;
  if (!data.proExpiryDate) return true;
  const expiry = Date.parse(String(data.proExpiryDate));
  return Number.isFinite(expiry) && expiry > Date.now();
}

/**
 * O limite gratuito é acumulado e não depende de o usuário clicar em
 * "Salvar" novamente. A fonte de verdade considera:
 *  - aiCardsGenerated: cards de IA já gerados nesta conta, inclusive os que
 *    ainda não foram persistidos no Firebase;
 *  - cards atualmente existentes nos decks do usuário no Firebase.
 *
 * Usamos o MAIOR dos dois valores para não contar o mesmo card duas vezes
 * quando um card gerado também já foi salvo em um deck.
 */
export async function authorizeGeneration(req: any, requestedCount: number): Promise<GenerationAuthorization> {
  const adminAuth = getAdminAuth();
  const db = getAdminFirestore();
  if (!adminAuth || !db) throw Object.assign(new Error('Backend sem Firebase Admin configurado para controlar o limite de geração.'), { httpStatus: 503 });

  const token = readBearerToken(req);
  if (!token) throw Object.assign(new Error('Autenticação necessária para gerar flashcards.'), { httpStatus: 401 });

  const decoded = await adminAuth.verifyIdToken(token);
  const uid = decoded.uid;
  const statsRef = db.collection('userStats').doc(uid);
  const statsSnapshot = await statsRef.get();
  const data = statsSnapshot.exists ? statsSnapshot.data() || {} : {};
  const isPro = isProActive(data);
  const generatedCounter = Math.max(0, Number(data.aiCardsGenerated) || 0);

  // Todos os cards que já estão armazenados nos decks da conta participam
  // do limite. Manualmente criados fora do Firebase não entram porque não
  // são persistidos lá, conforme a regra do aplicativo.
  const decksSnapshot = await db.collection('decks').where('userId', '==', uid).get();
  const firebaseCards = decksSnapshot.docs.reduce((total, deckDoc) => {
    const cards = deckDoc.data()?.cards;
    return total + (Array.isArray(cards) ? cards.length : 0);
  }, 0);

  // Evita duplicidade: um card gerado pela IA e depois salvo no Firebase
  // aparece nas duas contagens, mas deve consumir somente 1 unidade.
  const consumed = Math.max(generatedCounter, firebaseCards);
  const remaining = isPro ? Number.POSITIVE_INFINITY : Math.max(0, FREE_AI_CARD_LIMIT - consumed);

  if (!isPro && (requestedCount <= 0 || requestedCount > remaining)) {
    throw Object.assign(
      new Error(`Limite gratuito de 200 cards atingido. Você já possui ${consumed} card${consumed === 1 ? '' : 's'} contabilizado${consumed === 1 ? '' : 's'} e pode gerar mais ${remaining}.`),
      { httpStatus: 429, code: 'GENERATION_LIMIT_REACHED', remaining, generated: consumed, limit: FREE_AI_CARD_LIMIT, firebaseCards },
    );
  }

  return { uid, isPro, generated: consumed, firebaseCards, remaining };
}

/** Registra a quantidade realmente retornada pela IA, mantendo o contador acumulado. */
export async function recordGeneratedCards(uid: string, actualCount: number): Promise<{ generated: number; remaining: number }> {
  const db = getAdminFirestore();
  if (!db) throw Object.assign(new Error('Firebase Admin indisponível.'), { httpStatus: 503 });
  const ref = db.collection('userStats').doc(uid);
  const increment = Math.max(0, Number(actualCount) || 0);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists ? snapshot.data() || {} : {};
    const isPro = isProActive(data);
    const current = Math.max(0, Number(data.aiCardsGenerated) || 0);
    const next = current + increment;
    if (!isPro && next > FREE_AI_CARD_LIMIT) {
      throw Object.assign(new Error('O limite gratuito de geração foi atingido.'), { httpStatus: 429, code: 'GENERATION_LIMIT_REACHED' });
    }
    transaction.set(ref, { aiCardsGenerated: next }, { merge: true });
    return { generated: next, remaining: isPro ? Number.POSITIVE_INFINITY : Math.max(0, FREE_AI_CARD_LIMIT - next) };
  });
}
