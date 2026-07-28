# Notificações Push (Firebase Cloud Messaging)

Lembretes automáticos de revisão — a alavanca de retenção mais importante
para um app de repetição espaçada (é o motivo do Anki/Duolingo funcionarem).
Implementado com **Firebase Cloud Messaging (FCM)**, 100% gratuito, sem
limite de envios.

## Como funciona

1. O usuário ativa lembretes no app (ícone de sino no cabeçalho →
   `NotificationSettingsModal`). O navegador pede permissão de notificação e
   gera um **token FCM** para aquele dispositivo.
2. O token e as preferências (horário do lembrete, aviso de streak) são
   salvos em `notificationPrefs/{uid}` no Firestore — **diretamente pelo
   cliente**, sem precisar de backend (a regra de segurança já garante que
   cada usuário só edita o próprio documento).
3. No servidor, um job agendado (`src/server/cron.ts`, roda a cada hora
   cheia via `node-cron`) verifica quem quer lembrete naquela hora UTC,
   calcula cartões vencidos (reaproveitando `getDueCardCount` do
   `srsEngine.ts`) e envia o push via **Firebase Admin SDK**
   (`admin.messaging()`), a única forma de enviar FCM com segurança — o
   cliente nunca tem permissão de disparar notificação para si mesmo
   diretamente (isso abriria brecha para spam).
4. Só envia se houver pelo menos 1 cartão vencido — sem notificação vazia.

## Configuração necessária

### 1. Gerar a chave VAPID (obrigatória para Web Push)

Console do Firebase → **Configurações do Projeto** → **Cloud Messaging** →
role até **"Web Push certificates"** → **Gerar par de chaves**.

Copie a chave gerada para o `.env`:

```
VITE_FIREBASE_VAPID_KEY="sua-chave-aqui"
```

> Repare no prefixo `VITE_` — é isso que faz o Vite expor a variável para o
> código do navegador (`import.meta.env.VITE_FIREBASE_VAPID_KEY`). Variáveis
> sem esse prefixo só existem no servidor.

### 2. Firebase Admin SDK

O envio efetivo do push (job agendado + botão de teste) exige as mesmas
credenciais do Admin SDK já usadas pelo programa de indicação — veja
[`docs/FIREBASE_SETUP.md`](FIREBASE_SETUP.md) seção 3. Sem isso, os usuários
ainda conseguem *ativar* lembretes (o token é salvo normalmente), mas nada é
enviado até o servidor ter as credenciais configuradas.

### 3. HTTPS obrigatório em produção

Web Push só funciona em `https://` (ou `localhost` durante desenvolvimento).
Garanta que sua hospedagem sirva o app via HTTPS (a maioria das opções
listadas em `docs/DEPLOY.md` já faz isso automaticamente).

### 4. Ícone da notificação (opcional)

O service worker referencia `/icon-192.png`. Adicione um ícone real em
`public/icon-192.png` (192×192px) — sem ele, a notificação ainda funciona,
só aparece sem ícone customizado.

## Testando localmente

1. Configure `VITE_FIREBASE_VAPID_KEY` e as credenciais do Admin SDK no
   `.env`.
2. `npm run dev` e abra `http://localhost:3000`.
3. Clique no sino 🔔 no cabeçalho → ative os lembretes diários.
4. Aceite a permissão de notificação do navegador.
5. Clique em **"Enviar notificação de teste"** — deve chegar em poucos
   segundos, mesmo com a aba em segundo plano.

## Limitações conhecidas / próximos passos

- **iOS Safari:** Web Push só funciona em iOS 16.4+ e exige que o site
  esteja instalado como PWA ("Adicionar à Tela de Início") — limitação do
  próprio Apple, não do FCM. Ao empacotar como app nativo (ver
  `docs/DEPLOY.md`), use `@react-native-firebase/messaging` em vez do SDK
  web para cobertura total no iOS.
- **Detecção de "streak em risco":** hoje o aviso de sequência apenas
  informa o valor atual de `streakDays` junto do lembrete de cartões
  vencidos — não há ainda um sinal confiável de "usuário ainda não estudou
  hoje" no modelo de dados (`UserStats` não guarda a data do último
  estudo). Para uma detecção precisa, adicione um campo `lastStudyDateKey`
  atualizado em `handleFinishStudySession` (`src/App.tsx`).
- **Múltiplas instâncias do servidor:** o `node-cron` roda dentro do
  próprio processo Node. Com mais de uma instância do servidor rodando ao
  mesmo tempo (escala horizontal), o job rodaria duplicado. Para escalar,
  mova o agendamento para o Cloud Scheduler do GCP (gratuito até certo
  volume) chamando um endpoint protegido, ou adicione um lock distribuído.
