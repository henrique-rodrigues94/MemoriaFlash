import { getAdminAuth, getAdminFirestore } from './firebaseAdmin';

export const FREE_AI_CARD_LIMIT = 200;

export interface GenerationAuthorization {
  uid: string;
  isPro: boolean;
  generated: number;
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

export async function authorizeGeneration(req: any, requestedCount: number): Promise<GenerationAuthorization> {
  const adminAuth = getAdminAuth();
  const db = getAdminFirestore();
  if (!adminAuth || !db) throw Object.assign(new Error('Backend sem Firebase Admin configurado para controlar o limite de geração.'), { httpStatus: 503 });

  const token = readBearerToken(req);
  if (!token) throw Object.assign(new Error('Autenticação necessária para gerar flashcards.'), { httpStatus: 401 });

  const decoded = await adminAuth.verifyIdToken(token);
  const uid = decoded.uid;
  const snapshot = await db.collection('userStats').doc(uid).get();
  const data = snapshot.exists ? snapshot.data() || {} : {};
  const isPro = isProActive(data);
  const generated = Math.max(0, Number(data.aiCardsGenerated) || 0);
  const remaining = isPro ? Number.POSITIVE_INFINITY : Math.max(0, FREE_AI_CARD_LIMIT - generated);

  if (!isPro && (requestedCount <= 0 || requestedCount > remaining)) {
    throw Object.assign(new Error(`Limite gratuito atingido. Você pode gerar mais ${remaining} card${remaining === 1 ? '' : 's'}. Assine o PRO para gerar cards ilimitados.`), { httpStatus: 429, code: 'GENERATION_LIMIT_REACHED', remaining, generated, limit: FREE_AI_CARD_LIMIT });
  }

  return { uid, isPro, generated, remaining };
}

/** Registra somente os cards efetivamente devolvidos pela IA. */
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
