import admin from 'firebase-admin';

// Inicialização preguiçosa (lazy) do Firebase Admin SDK. Necessário apenas
// para os endpoints que precisam ESCREVER em nome de outro usuário com
// segurança (ex: creditar quem indicou um amigo). Toda a leitura/escrita dos
// dados do PRÓPRIO usuário continua no cliente via Firebase client SDK.
//
// Configuração (crie uma Service Account em:
// Firebase Console > Configurações do Projeto > Contas de Serviço > Gerar nova chave):
//   FIREBASE_PROJECT_ID=...
//   FIREBASE_CLIENT_EMAIL=...
//   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
//
// Sem essas variáveis, os endpoints que dependem do Admin SDK respondem com
// erro claro em vez de derrubar o servidor inteiro.
let app: admin.app.App | null = null;
let initTried = false;

export function getAdminApp(): admin.app.App | null {
  if (app) return app;
  if (initTried) return null;
  initTried = true;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      '[firebaseAdmin] Credenciais de Service Account ausentes — endpoints de indicação (referral) ficarão desativados. ' +
        'Configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no .env para habilitar.'
    );
    return null;
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
  return app;
}

export function getAdminAuth() {
  const a = getAdminApp();
  return a ? admin.auth(a) : null;
}

export function getAdminFirestore() {
  const a = getAdminApp();
  return a ? admin.firestore(a) : null;
}
