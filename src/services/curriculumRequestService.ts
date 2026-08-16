import { collection, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

function normalizeSubject(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function subjectId(value: string): string {
  return normalizeSubject(value).replace(/\s+/g, '-').slice(0, 100);
}

async function findUserRequests(uid: string) {
  const snapshot = await getDocs(query(
    collection(db, 'contentRequests'),
    where('requestedBy', '==', uid),
  ));
  return snapshot.docs;
}

/**
 * Solicita ao Content Agent que prepare a grade e complete os cards
 * compartilhados da matéria/nível. A solicitação é idempotente por usuário,
 * matéria, nível e status pendente/em processamento.
 */
export async function requestCurriculumPreparation(args: {
  subject: string;
  educationLevel: string;
}): Promise<{ requestId: string; reused: boolean }> {
  const user = auth.currentUser;
  if (!user) throw new Error('É necessário estar autenticado para solicitar conteúdo.');

  const subject = args.subject.trim();
  const educationLevel = args.educationLevel.trim();
  if (subject.length < 2) throw new Error('Informe a matéria ou assunto.');
  if (!educationLevel) throw new Error('Informe o nível de ensino.');

  const normalizedSubject = normalizeSubject(subject);
  const existingDocs = await findUserRequests(user.uid);
  const reusable = existingDocs.find((item) => {
    const data = item.data();
    const status = String(data?.status || '');
    return String(data?.normalizedSubject || '') === normalizedSubject
      && String(data?.educationLevel || '') === educationLevel
      && ['pending', 'processing', 'analyzing', 'generating', 'validating'].includes(status);
  });

  if (reusable) {
    await updateDoc(reusable.ref, {
      requestCount: Number(reusable.data()?.requestCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    });
    return { requestId: reusable.id, reused: true };
  }

  const ref = doc(collection(db, 'contentRequests'));
  const now = new Date().toISOString();
  await setDoc(ref, {
    subject,
    requestedSubject: subject,
    normalizedSubject,
    subjectId: subjectId(subject) || ref.id,
    educationLevel,
    status: 'pending',
    stage: 'queued',
    priority: 5,
    requestCount: 1,
    attempts: 0,
    requestedBy: user.uid,
    requestedAt: now,
    createdAt: now,
    updatedAt: now,
    shareWithMemoriaFlash: true,
    source: null,
    progress: {
      levels: 0,
      curriculaReady: 0,
      leavesDiscovered: 0,
      cardsGenerated: 0,
      cardsApproved: 0,
      cardsRejected: 0,
    },
  });

  return { requestId: ref.id, reused: false };
}

export async function getLatestCurriculumPreparationRequest(args: {
  subject: string;
  educationLevel: string;
}) {
  const user = auth.currentUser;
  if (!user) return null;
  const normalizedSubject = normalizeSubject(args.subject);
  const docs = await findUserRequests(user.uid);
  const matches = docs.filter(docSnapshot => {
    const data = docSnapshot.data();
    return String(data?.normalizedSubject || '') === normalizedSubject
      && String(data?.educationLevel || '') === args.educationLevel;
  });
  if (matches.length === 0) return null;
  const sorted = [...matches].sort((a, b) => String(b.data()?.updatedAt || '').localeCompare(String(a.data()?.updatedAt || '')));
  const data = sorted[0].data();
  return { id: sorted[0].id, ...data };
}
