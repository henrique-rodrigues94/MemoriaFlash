import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type DocumentMimeType = 'application/pdf' | 'text/plain';

const MAX_CHUNK_CHARS = 12000;
const MAX_CHUNKS = 80;

function normalizeSource(text: string): string {
  return String(text || '').replace(/\u0000/g, '').replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n').trim();
}

export async function enqueueDocumentContent(args: {
  subject: string;
  educationLevel?: string;
  fileName: string;
  mimeType: DocumentMimeType;
  sourceText: string;
}): Promise<{ requestId: string; totalChars: number; chunkCount: number }> {
  const user = auth.currentUser;
  if (!user) throw new Error('É necessário estar autenticado para enviar um documento.');

  const subject = args.subject.trim();
  const sourceText = normalizeSource(args.sourceText);
  if (subject.length < 2) throw new Error('Informe a matéria ou assunto do documento.');
  if (!sourceText) throw new Error('Não foi possível extrair texto do documento.');

  const chunks: string[] = [];
  for (let start = 0; start < sourceText.length && chunks.length < MAX_CHUNKS; start += MAX_CHUNK_CHARS) {
    chunks.push(sourceText.slice(start, start + MAX_CHUNK_CHARS));
  }
  if (sourceText.length > MAX_CHUNK_CHARS * MAX_CHUNKS) {
    throw new Error('Este documento é grande demais para a versão atual. Divida o PDF/TXT em partes menores.');
  }

  const requestRef = doc(collection(db, 'contentRequests'));
  const now = new Date().toISOString();
  await setDoc(requestRef, {
    subject,
    requestedSubject: subject,
    normalizedSubject: subject.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(),
    subjectId: subject.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 100) || requestRef.id,
    educationLevel: args.educationLevel || undefined,
    status: 'pending',
    priority: 5,
    requestCount: 1,
    attempts: 0,
    requestedBy: user.uid,
    requestedAt: now,
    createdAt: now,
    updatedAt: now,
    source: {
      fileName: args.fileName.trim().slice(0, 180),
      mimeType: args.mimeType,
      totalChars: sourceText.length,
      chunkCount: chunks.length,
      createdAt: now,
    },
  });

  for (let index = 0; index < chunks.length; index += 1) {
    await setDoc(doc(requestRef, 'sourceChunks', String(index + 1).padStart(4, '0')), {
      index,
      text: chunks[index],
      chars: chunks[index].length,
      createdAt: serverTimestamp(),
    });
  }

  return { requestId: requestRef.id, totalChars: sourceText.length, chunkCount: chunks.length };
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
