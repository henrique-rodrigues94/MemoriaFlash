# Configuração do Firebase

O projeto já vem com um `firebase-applet-config.json` (config pública do
client SDK — é normal e seguro que a `apiKey` do Firebase Web apareça no
código-fonte; ela apenas identifica o projeto, não autentica nada sozinha.
A segurança real vem das **Regras do Firestore**, que foram corrigidas neste
projeto — veja o aviso no topo de `firestore.rules`).

## 1. Habilitar Autenticação Anônima (recomendado)

Sem isso, o app ainda funciona 100% localmente (localStorage), mas perde:
sincronização entre dispositivos, e o **programa de indicação** (que exige
um usuário Firebase Auth real para emitir o token verificado no backend).

1. Acesse o [Console do Firebase](https://console.firebase.google.com/) →
   seu projeto → **Authentication** → **Sign-in method**.
2. Ative o provedor **Anônimo**.
3. (Opcional) Ative também **Google** se quiser permitir login social —
   já implementado em `src/components/AuthModal.tsx`.

## 2. Publicar as novas regras de segurança do Firestore

As regras antigas deste projeto permitiam `allow read, write: if true` em
tudo — ou seja, qualquer pessoa podia ler/apagar os dados de qualquer
usuário. Isso foi corrigido em `firestore.rules`. Publique com:

```bash
npm install -g firebase-tools   # se ainda não tiver
firebase login
firebase deploy --only firestore:rules --project SEU_PROJECT_ID
```

## 3. Configurar o Firebase Admin SDK (necessário para o programa de indicação)

O backend usa o **Admin SDK** para creditar recompensas de indicação com
segurança (o cliente nunca escreve créditos diretamente no Firestore).

1. Console do Firebase → **Configurações do Projeto** → **Contas de
   Serviço** → **Gerar nova chave privada** (baixa um `.json`).
2. Copie os 3 campos para o seu `.env` (veja `.env.example`):

```
FIREBASE_PROJECT_ID=seu-projeto
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

> ⚠️ **Nunca** commite o arquivo `.json` da service account nem o `.env`
> real no Git — ambos já estão no `.gitignore`. Em produção, configure essas
> variáveis como *secrets* da sua plataforma de hospedagem (veja
> `docs/DEPLOY.md`).

Sem essas variáveis configuradas, o app funciona normalmente — apenas os
endpoints `/api/referral/*` retornam um erro claro (503) explicando o que
falta, em vez de derrubar o servidor.

## 4. Estrutura de dados no Firestore

| Coleção | Documento | Quem escreve |
|---|---|---|
| `decks/{deckId}` | Deck do usuário | Cliente (dono do deck) |
| `userStats/{uid}` | Estatísticas/créditos | Cliente (próprio uid) + Admin SDK (créditos de indicação) |
| `classes/{classId}` | Turma de professor | Cliente (professor dono) |
| `notificationPrefs/{uid}` | Tokens FCM + preferências de lembrete | Cliente (próprio uid) + Admin SDK (marca de último envio) |
| `aiCache/{hash}` | Resposta de IA cacheada | Somente Admin SDK (via `src/server/ai/cache/aiCache.ts`) |
| `referralCodes/{code}` | `{ uid }` — mapeia código → dono | Somente Admin SDK |
| `referrals/{uid}` | Registro de quem já resgatou indicação | Somente Admin SDK |
