// 📁 flashmind-ai/src/server/cardBank/cardBank.ts
//
// Banco de cards compartilhado (entre TODOS os usuários) no Firestore.
//
// FILOSOFIA: "IA só quando necessário"
//  - 1ª requisição para matéria+tópico+nível+dificuldade → gera via IA → salva
//  - Requisições seguintes → serve do banco (instantâneo, sem custo de IA)
//  - Cards com mais de CARD_TTL_DAYS são considerados "stale" e re-gerados na
//    próxima requisição (conteúdo pode ter sido atualizado/melhorado)
//
// ESTRUTURA NO FIRESTORE:
//   cardBank/{bucketId}                 → metadados do balde
//     .subject          string          matéria normalizada (ex: "biologia")
//     .topic            string          subtópico (ex: "Mitocôndria")
//     .educationLevel   string          "medio", "faculdade", etc.
//     .difficulty       string          "medium", "hard", etc.
//     .cardCount        number          total de cards neste balde
//     .createdAt        ISO string
//     .updatedAt        ISO string
//     .providerUsed     string          qual IA gerou (gemini, gpt-4, etc.)
//
//   cardBank/{bucketId}/cards/{cardId}  → um flashcard
//     cardId = sha1(normalize(front))[:16] — gravar o mesmo card nunca duplica

import { createHash } from 'crypto';
import { getAdminFirestore } from '../firebaseAdmin';

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface BankCard {
  front: string;
  back: string;
  explanation: string;
  topic: string;
  difficulty: string;
}

export interface BucketMeta {
  subject: string;
  topic: string;
  educationLevel: string;
  difficulty: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
  providerUsed?: string;
}

export interface BankStats {
  bucketId: string;
  subject: string;
  topic: string;
  educationLevel: string;
  difficulty: string;
  cardCount: number;
  updatedAt: string;
  isStale: boolean;
}

// ─── Configurações ────────────────────────────────────────────────────────────

/** Cards com mais de X dias são considerados stale e re-gerados na próxima requisição */
const CARD_TTL_DAYS = 60;

// ─── Utilitários internos ─────────────────────────────────────────────────────

function normalize(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function shortHash(text: string): string {
  return createHash('sha1').update(text).digest('hex').slice(0, 16);
}

function isStale(updatedAt: string | undefined): boolean {
  if (!updatedAt) return true;
  const age = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return age > CARD_TTL_DAYS;
}

/** ID determinístico do balde: mesma combinação → mesmo doc no Firestore */
export function getBucketId(
  subject: string,
  topic: string,
  educationLevel: string,
  difficulty: string,
): string {
  const key = `${normalize(subject)}|${normalize(topic)}|${educationLevel}|${difficulty}`;
  return shortHash(key);
}

// ─── Leitura ──────────────────────────────────────────────────────────────────

/**
 * Busca cards do banco para a combinação pedida.
 * Retorna `{ cards, isStale }` — quando `isStale=true`, o chamador deve
 * completar a geração via IA e salvar os novos cards de volta.
 */
export async function getCardsFromBank(
  subject: string,
  topic: string,
  educationLevel: string,
  difficulty: string,
  limit: number,
): Promise<{ cards: BankCard[]; stale: boolean }> {
  const db = getAdminFirestore();
  if (!db || limit <= 0) return { cards: [], stale: true };

  try {
    const bucketId = getBucketId(subject, topic, educationLevel, difficulty);
    const bucketRef = db.collection('cardBank').doc(bucketId);
    const bucketSnap = await bucketRef.get();

    if (!bucketSnap.exists) return { cards: [], stale: true };

    const meta = bucketSnap.data() as BucketMeta;
    const stale = isStale(meta?.updatedAt);

    // Busca até 3x o pedido para ter margem de embaralhamento
    const snapshot = await bucketRef
      .collection('cards')
      .limit(Math.max(limit * 3, 50))
      .get();

    const cards = snapshot.docs.map(d => d.data() as BankCard);

    // Fisher-Yates shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    return { cards: cards.slice(0, limit), stale };
  } catch (err: any) {
    console.error('[cardBank] getCardsFromBank error:', err?.message || err);
    return { cards: [], stale: true };
  }
}

// ─── Escrita ──────────────────────────────────────────────────────────────────

/**
 * Salva cards novos no banco.
 * Usa hash do front como ID do doc → gravar o mesmo card nunca duplica.
 * Atualiza metadados do balde atomicamente.
 */
export async function saveCardsToBank(
  subject: string,
  topic: string,
  educationLevel: string,
  difficulty: string,
  cards: BankCard[],
  providerUsed?: string,
): Promise<void> {
  const db = getAdminFirestore();
  if (!db || cards.length === 0) return;

  try {
    const bucketId = getBucketId(subject, topic, educationLevel, difficulty);
    const bucketRef = db.collection('cardBank').doc(bucketId);
    const now = new Date().toISOString();

    // Firestore batch (max 500 ops — mais que suficiente para lotes de cards)
    const batch = db.batch();

    // Upsert nos cards (hash do front → idempotente)
    for (const card of cards) {
      const front = (card.front || '').trim();
      if (!front) continue;
      const cardId = shortHash(normalize(front));
      batch.set(bucketRef.collection('cards').doc(cardId), {
        front: card.front,
        back: card.back,
        explanation: card.explanation ?? '',
        topic: card.topic ?? topic,
        difficulty: card.difficulty ?? difficulty,
        createdAt: now,
      });
    }

    // Atualiza metadados do balde
    // cardCount é aproximado (não fazemos count() caro — incrementamos)
    batch.set(
      bucketRef,
      {
        subject,
        topic,
        educationLevel,
        difficulty,
        updatedAt: now,
        providerUsed: providerUsed ?? 'unknown',
      },
      { merge: true },
    );

    await batch.commit();

    // Atualiza cardCount separadamente (precisa do total real mas não bloqueia)
    bucketRef
      .collection('cards')
      .count()
      .get()
      .then(countSnap =>
        bucketRef.update({ cardCount: countSnap.data().count }).catch(() => {}),
      )
      .catch(() => {});
  } catch (err: any) {
    console.error('[cardBank] saveCardsToBank error:', err?.message || err);
    // Não propaga: falhar ao salvar não deve derrubar a resposta ao usuário
  }
}

// ─── Stats / consulta ─────────────────────────────────────────────────────────

/**
 * Verifica disponibilidade no banco para uma lista de tópicos.
 * Usado pelo frontend para mostrar "X cards disponíveis" antes de gerar.
 */
export async function getBankStatsForTopics(
  subject: string,
  topics: string[],
  educationLevel: string,
  difficulty: string,
): Promise<BankStats[]> {
  const db = getAdminFirestore();
  if (!db || topics.length === 0) return [];

  const results: BankStats[] = [];
  await Promise.all(
    topics.map(async topic => {
      try {
        const bucketId = getBucketId(subject, topic, educationLevel, difficulty);
        const snap = await db.collection('cardBank').doc(bucketId).get();
        if (snap.exists) {
          const meta = snap.data() as BucketMeta;
          results.push({
            bucketId,
            subject,
            topic,
            educationLevel,
            difficulty,
            cardCount: meta.cardCount ?? 0,
            updatedAt: meta.updatedAt ?? '',
            isStale: isStale(meta.updatedAt),
          });
        } else {
          results.push({
            bucketId,
            subject,
            topic,
            educationLevel,
            difficulty,
            cardCount: 0,
            updatedAt: '',
            isStale: true,
          });
        }
      } catch {
        // ignora erro individual
      }
    }),
  );
  return results;
}
