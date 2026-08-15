// Schema consolidado do Firestore — MemoriaFlash.
// Conteúdo educacional é compartilhável e escrito somente pelo servidor.
// A regra principal é: IA somente quando o conteúdo não existe ou expirou.

import { createHash } from 'crypto';

export type EducationLevel = 'fundamental' | 'medio' | 'faculdade' | 'concurso' | 'tecnico';

export type CardContentType =
  | 'definition' | 'quiz' | 'gap' | 'comparison' | 'applied' | 'review';

export const TTL_DAYS = {
  SUBJECT_LEVELS: 90,
  CURRICULUM: 90,
  CARD_BUCKET: 60,
  AI_CACHE: 30,
} as const;

export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function shortHash(text: string, len = 16): string {
  return createHash('sha1').update(text).digest('hex').slice(0, len);
}

export function sha256Hash(text: string, len = 32): string {
  return createHash('sha256').update(text).digest('hex').slice(0, len);
}

export function subjectId(subject: string): string {
  return shortHash(normalizeText(subject));
}

export function curriculumId(subject: string, level: EducationLevel): string {
  return shortHash(`${normalizeText(subject)}|${level}`);
}

export function bucketId(
  subject: string,
  topic: string,
  level: EducationLevel,
  cardType: CardContentType = 'definition',
): string {
  return shortHash(`${normalizeText(subject)}|${normalizeText(topic)}|${level}|${cardType}`);
}

export interface SubjectDoc {
  subject: string;
  normalized: string;
  levels: Array<{
    level: EducationLevel;
    label: string;
    icon: string;
    reason: string;
    priority: number;
  }>;
  updatedAt: string;
  ttlAt: number;
  providerUsed: string;
}

/** Um tópico é um bloco da grade e seus subitens estudáveis. */
export interface CurriculumTopic {
  topic: string;
  subtopics: string[];
}

export interface CurriculumDoc {
  subject: string;                 // matéria
  level: EducationLevel;           // grade/nível educacional
  categories: Array<{              // compatibilidade com versões anteriores
    category: string;
    topics: string[];
  }>;
  topicTree: CurriculumTopic[];    // estrutura canônica: tópico -> subtópicos
  topicCount: number;
  subtopicCount: number;
  totalTopics: number;             // compatibilidade: total de subitens
  updatedAt: string;
  ttlAt: number;
  providerUsed: string;
}

export interface BankCard {
  id: string;
  front: string;
  back: string;
  explanation: string;
  topic: string;
  difficulty: string;
}

export interface CardBucketDoc {
  subject: string;
  topic: string;
  level: EducationLevel;
  cardType: CardContentType;
  cards: BankCard[];
  cardCount: number;
  updatedAt: string;
  ttlAt: number;
  providerUsed: string;
}

export function makeTtl(days: number): number {
  return Date.now() + days * 24 * 60 * 60 * 1000;
}

export function isExpired(ttlAt: number | undefined): boolean {
  if (!ttlAt) return true;
  return Date.now() > ttlAt;
}
