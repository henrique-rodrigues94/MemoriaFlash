# 🧠 MemoriaFlash

Aplicativo de flashcards com IA, repetição espaçada e sincronização Firebase.

## Geração e monetização

- **Usuário gratuito:** até **200 cards gerados por IA no total**.
- **Usuário PRO:** **geração ilimitada**.
- A geração de IA **não usa mais créditos**.
- Usuários gratuitos recebem anúncios normais.
- Usuários PRO não recebem anúncios.
- O contador `userStats/{uid}.aiCardsGenerated` é controlado pelo backend.

O limite é acumulado por conta, não diário. O backend valida o ID token do Firebase antes de gerar, bloqueia solicitações acima do saldo restante e registra somente os cards realmente devolvidos.

## IA

Gemini e DeepSeek podem atuar como provedores de geração, com fallback automático conforme a configuração do servidor. As chaves de IA ficam somente no backend.

## Segurança

As regras do Firestore protegem os campos de assinatura e `aiCardsGenerated` contra alterações pelo cliente. A geração usa autenticação Firebase no backend.

## Desenvolvimento

**Pré-requisito:** Node.js 20+

```bash
npm install
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
```

## Documentação

- `docs/ADMOB_STRATEGY.md` — monetização atual.
- `docs/AI_PROVIDERS.md` — configuração dos provedores de IA.
- `docs/FIREBASE_SETUP.md` — Firebase e regras de segurança.
- `docs/DEPLOY.md` — publicação do backend/frontend.
- `docs/MOBILE_RUNTIME_SETUP.md` — runtime Android/iOS via Capacitor (login Google nativo, `VITE_API_BASE_URL`, testes no celular).
- `docs/ANDROID_MONETIZATION_SETUP.md` — AdMob nativo + Google Play Billing no Android.
- `docs/MONETIZATION_PRODUCTION_AUDIT.md` — auditoria de produção (AdMob/Billing).

## Distribuição (Android)

O projeto é uma aplicação web (React + Vite + Express) empacotada com
[Capacitor](https://capacitorjs.com/) para Android. A pasta `android/` contém
os fontes nativos e é versionada no Git (recomendado pelo Capacitor para
builds reprodutíveis).

Build do APK de debug:

```bash
npm install
npx cap sync android
npm run build
npx cap copy android
cd android
.\gradlew.bat assembleDebug
```

Instalação em dispositivo (via ADB):

```bash
adb devices
adb install -r ".\app\build\outputs\apk\debug\app-debug.apk"
```

> A integração de anúncios usa o SDK nativo real (`@capacitor-community/admob`)
> e compras via `@capgo/native-purchases`. Consulte
> [`docs/MOBILE_RUNTIME_SETUP.md`](docs/MOBILE_RUNTIME_SETUP.md) para o login
> Google e a configuração de rede, e
> [`docs/ANDROID_MONETIZATION_SETUP.md`](docs/ANDROID_MONETIZATION_SETUP.md)
> para o App ID do AdMob e o Play Billing.

## ☁️ Backend em produção (Render)

Para o app Android funcionar fora da rede local, o backend Express precisa
estar hospedado em uma **URL HTTPS pública**. O repositório inclui um
[`render.yaml`](render.yaml) (Blueprint) que automatiza o deploy no
[Render](https://render.com) (plano free).

### 1. Criar conta no Render

Acesse [render.com](https://render.com) e clique em **Sign Up** →
**Continue with GitHub** (mais rápido e seguro — usa a mesma conta do GitHub).

### 2. Deploy em uma etapa (Blueprint)

1. No dashboard do Render, clique em **New** → **Blueprint**.
2. Conecte o repositório `MemoriaFlash` (autorize o acesso do Render ao GitHub
   se pedir).
3. O Render detecta o [`render.yaml`](render.yaml) e monta o serviço
   automaticamente (nome `memoriaflash`, build `npm ci && npm run build`,
   start `node dist/server.cjs`, health check `/api/health`).
4. Preencha as variáveis de ambiente que o Render pedir (as marcadas como
   secret). Copie os mesmos valores do seu `.env`:

   | Variável | Valor sugerido |
   |---|---|
   | `GEMINI_API_KEY` | sua chave do Gemini (obrigatória) |
   | `DEEPSEEK_API_KEY` | sua chave (fallback, opcional) |
   | `OPENAI_API_KEY` | sua chave (fallback, opcional) |
   | `FIREBASE_PROJECT_ID` | `flashcardsia-a2f43` |
   | `FIREBASE_CLIENT_EMAIL` | o mesmo do `.env` |
   | `FIREBASE_PRIVATE_KEY` | a chave privada do `.env` |
   | `APP_URL` | `https://memoriaflash.onrender.com` |
   | `CORS_ORIGIN` | `https://memoriaflash.onrender.com` |
   | `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_FILE` | só se usar Play Billing |
   | `ADMIN_TOKEN` | opcional (endpoint de manutenção) |

5. Clique em **Apply** e aguarde o build (2–3 min). Ao concluir, o Render
   entrega uma URL HTTPS pública, por exemplo:
   `https://memoriaflash.onrender.com`.

### 3. Confirmar que está no ar

Abra no navegador (ou `curl`):

```bash
curl https://memoriaflash.onrender.com/api/health
# → {"status":"ok","timestamp":"..."}
```

Se responder `{"status":"ok"}`, o backend está funcionando.

### 4. Usar a URL no APK Android

Depois do deploy, use a URL HTTPS do Render como `VITE_API_BASE_URL` no
`.env` e recompile o APK:

```dotenv
VITE_API_BASE_URL=https://memoriaflash.onrender.com
VITE_GOOGLE_WEB_CLIENT_ID=773874565537-...apps.googleusercontent.com
```

Depois é só rodar `npm run build` → `npx cap sync android` →
`gradlew assembleDebug` e instalar o APK.

> ⚠️ **Plano free:** o serviço "dorme" após ~15 min sem uso e leva alguns
> segundos para "acordar" no primeiro acesso (cold start). Para um plano pago
> ou maior estabilidade, consulte o [`docs/DEPLOY.md`](docs/DEPLOY.md).
