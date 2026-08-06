// 📁 flashmind-ai/src/server/cardBank/cardBank.ts
//
// Banco de cartões compartilhado (entre TODOS os usuários) no Firestore.
// Antes de gastar uma chamada de IA, verificamos se algum outro usuário já
// gerou cards para a mesma combinação (matéria + tópico + nível de ensino +
// dificuldade) — se sim, reaproveitamos. Cada card novo gerado pela IA é
// gravado aqui de volta, então o banco cresce sozinho com o uso do app: a
// primeira pessoa a estudar "Direito Penal / Legítima Defesa / Concurso"
// paga o custo de IA; a segunda em diante pega pronto, na hora, de graça.
//
// Estrutura no Firestore:
//   cardBank/{bucketId}                 → metadados do "balde" (subject, topic, educationLevel, difficulty)
//   cardBank/{bucketId}/cards/{cardId}  → um flashcard; cardId = hash do texto da pergunta,
//                                          então gravar o "mesmo" card duas vezes não duplica nada.
import { createHash } from 'crypto';
import { getAdminFirestore } from '../firebaseAdmin';

export interface BankCard {
  front: string;
  back: string;
  explanation: string;
  topic: string;
  difficulty: string;
}

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

/** ID determinístico do "balde": mesma matéria+tópico+nível+dificuldade sempre cai no mesmo lugar. */
export function getBucketId(subject: string, topic: string, educationLevel: string, difficulty: string): string {
  const key = `${normalize(subject)}|${normalize(topic)}|${educationLevel}|${difficulty}`;
  return shortHash(key);
}

/**
 * Busca cards já prontos no banco para essa combinação exata. Retorna no
 * máximo `limit` cards, embaralhados (para não devolver sempre os mesmos N
 * primeiros quando o balde tem mais cards do que o pedido).
 */
export async function getCardsFromBank(
  subject: string,
  topic: string,
  educationLevel: string,
  difficulty: string,
  limit: number
): Promise<BankCard[]> {
  const db = getAdminFirestore();
  if (!db || limit <= 0) return [];

  try {
    const bucketId = getBucketId(subject, topic, educationLevel, difficulty);
    // Busca uma folga além do necessário (até 3x) para poder embaralhar com
    // alguma variedade real, sem trazer o balde inteiro se ele for enorme.
    const snapshot = await db
      .collection('cardBank')
      .doc(bucketId)
      .collection('cards')
      .limit(Math.max(limit * 3, limit))
      .get();

    const cards = snapshot.docs.map((doc) => doc.data() as BankCard);
    // Fisher-Yates simplificado — suficiente para embaralhar um lote pequeno.
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards.slice(0, limit);
  } catch (err: any) {
    console.error('[cardBank] Falha ao ler o banco de cards:', err?.message || err);
    return []; // banco indisponível → quem chamou cai no fallback de gerar via IA normalmente
  }
}

/**
 * Grava cards novos no banco. O ID de cada card é um hash do texto da
 * pergunta (front) — gravar o "mesmo" card de novo apenas sobrescreve o
 * doc existente com o mesmo conteúdo, então nunca duplica.
 */
export async function saveCardsToBank(
  subject: string,
  topic: string,
  educationLevel: string,
  difficulty: string,
  cards: BankCard[]
): Promise<void> {
  const db = getAdminFirestore();
  if (!db || cards.length === 0) return;

  try {
    const bucketId = getBucketId(subject, topic, educationLevel, difficulty);
    const bucketRef = db.collection('cardBank').doc(bucketId);
    const batch = db.batch();

    batch.set(
      bucketRef,
      { subject, topic, educationLevel, difficulty, updatedAt: new Date().toISOString() },
      { merge: true }
    );

    for (const card of cards) {
      const front = (card.front || '').trim();
      if (!front) continue;
      const cardId = shortHash(normalize(front));
      batch.set(bucketRef.collection('cards').doc(cardId), {
        front: card.front,
        back: card.back,
        explanation: card.explanation,
        topic: card.topic,
        difficulty: card.difficulty,
        createdAt: new Date().toISOString(),
      });
    }

    await batch.commit();
  } catch (err: any) {
    console.error('[cardBank] Falha ao gravar cards no banco:', err?.message || err);
    // Não propaga o erro: falhar ao SALVAR no banco não pode derrubar a
    // resposta pro usuário, que já tem os cards gerados em mãos.
  }
}
