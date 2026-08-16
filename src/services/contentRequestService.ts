import { collection, doc, getDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type DocumentMimeType = 'application/pdf' | 'text/plain';

const MAX_CHUNK_CHARS = 12000;
const MAX_CHUNKS = 80;
const MAX_SOURCE_CHARS = MAX_CHUNK_CHARS * MAX_CHUNKS;

function normalizeSource(text: string): string {
  return String(text || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n')
    .trim();
}

function normalizeSubject(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function toSubjectId(value: string, fallback: string): string {
  return normalizeSubject(value)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100) || fallback;
}

async function sha256(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('O navegador não oferece SHA-256 para este ambiente.');
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function enqueueDocumentContent(args: {
  subject: string;
  educationLevel?: string;
  fileName: string;
  mimeType: DocumentMimeType;
  sourceText: string;
  shareWithMemoriaFlash: boolean;
}): Promise<{ requestId: string; totalChars: number; chunkCount: number; sourceHash: string; reused: boolean }> {
  const user = auth.currentUser;
  if (!user) throw new Error('É necessário estar autenticado para enviar um documento.');
  if (!args.shareWithMemoriaFlash) throw new Error('É necessário autorizar o uso do material para alimentar o conteúdo do MemoriaFlash.');
  if (args.mimeType !== 'application/pdf' && args.mimeType !== 'text/plain') throw new Error('Formato não suportado. Nesta versão, use apenas PDF ou TXT.');

  const subject = args.subject.trim();
  const sourceText = normalizeSource(args.sourceText);
  if (subject.length < 2) throw new Error('Informe a matéria ou assunto do documento.');
  if (!sourceText) throw new Error('Não foi possível extrair texto do documento.');
  if (sourceText.length > MAX_SOURCE_CHARS) throw new Error('Este documento é grande demais para a versão atual. Divida o PDF/TXT em partes menores.');

  const sourceHash = await sha256(sourceText);
  const normalized = normalizeSubject(subject);

  const existingQuery = query(
    collection(db, 'contentRequests'),
    where('requestedBy', '==', user.uid),
    where('source.sourceHash', '==', sourceHash),
  );
  const existingSnapshot = await getDocs(existingQuery);
  if (!existingSnapshot.empty) {
    const existing = existingSnapshot.docs[0];
    const data = existing.data();
    return {
      requestId: existing.id,
      totalChars: Number(data?.source?.totalChars) || sourceText.length,
      chunkCount: Number(data?.source?.chunkCount) || Math.ceil(sourceText.length / MAX_CHUNK_CHARS),
      sourceHash,
      reused: true,
    };
  }

  const chunks: string[] = [];
  for (let start = 0; start < sourceText.length; start += MAX_CHUNK_CHARS) {
    chunks.push(sourceText.slice(start, start + MAX_CHUNK_CHARS));
  }

  const requestRef = doc(collection(db, 'contentRequests'));
  const now = new Date().toISOString();
  const subjectId = toSubjectId(subject, requestRef.id);
  const batch = writeBatch(db);

  batch.set(requestRef, {
    subject,
    requestedSubject: subject,
    normalizedSubject: normalized,
    subjectId,
    educationLevel: args.educationLevel?.trim() || null,
    status: 'pending',
    priority: 5,
    requestCount: 1,
    attempts: 0,
    requestedBy: user.uid,
    requestedAt: now,
    createdAt: now,
    updatedAt: now,
    shareWithMemoriaFlash: true,
    source: {
      fileName: args.fileName.trim().slice(0, 180),
      mimeType: args.mimeType,
      totalChars: sourceText.length,
      chunkCount: chunks.length,
      sourceHash,
      createdAt: now,
    },
  });

  chunks.forEach((text, index) => {
    batch.set(doc(requestRef, 'sourceChunks', String(index + 1).padStart(4, '0')), {
      index,
      text,
      chars: text.length,
      sourceHash,
      createdAt: now,
    });
  });

  await batch.commit();
  return {
    requestId: requestRef.id,
    totalChars: sourceText.length,
    chunkCount: chunks.length,
    sourceHash,
    reused: false,
  };
}

export async function getContentRequestStatus(requestId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');
  const snapshot = await getDoc(doc(db, 'contentRequests', requestId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.requestedBy !== user.uid) throw new Error('Solicitação não pertence ao usuário atual.');
  return { id: snapshot.id, ...data };
}
