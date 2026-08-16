# 🧠 MemoriaFlash

Aplicativo de flashcards com IA, repetição espaçada e sincronização Firebase.

## Geração e monetização

- **Usuário gratuito:** até **200 cards gerados por IA por dia**.
- O contador gratuito é renovado automaticamente **após 00:00 no fuso horário do dispositivo**.
- Se o usuário consumir os 200 cards do dia, novas gerações ficam bloqueadas até o próximo dia.
- **Usuário PRO:** **geração ilimitada**, no plano mensal ou anual enquanto a assinatura estiver ativa.
- A geração de IA é controlada pelo backend autenticado; o cliente não consegue liberar créditos alterando o contador local.
- Usuários gratuitos recebem anúncios normais.
- Usuários PRO não recebem anúncios.
- O contador diário fica em `userStats/{uid}.aiCardsGeneratedToday`, acompanhado de `aiCardsGenerationDay`.
- O antigo `aiCardsGenerated` pode permanecer como histórico e não limita mais a cota diária.

## IA

Gemini e DeepSeek podem atuar como provedores de geração, com fallback automático conforme a configuração do servidor. As chaves de IA ficam somente no backend.

## Segurança

As regras do Firestore protegem os campos de assinatura e contadores contra alterações pelo cliente. A geração usa autenticação Firebase no backend.

## Lembretes de revisão

No Android, os lembretes usam `@capacitor/local-notifications` e são agendados como notificações recorrentes diárias. O usuário pode ativar/desativar o lembrete diário, alterar o horário e ativar/desativar o aviso de sequência em risco. O botão de teste agenda uma notificação imediata para validar a permissão do Android.

## Exclusão de conta

A exclusão autenticada está disponível dentro do aplicativo. Quando o app não estiver instalado, o usuário pode usar `public/delete-account.html` para solicitar a exclusão. Solicitações externas são armazenadas em `accountDeletionRequests` e podem ser processadas pelo administrador usando `ADMIN_TOKEN`.

## Desenvolvimento

**Pré-requisito:** Node.js 22+

```bash
npm ci
cp .env.example .env
npm run dev
```

Build de produção:

```bash
npm run build
npm run start
```

Testes:

```bash
npm run test
npm run typecheck
npm run release:check
```

Preflight final de produção:

```bash
RELEASE_PRODUCTION=true npm run release:check
```

## Documentação

- `docs/ADMOB_STRATEGY.md` — monetização atual.
- `docs/AI_PROVIDERS.md` — configuração dos provedores de IA.
- `docs/FIREBASE_SETUP.md` — Firebase e regras de segurança.
- `docs/DEPLOY.md` — publicação do backend/frontend.
- `docs/MOBILE_RUNTIME_SETUP.md` — runtime Android/iOS via Capacitor (login Google nativo, `VITE_API_BASE_URL`, testes no celular).
- `docs/ANDROID_MONETIZATION_SETUP.md` — AdMob nativo + Google Play Billing no Android.
- `docs/MONETIZATION_PRODUCTION_AUDIT.md` — auditoria de produção (AdMob/Billing).
- `docs/PLAY_STORE_CHECKLIST.md` — checklist de publicação.
- `docs/PLAY_STORE_DATA_SAFETY.md` — preparação do Data Safety.
- `docs/RELEASE_RUNBOOK.md` — procedimento de release.
- `public/privacy.html` — política de privacidade pública.
- `public/delete-account.html` — solicitação pública de exclusão de conta.

## Distribuição (Android)

O projeto é uma aplicação web (React + Vite + Express) empacotada com Capacitor para Android. A pasta `android/` contém os fontes nativos e é versionada no Git.

Build do APK de debug:

```bash
npm ci
npm run build
npm run android:sync
cd android
./gradlew assembleDebug
```

Instalação em dispositivo (via ADB):

```bash
adb devices
adb install -r "./app/build/outputs/apk/debug/app-debug.apk"
```

O CI valida automaticamente `typecheck`, testes, release preflight, build web e compilação Android. O workflow `.github/workflows/android-release.yml` permite gerar um AAB **assinado de produção** usando secrets do GitHub e uma keystore fora do repositório.

> A integração de anúncios usa o SDK nativo real (`@capacitor-community/admob`) e compras via `@capgo/native-purchases`. Em produção, os IDs reais são obrigatórios e o build não deve usar IDs de teste.

## ☁️ Backend em produção (Render)

Para o app Android funcionar fora da rede local, o backend Express precisa estar hospedado em uma **URL HTTPS pública**. O repositório inclui `render.yaml` (Blueprint) para publicação no Render.

### Variáveis de produção

Configure no host os valores reais de:

- `GEMINI_API_KEY`
- `DEEPSEEK_API_KEY` (opcional)
- `OPENAI_API_KEY` (opcional)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `APP_URL`
- `CORS_ORIGIN`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` ou `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_FILE`
- `GOOGLE_PLAY_RTDN_TOKEN`
- `ANDROID_PACKAGE_NAME=com.memoriaflash.app`
- `ADMIN_TOKEN`

Depois do deploy, confirme `/api/health`, configure `VITE_API_BASE_URL` com a URL HTTPS real e execute o workflow de release após configurar os secrets de produção.
