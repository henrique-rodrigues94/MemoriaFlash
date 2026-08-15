# Auditoria de monetização — MemoriaFlash

Data: 2026-08-15

## Estado atual

O aplicativo está temporariamente operando em **plano gratuito**. O PRO não deve ser liberado por alteração local de estado.

## AdMob — NÃO pronto para produção

### Encontrado no código

- `src/lib/adMobConfig.ts` continha IDs oficiais de teste do Google como fallback.
- `src/components/AdMobBanner.tsx` é uma faixa de interface/promocional; ela não é uma integração real do Google Mobile Ads SDK.
- `src/components/AdMobRewardedModal.tsx` simula um anúncio com um contador de 5 segundos e concede recompensa. Isso não é um Rewarded Ad real do AdMob.
- `package.json` não possui uma biblioteca nativa de Google Mobile Ads.

### Correção aplicada

Os IDs de demonstração agora só são usados durante desenvolvimento. Em produção, os IDs precisam vir das variáveis `VITE_ADMOB_*`; não existe mais fallback para IDs de teste.

### Pendências antes de monetizar

1. Integrar um SDK/plugin nativo de Google Mobile Ads para Capacitor Android.
2. Configurar o App ID e os ad unit IDs reais no AdMob.
3. Implementar banner/interstitial/rewarded reais e callbacks de carregamento, falha, fechamento e recompensa.
4. Não conceder recompensa por timer local; a recompensa deve ocorrer somente no callback de recompensa do SDK.
5. Configurar dispositivo de teste/Ad Inspector durante homologação.
6. Publicar e verificar `app-ads.txt` no domínio de desenvolvedor associado ao app.
7. Passar pela revisão de prontidão do AdMob antes de depender da receita de anúncios.

## Google Play Billing — NÃO pronto para produção

### Pontos positivos encontrados

- Existe backend dedicado em `src/server/routes/billing.ts`.
- O backend verifica o `purchaseToken` no Google Play antes de liberar o estado PRO.
- Existe suporte inicial a RTDN via Pub/Sub.
- Existe persistência de `playPurchaseToken`, `playProductId`, estado PRO e data de expiração.
- Existe reconhecimento (`acknowledge`) no servidor.

### Bloqueadores encontrados

1. Não foi encontrada implementação cliente que abra o fluxo real do Google Play Billing e envie o `purchaseToken` ao endpoint `/api/billing/verify-purchase`.
2. O `App.tsx` possuía um caminho de UI que marcava `isPro: true` diretamente ao clicar em assinar, sem compra real. O PRO foi desativado na interface até que o Billing seja integrado de verdade.
3. O RTDN ainda precisa de autenticação/verificação da mensagem Pub/Sub e idempotência por `messageId` antes de ser considerado produção.
4. A conta de serviço do Google Play e permissões do Play Console não podem ser verificadas somente pelo repositório; precisam ser configuradas no ambiente de produção.
5. Os produtos/base plans reais do Play Console ainda precisam ser confirmados e testados em uma faixa de teste interna.

## Plano de produção recomendado

### Fase 1 — agora

- Aplicativo 100% gratuito.
- Limite gratuito de IA permanece em 200 cards.
- Não liberar PRO por código local.
- Manter o backend de Billing desligado/sem exposição ao usuário.

### Fase 2 — AdMob

- Criar app real no AdMob.
- Criar ad units reais.
- Integrar SDK nativo.
- Testar com IDs de teste/dispositivo de teste.
- Configurar app-ads.txt e aprovação de prontidão.
- Só então habilitar anúncios de produção.

### Fase 3 — Play Billing

- Criar assinatura e base plans no Play Console.
- Integrar cliente Android com Play Billing.
- Enviar purchase token para o backend.
- Validar token no Google Play Developer API.
- Conceder entitlement somente após compra válida.
- Acknowledge no servidor.
- Configurar RTDN autenticado e idempotente.
- Testar compra, renovação, cancelamento, expiração, grace period, hold e reembolso.
- Só então habilitar o botão PRO.

## Conclusão

**Plano gratuito: OK.**

**AdMob real: NÃO pronto.** O código atual contém componentes de demonstração, não uma integração real do SDK.

**Play Billing real: NÃO pronto.** O backend possui uma base boa para validação, mas falta o fluxo de compra real no cliente Android e endurecimento do RTDN. O botão PRO foi desativado para evitar uma falsa assinatura.
