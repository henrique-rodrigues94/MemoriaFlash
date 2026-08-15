# Deploy, Git/GitHub e CI/CD

## 1. Subindo o projeto para o GitHub pela primeira vez

```bash
cd flashmind-ai
git init
git add .
git commit -m "chore: initial commit — FlashMind AI"

# Crie o repositório vazio no GitHub antes (via site ou gh CLI):
gh repo create flashmind-ai --private --source=. --remote=origin
# ou, se já criou pelo site do GitHub:
git remote add origin https://github.com/SEU_USUARIO/flashmind-ai.git

git branch -M main
git push -u origin main
```

## 2. Fluxo de trabalho recomendado (branches)

```bash
git checkout -b feature/nome-da-funcionalidade
# ... faça alterações ...
git add .
git commit -m "feat: descrição curta da mudança"
git push -u origin feature/nome-da-funcionalidade
# abra um Pull Request no GitHub para revisar antes de mergear em main
```

Convenção de commits sugerida (Conventional Commits):
`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`.

## 3. CI (Integração Contínua)

O workflow `.github/workflows/ci.yml` roda automaticamente em todo push e
Pull Request: instala dependências, roda `npm run typecheck` (checagem de
tipos TypeScript) e `npm run build` (garante que o build de produção não
quebra). Configure isso como **required check** nas proteções de branch do
GitHub (Settings → Branches → Branch protection rules) para impedir merge de
código quebrado.

## 4. CD (Deploy Contínuo)

Este projeto é um app **Node.js full-stack** (Express servindo a API de IA +
os arquivos estáticos do Vite em produção) — ou seja, precisa de um host que
rode um processo Node, não apenas hospedagem estática. Opções com camada
gratuita:

| Plataforma | Camada gratuita | Observação |
|---|---|---|
| [Render](https://render.com) | Sim (com sleep após inatividade) | Mais simples, `render.yaml` incluso opcionalmente |
| [Railway](https://railway.app) | Créditos gratuitos mensais | Deploy via GitHub direto |
| [Fly.io](https://fly.io) | Sim (recursos limitados) | Requer `fly.toml` |
| Google Cloud Run | Sim (grátis até certo volume) | Mesma stack usada pelo AI Studio original deste projeto |
| Firebase Hosting + Cloud Functions | Sim | Requer adaptar o Express para uma Cloud Function (não incluso neste scaffold) |

### Deploy no Render (recomendado, free tier)

O repositório já inclui um `render.yaml` (Blueprint) com a configuração
completa. Para fazer o deploy:

1. Acesse [render.com](https://render.com) e crie uma conta (pode usar o
   login do GitHub).
2. Clique em **New → Blueprint** e selecione o repositório `MemoriaFlash`.
   O Render detecta o `render.yaml` automaticamente.
3. Quando o serviço perguntar pelas variáveis marcadas com `sync: false`,
   preencha os mesmos valores do seu `.env`:
   - `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
   - `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_FILE` (se usar Play Billing)
   - `APP_URL`, `CORS_ORIGIN`, `ADMIN_TOKEN`
4. O Render roda `npm ci && npm run build` e `node dist/server.cjs`
   automaticamente. O health check usa `/api/health`.
5. Ao terminar, o Render entrega uma URL HTTPS pública, ex.:
   `https://memoriaflash.onrender.com`. **Essa URL é o `VITE_API_BASE_URL`
   para o build do APK Android.**

> ⚠️ No plano free o serviço "dorme" após ~15 min de inatividade e demora
> alguns segundos para "acordar" no primeiro acesso (cold start).

### Deploy manual (exemplo genérico via Docker, qualquer host compatível)

```bash
npm run build
# gera dist/ (frontend) + dist/server.cjs (backend)
NODE_ENV=production node dist/server.cjs
```

### Workflow de deploy automático (exemplo: Render)

O arquivo `.github/workflows/deploy.yml` está pronto para disparar um Deploy
Hook do Render a cada push em `main`. Configure o secret
`RENDER_DEPLOY_HOOK_URL` no GitHub (Settings → Secrets and variables →
Actions) com a URL de deploy hook do seu serviço no Render. Para outras
plataformas, troque o passo final do workflow pelo comando/CLI equivalente
(ex.: `flyctl deploy`, `railway up`, `gcloud run deploy`).

## 5. Variáveis de ambiente em produção

**Nunca** commite o `.env` real. Configure as mesmas chaves de
`.env.example` como *secrets*/variáveis de ambiente na plataforma de
hospedagem escolhida:

- `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`,
  `HUGGINGFACE_API_KEY`, `COHERE_API_KEY`, `OPENAI_API_KEY` (opcional)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `NODE_ENV=production`
- `PORT` (se a plataforma exigir uma porta específica)

## 6. Publicando como app instalável (PWA)

O `index.html` e `vite.config.ts` já incluem o essencial de uma SPA
responsiva. Para torná-lo instalável (ícone na tela inicial, funcionamento
offline básico), adicione um `manifest.json` + Service Worker — o
plugin `vite-plugin-pwa` (gratuito, open-source) automatiza isso:

```bash
npm install -D vite-plugin-pwa
```

## 7. Publicando como app nativo (Google Play / App Store)

Este projeto é uma aplicação **web**, não um app React Native. Para
distribuição nas lojas com o **SDK nativo do AdMob** funcionando de verdade
(veja `docs/ADMOB_STRATEGY.md`, seção 3), duas rotas comuns:

- **Capacitor** (Ionic): empacota o build web (`dist/`) num app
  Android/iOS nativo, mantendo 100% do código React atual. Gratuito e
  open-source. `npm install @capacitor/core @capacitor/cli`.
- **TWA (Trusted Web Activity)**: publica o PWA diretamente na Play Store
  sem reescrever nada, mas sem acesso a SDKs nativos como o AdMob — use
  Google Ad Manager "Rewarded Ads for the Web" nesse caso.

Ambas as rotas são compatíveis com a arquitetura atual sem precisar
reescrever a lógica de negócio (`src/services/economy`, `src/server/ai`).
