# Auditoria de monetização — MemoriaFlash

Data: 2026-08-15

## Estado atual

O aplicativo opera em **plano gratuito**. O PRO permanece bloqueado na interface e não deve ser liberado por alteração local de estado.

## AdMob

### Implementado no código

- SDK nativo `@capacitor-community/admob` 8.x adicionado ao projeto.
- Inicialização nativa somente no Android.
- Fluxo de consentimento UMP preparado.
- Banner real do AdMob substituiu a antiga faixa visual.
- Interstitial real substituiu a tela simulada.
- Rewarded real substituiu o contador de 5 segundos.
- A recompensa só é aplicada pelo callback `RewardAdPluginEvents.Rewarded`.
- IDs de teste são usados somente em desenvolvimento; produção exige `VITE_ADMOB_*`.

A versão 8.0.0 do plugin é a release compatível com Capacitor 8 e documenta banner, interstitial, rewarded e consentimento. citeturn3search0turn3search1

### Ainda necessário antes de produção

1. `npm install` e `npx cap sync android` na máquina de build.
2. Criar/gerar a pasta Android com `npx cap add android` se ainda não existir.
3. Configurar o App ID real no `AndroidManifest.xml`/`strings.xml`.
4. Criar os ad units reais no AdMob.
5. Configurar Privacy & Messaging/consentimento no AdMob.
6. Testar em dispositivo real com IDs de teste e Ad Inspector.
7. Configurar e verificar `app-ads.txt`.
8. Obter aprovação/prontidão do AdMob antes de depender da receita.

## Google Play Billing

### Implementado

- Backend de validação no Google Play Developer API.
- Verificação server-side do `purchaseToken`.
- Acknowledge server-side.
- Persistência do token, produto, estado PRO e expiração.
- Cliente `src/services/billing/playBilling.ts` usando `@capgo/native-purchases` 8.x.
- Compra Android exige produto + Base Plan configurados no Play Console.
- O cliente envia o token para `/api/billing/verify-purchase` e só considera PRO após resposta validada do backend.
- Função de restauração de assinatura e abertura do gerenciamento nativo também foram adicionadas.

### Ainda necessário antes de produção

1. Criar os produtos e Base Plans reais no Play Console.
2. Definir `VITE_PLAY_MONTHLY_PRODUCT_ID`, `VITE_PLAY_MONTHLY_BASE_PLAN_ID`, `VITE_PLAY_ANNUAL_PRODUCT_ID` e `VITE_PLAY_ANNUAL_BASE_PLAN_ID`.
3. Integrar o botão de assinatura real à UI somente depois dos testes internos.
4. Configurar a service account e permissões do Play Console.
5. Endurecer o RTDN com autenticação/verificação da mensagem Pub/Sub e idempotência por `messageId`.
6. Testar compra, restauração, renovação, cancelamento, grace period, account hold, expiração e reembolso.
7. Publicar primeiro em Internal testing.

## Proteção contra PRO falso

A tela `SubscriptionModalV2` não possui mais botão que altera `isPro`. O antigo callback de UI continua isolado no `App.tsx`, mas a interface atual não o chama. Antes de reativar qualquer CTA de assinatura, ele deverá chamar `purchasePlaySubscription()` e atualizar o estado somente após validação do backend.

## Lockfile

O `package.json` já inclui o SDK AdMob, porém o `package-lock.json` existente foi gerado antes dessa dependência. Antes de um build limpo/CI com `npm ci`, execute `npm install` para regenerar o lockfile e depois faça commit dele.

## Conclusão

**Plano gratuito: OK.**

**AdMob: 🟡 integração nativa implementada, ainda não pronto para produção.** Faltam configuração externa, projeto Android sincronizado, IDs reais, consentimento/configuração AdMob e homologação.

**Play Billing: 🟡 backend + cliente base implementados, ainda não pronto para produção.** Faltam produtos reais, ligação do CTA à compra, RTDN endurecido e testes completos no Play Console.

**Publicação monetizada: ❌ ainda não liberar.**
