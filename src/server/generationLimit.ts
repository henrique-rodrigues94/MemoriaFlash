import { getAdminAuth, getAdminFirestore } from './firebaseAdmin';

export const FREE_DAILY_AI_CARD_LIMIT = 200;

export interface GenerationAuthorization {
  uid: string;
  isPro: boolean;
  generated: number;
  firebaseCards: number;
  remaining: number;
  generationDay: string;
  resetAt: string;
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

function getUserTimeZone(req: any): string {
  const candidate = typeof req.headers?.['x-timezone'] === 'string' ? req.headers['x-timezone'] : '';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate || 'UTC' }).format();
    return candidate || 'UTC';
  } catch {
    return 'UTC';
  }
}

function getGenerationDay(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function getNextMidnightISO(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  // This is only a UI hint. The authoritative reset is generationDay calculated
  // on every request, so DST transitions cannot make the quota incorrect.
  const tomorrowUTC = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1, 0, 0, 0));
  return tomorrowUTC.toISOString();
}

/**
 * Free users receive a fresh quota of 200 AI cards every local calendar day.
 * PRO users have no quota. The daily counter is stored independently from the
 * historical `aiCardsGenerated` field so old accumulated counters no longer
 * consume today's allowance.
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
  const timeZone = getUserTimeZone(req);
  const generationDay = getGenerationDay(timeZone);
  const storedDay = typeof data.aiCardsGenerationDay === 'string' ? data.aiCardsGenerationDay : '';
  const dailyCounter = storedDay === generationDay ? Math.max(0, Number(data.aiCardsGeneratedToday) || 0) : 0;
  const remaining = isPro ? Number.POSITIVE_INFINITY : Math.max(0, FREE_DAILY_AI_CARD_LIMIT - dailyCounter);

  if (!isPro && (requestedCount <= 0 || requestedCount > remaining)) {
    throw Object.assign(
      new Error(`Limite diário de 200 cards atingido. Você já gerou ${dailyCounter} card${dailyCounter === 1 ? '' : 's'} hoje e poderá gerar novamente após 00:00. Assine o PRO para gerar ilimitadamente.`),
      {
        httpStatus: 429,
        code: 'GENERATION_DAILY_LIMIT_REACHED',
        remaining,
        generated: dailyCounter,
        limit: FREE_DAILY_AI_CARD_LIMIT,
        resetAt: getNextMidnightISO(timeZone),
      },
    );
  }

  return {
    uid,
    isPro,
    generated: dailyCounter,
    firebaseCards: 0,
    remaining,
    generationDay,
    resetAt: getNextMidnightISO(timeZone),
  };
}

/** Registra somente os cards realmente devolvidos pela IA no contador do dia. */
export async function recordGeneratedCards(uid: string, actualCount: number, generationDay: string): Promise<{ generated: number; remaining: number; generationDay: string }> {
  const db = getAdminFirestore();
  if (!db) throw Object.assign(new Error('Firebase Admin indisponível.'), { httpStatus: 503 });
  const ref = db.collection('userStats').doc(uid);
  const increment = Math.max(0, Number(actualCount) || 0);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists ? snapshot.data() || {} : {};
    const isPro = isProActive(data);
    const currentDay = typeof data.aiCardsGenerationDay === 'string' ? data.aiCardsGenerationDay : '';
    const current = currentDay === generationDay ? Math.max(0, Number(data.aiCardsGeneratedToday) || 0) : 0;
    const next = current + increment;

    if (!isPro && next > FREE_DAILY_AI_CARD_LIMIT) {
      throw Object.assign(new Error('O limite diário gratuito de 200 cards foi atingido.'), { httpStatus: 429, code: 'GENERATION_DAILY_LIMIT_REACHED', remaining: 0, limit: FREE_DAILY_AI_CARD_LIMIT });
    }

    transaction.set(ref, {
      aiCardsGeneratedToday: next,
      aiCardsGenerationDay: generationDay,
      aiCardsDailyLimit: FREE_DAILY_AI_CARD_LIMIT,
      aiCardsGeneratedLastUpdatedAt: new Date().toISOString(),
    }, { merge: true });

    return {
      generated: next,
      remaining: isPro ? Number.POSITIVE_INFINITY : Math.max(0, FREE_DAILY_AI_CARD_LIMIT - next),
      generationDay,
    };
  });
}
