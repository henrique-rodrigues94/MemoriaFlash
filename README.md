# 🧠 FlashMind AI

Plataforma de estudos com flashcards inteligentes, repetição espaçada (SM-2),
tutor de voz, modo duelo (PvP) e modo professor — com geração de conteúdo por
IA usando **múltiplos provedores gratuitos com fallback automático**, e
monetização via créditos (anúncios + indicação de amigos) com upgrade PRO.

> **Stack real deste projeto:** aplicação web full-stack — **React 19 +
> Vite** no frontend e **Express (Node.js)** no backend, com **Firebase**
> (Auth + Firestore) para sincronização na nuvem. Não é um app React Native —
> veja a seção [Distribuição nativa](#-distribuição-nativa-google-play--app-store)
> para o caminho de publicação em lojas de app.

## ✨ O que tem aqui

- **Flashcards + SRS (SM-2):** criação manual ou por IA, revisão com
  repetição espaçada real (`src/services/srsEngine.ts`).
- **6 tarefas de IA com fallback automático entre 5 provedores gratuitos**
  (Gemini, Groq, OpenRouter, Hugging Face, Cohere) + 1 pago opcional +
  gerador local de última instância — nunca fica sem resposta. Veja
  [`docs/AI_PROVIDERS.md`](docs/AI_PROVIDERS.md).
- **Cache inteligente de respostas de IA** (Firestore) — pedidos repetidos
  (ex: "flashcards sobre mitose") reaproveitam a resposta salva em vez de
  gastar uma nova chamada de API. Ver seção "Cache" em
  [`docs/AI_PROVIDERS.md`](docs/AI_PROVIDERS.md).
- **Lembretes de revisão por notificação push** (Firebase Cloud Messaging,
  gratuito) — avisa quando há cartões vencidos, com horário configurável e
  aviso de sequência (streak). Veja
  [`docs/PUSH_NOTIFICATIONS.md`](docs/PUSH_NOTIFICATIONS.md).
- **Economia de créditos gratuita:** crédito diário automático, vídeos
  recompensados com limite anti-banimento e bônus de streak, e assinatura
  PRO. Veja [`docs/ADMOB_STRATEGY.md`](docs/ADMOB_STRATEGY.md).
- **Programa de indicação (referral)** seguro via Firebase Admin SDK —
  ninguém consegue se autocreditar créditos fraudulentamente.
- **Modo Duelo (PvP)**, **Tutor de Voz**, **Modo Professor** (turmas,
  dashboard, convites).
- **LGPD/GDPR:** banner de consentimento, política de privacidade, termos de
  uso e instruções de exclusão de dados prontos em `docs/`.
- **Regras de segurança do Firestore corrigidas** (o scaffold original
  permitia leitura/escrita pública total — corrigido, veja
  `firestore.rules`).

## 🚀 Rodando localmente

**Pré-requisitos:** Node.js 20+

```bash
npm install
cp .env.example .env
# edite o .env e adicione pelo menos 1 chave de IA gratuita — veja docs/AI_PROVIDERS.md
npm run dev
```

Abra `http://localhost:3000`. Sem nenhuma chave de IA configurada, o app
ainda funciona (usa o gerador local de fallback em vez de IA real).

### Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Vite + Express + hot reload) |
| `npm run build` | Build de produção (frontend + backend) |
| `npm run start` | Roda o build de produção (`node dist/server.cjs`) |
| `npm run test` | Roda a suíte de testes automatizados (Vitest) uma vez |
| `npm run test:watch` | Roda os testes em modo watch (reexecuta ao salvar) |
| `npm run typecheck` | Checagem de tipos TypeScript sem gerar arquivos |
| `npm run clean` | Remove `dist/` |

## 🧪 Testes automatizados

```bash
npm run test
```

55 testes cobrindo a lógica de negócio pura (sem mock de UI, sem rede real):

- `srsEngine.test.ts` — algoritmo de repetição espaçada (SM-2): progressão de intervalos, piso do fator de facilidade, contagem de cartões vencidos.
- `creditsEngine.test.ts` — limites diários de anúncio, streak de recompensa, frequency capping de intersticial, gasto de créditos.
- `studyStreak.test.ts` — trava o bug corrigido do streak de estudo (veja changelog abaixo) com casos de mesmo dia / dias consecutivos / sequência quebrada.
- `AIOrchestrator.test.ts` — fallback entre provedores, cooldown após rate limit, provedores não configurados são ignorados, `resetCooldown`.
- `aiCache.test.ts` — normalização da chave de cache (mesma chave para variações triviais de texto) e comportamento sem Firebase Admin configurado.
- `adTierStrategy.test.ts` — classificação de região e preços por tier.

Todos rodam automaticamente no CI (`.github/workflows/ci.yml`) em todo push/PR.

## 📁 Estrutura do projeto

```
flashmind-ai/
├── server.ts                    ← entrada do backend Express
├── src/
│   ├── App.tsx                  ← componente raiz React
│   ├── components/               ← telas e modais (Dashboard, Duelo, Voz, etc.)
│   ├── services/
│   │   ├── api.ts               ← chamadas do cliente para /api/gemini/*
│   │   ├── srsEngine.ts         ← algoritmo SM-2
│   │   ├── economy/             ← créditos, limites de anúncio, tiers por região
│   │   └── referral/            ← utilitários de indicação (cliente)
│   ├── server/
│   │   ├── ai/                  ← ★ orquestrador multi-provedor de IA
│   │   │   ├── AIOrchestrator.ts
│   │   │   ├── cache/           ← cache de respostas (Firestore)
│   │   │   ├── providers/       ← 1 arquivo por provedor (adapter pattern)
│   │   │   └── tasks/           ← 1 arquivo por funcionalidade de IA
│   │   ├── notifications/       ← job de lembretes + envio via FCM
│   │   ├── routes/               ← referral.ts, notifications.ts
│   │   ├── cron.ts              ← agendamento (node-cron)
│   │   ├── firebaseAdmin.ts
│   │   └── middleware/rateLimit.ts
│   ├── shared/                  ← código isomórfico (cliente + servidor)
│   ├── lib/                     ← firebase, i18n
│   └── types.ts
├── docs/                        ← toda a documentação legal e técnica
├── firestore.rules              ← regras de segurança (corrigidas)
└── .github/workflows/           ← CI/CD
```

## 🔑 Configuração de IA (múltiplos provedores gratuitos)

Nenhuma rota chama uma API de IA diretamente — tudo passa pelo
`AIOrchestrator`, que tenta os provedores configurados em ordem e faz
fallback automático quando um atinge o limite de uso ou fica indisponível.

**Leia [`docs/AI_PROVIDERS.md`](docs/AI_PROVIDERS.md)** para:
- links para criar cada chave gratuita (Gemini, Groq, OpenRouter, Hugging
  Face, Cohere);
- como checar o status dos provedores (`GET /api/ai/status`);
- como adicionar um novo provedor (arquivo único, ~50 linhas);
- como priorizar um provedor pago (`AI_PRIORITIZE_PAID=true`).

## 💰 Monetização: créditos, anúncios e indicação

Leia [`docs/ADMOB_STRATEGY.md`](docs/ADMOB_STRATEGY.md) para a estratégia
completa. Resumo:

- Toda a lógica de negócio vive em `src/services/economy/` — puramente
  funções TypeScript, testáveis, sem dependência de UI.
- Limites diários de anúncio seguem as recomendações anti-banimento do
  Google AdMob (`MAX_REWARDED_ADS_PER_DAY`, `MAX_INTERSTITIALS_PER_DAY`,
  `MIN_INTERSTITIAL_GAP_MS` em `economyConstants.ts`).
- **Importante:** os componentes de anúncio atuais **simulam** a experiência
  (é uma app web, o SDK nativo do AdMob não roda em navegador) — a lógica de
  créditos já está pronta para plugar o SDK real quando o app for
  distribuído nativamente (Capacitor/Expo) ou via Google Ad Manager na web.
  Detalhes na seção 3 de `docs/ADMOB_STRATEGY.md`.
- Programa de indicação: `src/server/routes/referral.ts` credita ambos os
  usuários com segurança via Firebase Admin SDK (o cliente nunca escreve
  créditos diretamente no banco).

## 🔥 Firebase

Leia [`docs/FIREBASE_SETUP.md`](docs/FIREBASE_SETUP.md) — inclui:
1. Como habilitar Autenticação Anônima (necessária para sync + indicação).
2. Como publicar as regras de segurança corrigidas do Firestore.
3. Como configurar o Service Account do Admin SDK.

## 🧑‍⚖️ Conformidade legal (LGPD/GDPR)

- [`docs/PRIVACY_POLICY.md`](docs/PRIVACY_POLICY.md)
- [`docs/TERMS_OF_USE.md`](docs/TERMS_OF_USE.md)
- [`docs/DATA_DELETION.md`](docs/DATA_DELETION.md)

> ⚠️ Esses documentos têm campos `[PREENCHER]` que precisam dos seus dados
> reais (CNPJ/CPF, e-mail de contato, foro) antes de publicar — nunca use
> dados fictícios em documentos legais. Recomenda-se revisão por um
> advogado antes do lançamento comercial.

O app já inclui um banner de consentimento de cookies
(`src/components/ConsentBanner.tsx`) com opções granulares
(essenciais/analytics/anúncios) e botão de rejeitar com o mesmo destaque do
aceitar, conforme exigido pela LGPD.

## 🐙 Git, GitHub e CI/CD

Leia [`docs/DEPLOY.md`](docs/DEPLOY.md) para o passo a passo completo. Resumo:

```bash
git init && git add . && git commit -m "chore: initial commit"
gh repo create flashmind-ai --private --source=. --remote=origin
git push -u origin main
```

- **CI** (`.github/workflows/ci.yml`): typecheck + build em todo push/PR.
- **CD** (`.github/workflows/deploy.yml`): deploy automático em `main`
  (exemplo pronto para Render.com; troque por Railway/Fly.io/Cloud Run
  conforme sua escolha — instruções em `docs/DEPLOY.md`).

## 📱 Distribuição nativa (Google Play / App Store)

Este projeto é uma aplicação web. Para publicar nas lojas com o SDK nativo
do AdMob funcionando de verdade, empacote o build (`dist/`) com
[Capacitor](https://capacitorjs.com/) (gratuito, open-source) — toda a
lógica de negócio em `src/services/` e `src/server/` continua igual,
troca-se apenas a camada de exibição de anúncios. Detalhes e checklist de
publicação (Play Console, App Store Connect) em `docs/DEPLOY.md` e
`docs/ADMOB_STRATEGY.md`.

## 🛠️ O que foi corrigido/melhorado nesta revisão

- 🐛 **Bug crítico:** o modelo `gemini-3.6-flash` usado no scaffold original
  não existe — corrigido para `gemini-2.5-flash` (configurável).
- 🔒 **Falha de segurança crítica:** as regras do Firestore permitiam
  `allow read, write: if true` para todas as coleções (qualquer pessoa podia
  ler/apagar dados de qualquer usuário) — corrigido para regras por dono.
- ➕ Orquestrador multi-provedor de IA com fallback automático (antes: só
  Gemini, ponto único de falha).
- ➕ Programa de indicação (referral) completo e seguro (não existia).
- ➕ Sistema de créditos com limites diários anti-banimento, streak de
  recompensa e concessão diária gratuita (antes: recompensa fixa sem
  limites).
- ➕ Anúncio intersticial com frequency capping (não existia).
- ➕ Banner de consentimento LGPD/GDPR (não existia).
- ➕ Cache inteligente de respostas de IA no Firestore (não existia).
- ➕ Notificações push de lembrete de revisão via Firebase Cloud Messaging,
  com job agendado no servidor (não existia).
- 🐛 **Bug corrigido:** `streakDays` (sequência de estudo) era inicializado
  uma vez e nunca mais atualizado em lugar nenhum do app — sempre mostrava
  o mesmo número. Corrigido em `src/services/studyStreak.ts`, junto com
  `dailyGoalCompleted`, que antes acumulava para sempre em vez de resetar
  por dia.
- ⚡ **Code-splitting:** telas pesadas (Duelo, Tutor de Voz, Modo Professor)
  e modais sob demanda agora carregam via `React.lazy`, reduzindo o bundle
  inicial de 1,16MB para ~290KB (o resto carrega sob demanda por tela).
- 💰 Preço da assinatura PRO agora se ajusta automaticamente por região
  (`adTierStrategy.ts` conectado ao `SubscriptionModal`), em vez de preço
  fixo único para todo o mundo.
- 🔗 Preview de link de indicação (Open Graph) — compartilhar o link no
  WhatsApp agora mostra uma mensagem convidativa em vez do preview
  genérico do app.
- ✅ 55 testes automatizados (Vitest) cobrindo SRS, economia de créditos,
  fallback de IA e cache — rodam no CI a cada push.
- ➕ Rate limiting básico nas rotas de API.
- ➕ Documentação legal e técnica completa + CI/CD.


---
## 🧹 Melhorias implementadas (refatoração 2026)

Este projeto passou por uma refatoração significativa para aumentar a robustez, segurança e manutenibilidade. As principais melhorias são:

### Backend
- **Estrutura modular**: rotas extraídas para `src/server/routes/` (aiRoutes, referralRoutes, healthRoutes), centralizando a lógica por funcionalidade.
- **Middleware de erro global**: tratamento padronizado de exceções, com respostas JSON contendo `error`, `code` e detalhes de validação (quando aplicável).
- **Validação de entrada com Zod**: schemas declarativos para todas as rotas, garantindo integridade dos dados e reduzindo vulnerabilidades (ex: injeção, campos inválidos).
- **Logs estruturados**: substituição de `console.log/error` por **Pino**, com saída JSON em produção e formato legível em desenvolvimento, facilitando a depuração e monitoramento.
- **Segurança reforçada**: adição do middleware **Helmet** para definição de headers de segurança (CSP, XSS, etc.) e rate limiting refinado por rota (específico para endpoints de IA).
- **Autenticação robusta**: middleware `authenticate` para verificação de tokens Firebase em todas as rotas protegidas, com tratamento de erros de token inválido/expirado.

### Frontend (sugestões para próximos passos)
- Recomendação de adoção de **React Query** para gerenciamento de estado de requisições e cache.
- Recomendação de **Zustand** para gerenciamento de estado global (usuário, créditos, tema).

### Testes e qualidade
- Base para testes de integração com **Supertest** (em desenvolvimento).
- Cobertura de testes unitários já existente (55+ testes) mantida e ampliada para novas rotas.

### Documentação
- README atualizado com instruções claras de instalação, execução e estrutura de pastas.
- Em breve: guia de contribuição (CONTRIBUTING.md) e changelog detalhado.

---

Essas melhorias visam tornar o **FlashMind AI** mais escalável, seguro e fácil de contribuir. Fique à vontade para abrir issues ou sugerir novas funcionalidades!