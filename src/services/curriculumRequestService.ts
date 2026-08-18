import { collection, doc, getDocs, limit, orderBy, query, setDoc, where } from 'firebase/firestore';
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

/**
 * Busca a solicitação mais recente do usuário para essa matéria/nível usando
 * uma consulta indexada (requestedBy + normalizedSubject + educationLevel +
 * updatedAt) em vez de trazer TODAS as solicitações do usuário e filtrar no
 * cliente. Isso mantém a leitura rápida mesmo depois de o usuário acumular
 * centenas de solicitações ao longo do tempo.
 */
async function findLatestUserRequest(uid: string, normalizedSubject: string, educationLevel: string) {
  const snapshot = await getDocs(query(
    collection(db, 'contentRequests'),
    where('requestedBy', '==', uid),
    where('normalizedSubject', '==', normalizedSubject),
    where('educationLevel', '==', educationLevel),
    orderBy('updatedAt', 'desc'),
    limit(1),
  ));
  return snapshot.docs[0] ?? null;
}

/**
 * Solicita ao Content Agent que prepare a grade e complete os cards
 * compartilhados da matéria/nível. A solicitação é idempotente por usuário,
 * matéria, nível e status pendente/em processamento.
 *
 * Importante: esta preparação é complementar. A geração direta por IA não
 * pode ficar bloqueada se o Content Agent/Firebase estiver indisponível.
 */
export async function requestCurriculumPreparation(args: {
  subject: string;
  educationLevel: string;
}): Promise<{ requestId: string; reused: boolean }> {
  const user = auth.currentUser;
  if (!user) return { requestId: '', reused: false };

  const subject = args.subject.trim();
  const educationLevel = args.educationLevel.trim();
  if (subject.length < 2 || !educationLevel) return { requestId: '', reused: false };

  try {
    const normalizedSubject = normalizeSubject(subject);
    const reusable = await findLatestUserRequest(user.uid, normalizedSubject, educationLevel);
    const reusableStatus = reusable ? String(reusable.data()?.status || '') : '';
    const isReusable = reusable && ['pending', 'processing', 'analyzing', 'generating', 'validating'].includes(reusableStatus);

    if (isReusable && reusable) {
      // As regras do Firestore não permitem update de contentRequests pelo
      // cliente (só o Content Agent, via Admin SDK, pode avançar o status).
      // Reaproveitamos a solicitação existente sem tentar escrever nela.
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
  } catch (error) {
    // Não transformar falha do agente de conteúdo em falha da geração direta.
    console.warn('[ContentAgent] Solicitação opcional indisponível:', error);
    return { requestId: '', reused: false };
  }
}

export async function getLatestCurriculumPreparationRequest(args: {
  subject: string;
  educationLevel: string;
}) {
  const user = auth.currentUser;
  if (!user) return null;
  const normalizedSubject = normalizeSubject(args.subject);
  const latest = await findLatestUserRequest(user.uid, normalizedSubject, args.educationLevel);
  if (!latest) return null;
  return { id: latest.id, ...latest.data() };
}
