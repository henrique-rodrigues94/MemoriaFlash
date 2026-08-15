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

## ☁️ Backend em produção

Para o app Android funcionar fora da rede local, o backend Express precisa
estar hospedado em uma URL HTTPS pública. O repositório inclui um
[`render.yaml`](render.yaml) (Blueprint) para deploy em **uma etapa** no
[Render](https://render.com) (free tier) — veja o passo a passo em
[`docs/DEPLOY.md`](docs/DEPLOY.md).

Depois do deploy, use a URL HTTPS do Render (ex. `https://memoriaflash.onrender.com`)
como `VITE_API_BASE_URL` no build do APK, junto com o `VITE_GOOGLE_WEB_CLIENT_ID`
(configurado no `.env`).
