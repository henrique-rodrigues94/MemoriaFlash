# Estratégia de Monetização — Anúncios, Créditos e Indicação

Este documento descreve a estratégia de monetização implementada no código
(`src/services/economy/`) e como ajustá-la.

## 1. Princípio geral

> **O app é gratuito por padrão.** O acesso à geração por IA é pago em
> **créditos**, não em dinheiro. Créditos vêm de 4 fontes:

| Fonte | Quantidade | Onde no código |
|---|---|---|
| Crédito diário gratuito | +5/dia, automático ao abrir o app | `applyDailyFreeGrantIfNeeded` |
| Vídeo recompensado (rewarded) | +10 a +25 (cresce com streak) | `applyRewardedAdWatched` |
| Indicação de amigo (referral) | +30 para quem indica, +15 para quem entra | `src/server/routes/referral.ts` |
| Assinatura PRO | Créditos ilimitados, zero anúncios | `SubscriptionModal.tsx` |

Todas as constantes ficam em **`src/services/economy/economyConstants.ts`** —
é o único arquivo que você precisa editar para ajustar a economia inteira.

## 2. Regras anti-banimento do AdMob (por que os limites existem)

O Google AdMob suspende contas por "atividade inválida" quando detecta
padrões de uso anormais. As regras abaixo já estão implementadas no motor de
créditos:

- **Vídeo recompensado:** máximo de `8/dia` por usuário (recomendado manter
  o uso real perto de `6/dia`); nunca recompense o clique no anúncio, apenas
  a visualização completa.
- **Intersticial:** máximo de `4/dia`, com intervalo mínimo de `3 minutos`
  entre exibições — nunca mostrado em sequência com outro anúncio.
- **Banner:** exibição contínua é permitida, mas nunca sobreposto a botões
  (distância mínima recomendada: 50dp/px).
- Sempre teste com IDs de anúncio de teste do AdMob antes de publicar:
  - Android Banner: `ca-app-pub-3940256099942544/6300978111`
  - Android Interstitial: `ca-app-pub-3940256099942544/1033173712`
  - Android Rewarded: `ca-app-pub-3940256099942544/5224354917`
  - iOS Banner: `ca-app-pub-3940256099942544/2934735716`
  - iOS Interstitial: `ca-app-pub-3940256099942544/4411468910`
  - iOS Rewarded: `ca-app-pub-3940256099942544/1712485313`

## 3. Sobre a implementação atual (web) vs. AdMob nativo

**Importante para não gerar expectativa errada:** o código-fonte deste
projeto é uma aplicação **web (Vite + React + Express)**, não um binário
nativo Android/iOS. O SDK real do Google AdMob só funciona dentro de um app
nativo (Android/iOS) ou de um wrapper como Capacitor/Expo — ele **não roda
dentro de uma página web comum**.

Por isso:

- Os componentes `AdMobRewardedModal.tsx` e `AdMobInterstitialModal.tsx`
  atualmente **simulam** a experiência de um anúncio (vídeo de exemplo +
  temporizador) para que toda a lógica de créditos, limites diários e
  streak funcione de ponta a ponta, sem depender de contas de anúncio reais.
- A lógica de negócio (limites, streak, tiers por região) já está pronta e
  desacoplada da UI — é só trocar o componente visual pela integração real
  quando você tiver a distribuição nativa ou o AdSense configurado:

| Cenário de distribuição | O que usar no lugar do simulador |
|---|---|
| App nativo Android/iOS (via Capacitor/Expo) | `react-native-google-mobile-ads` ou o plugin oficial do AdMob para Capacitor |
| Site/PWA (como está hoje) | Google AdSense (anúncios display) — o vídeo recompensado "puro" não existe no AdSense; para recompensar assistir vídeo na web, use **Google Ad Manager com "Rewarded Ads for the Web"** |
| Ambos | Mantenha a mesma interface `src/services/economy/creditsEngine.ts` — ela não sabe (nem precisa saber) qual SDK de anúncio está por trás |

## 4. Estratégia por região (eCPM tiers)

`src/services/economy/adTierStrategy.ts` classifica o usuário em 4 tiers
(usando o idioma do navegador como proxy do país, já que não há geolocalização
paga configurada):

| Tier | Regiões-exemplo | eCPM (vídeo) | Estratégia |
|---|---|---|---|
| 1 | EUA, Reino Unido, Alemanha, Japão | $18–50 | Priorizar vídeo recompensado |
| 2 | França, Espanha, Itália, Coreia | $8–20 | Priorizar vídeo recompensado |
| 3 | Brasil, México, Polônia, Turquia | $3–8 | Priorizar intersticial (volume) |
| 4 | Índia, Indonésia, Nigéria, etc. | $0.5–3 | Priorizar intersticial (volume) |

Ao empacotar como app nativo, troque a fonte do "locale" por
`Localization.getLocales()` (Expo) ou o país informado pelo próprio SDK do
AdMob, que é mais preciso que o idioma do navegador.

**Preço da assinatura PRO por região:** `getRegionalPricing(tier)`, na mesma
`adTierStrategy.ts`, já é usado por `SubscriptionModal.tsx` para exibir o
preço mensal/anual ajustado ao poder aquisitivo de cada tier automaticamente
— nenhuma tela precisa saber em qual região o usuário está, só chama essa
função. Ajuste os valores por tier conforme sua estratégia de preços real.

## 5. Programa de indicação (referral)

Implementado com segurança em `src/server/routes/referral.ts` usando o
**Firebase Admin SDK** — o cliente nunca escreve créditos diretamente no
Firestore (isso seria um vetor de fraude trivial). Fluxo:

1. Usuário A compartilha `flashmind.app/?ref=FM7X2K9` (link gerado por
   `buildReferralLink`).
2. Usuário B abre o link → código fica pendente em `localStorage`.
3. Quando B se autentica (login Google ou Auth Anônima do Firebase), o
   backend valida o código, credita B (+15) e A (+30) numa transação
   atômica do Firestore, e bloqueia autoindicação e resgate duplicado.

Veja `docs/FIREBASE_SETUP.md` para habilitar a Autenticação Anônima
(necessária para o programa de indicação funcionar) e configurar as
credenciais de Service Account do Admin SDK.

## 6. Ajustando a economia

Todos os números abaixo vivem em `src/services/economy/economyConstants.ts`:

```ts
DAILY_FREE_CREDITS: 5,
AD_REWARD_BASE: 10,
AD_REWARD_STREAK_TIERS: [...],
MAX_REWARDED_ADS_PER_DAY: 8,
MAX_INTERSTITIALS_PER_DAY: 4,
MIN_INTERSTITIAL_GAP_MS: 3 * 60 * 1000,
REFERRAL_WELCOME_BONUS: 15,
REFERRAL_REFERRER_BONUS: 30,
```

Altere esses valores conforme seus dados reais de eCPM e LTV forem chegando
— comece conservador (os valores padrão já seguem as recomendações do
Google) e ajuste com base em métricas reais de retenção vs. receita.
