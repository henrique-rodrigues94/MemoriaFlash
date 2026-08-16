# MemoriaFlash — runbook de release Android

## Pré-release

- [ ] Confirmar versão e versionCode.
- [ ] Confirmar Firebase de produção.
- [ ] Confirmar backend HTTPS de produção.
- [ ] Confirmar IDs reais do AdMob.
- [ ] Confirmar produtos reais do Google Play Billing.
- [ ] Confirmar OAuth/Google Login para o app Android de produção.
- [ ] Confirmar política de privacidade pública.
- [ ] Confirmar página pública de exclusão de conta.
- [ ] Confirmar Data Safety.

## Validação automática

```bash
npm ci
npm run typecheck
npm run test
npm run build
npm run release:check
```

Para validar a configuração final de produção:

```bash
RELEASE_PRODUCTION=true npm run release:check
```

O preflight de produção exige HTTPS, IDs reais do AdMob, produtos/Base Plans, `GOOGLE_PLAY_RTDN_TOKEN` e os arquivos de release.

## Build local de homologação

```bash
npm run android:sync:prod
cd android
./gradlew bundleRelease --no-daemon
```

A assinatura deve usar uma keystore de produção mantida fora do Git e as variáveis:

- `MEMORIAFLASH_KEYSTORE_PATH`
- `MEMORIAFLASH_KEYSTORE_PASSWORD`
- `MEMORIAFLASH_KEY_ALIAS`
- `MEMORIAFLASH_KEY_PASSWORD`

## Build oficial reproduzível

Use o workflow manual `.github/workflows/android-release.yml`.

Configure no GitHub Actions os secrets:

- `ANDROID_KEYSTORE_BASE64`
- `MEMORIAFLASH_KEYSTORE_PASSWORD`
- `MEMORIAFLASH_KEY_ALIAS`
- `MEMORIAFLASH_KEY_PASSWORD`
- `VITE_API_BASE_URL`
- `VITE_ADMOB_APP_ID`
- `VITE_ADMOB_BANNER_AD_UNIT_ID`
- `VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID`
- `VITE_ADMOB_REWARDED_AD_UNIT_ID`
- `VITE_ADMOB_NATIVE_AD_UNIT_ID` (se utilizado)
- `VITE_PLAY_MONTHLY_PRODUCT_ID`
- `VITE_PLAY_MONTHLY_BASE_PLAN_ID`
- `VITE_PLAY_ANNUAL_PRODUCT_ID`
- `VITE_PLAY_ANNUAL_BASE_PLAN_ID`
- `GOOGLE_PLAY_RTDN_TOKEN`

O workflow cria o AAB assinado somente quando a keystore e a configuração de produção estão presentes.

## Configuração Google Play Billing

1. Criar produtos de assinatura e Base Plans.
2. Conceder à service account as permissões necessárias no Play Console.
3. Configurar a Google Play Developer API.
4. Configurar RTDN/Pub/Sub apontando para `/api/billing/rtdn?token=SEU_SEGREDO`.
5. Manter `GOOGLE_PLAY_RTDN_TOKEN` somente no backend.
6. Validar compra e restauração em Internal testing.

## Exclusão de conta

- O app oferece exclusão autenticada dentro da conta.
- `/delete-account.html` permite solicitar exclusão sem o app instalado.
- Solicitações externas ficam em `accountDeletionRequests`.
- O administrador lista pendências em `GET /api/billing/account-deletion/requests` usando `x-admin-token`.
- O administrador processa uma solicitação com `POST /api/billing/account-deletion/process` e `{ "requestId": "..." }`.
- O processamento exclui os dados conhecidos e a identidade Firebase.

## Smoke test obrigatório

- Login Google
- Logout/login novamente
- criação manual de deck
- estudo e progresso
- scanner/câmera
- PDF com texto
- TXT
- PDF sem camada de texto
- PDF grande dentro do limite
- geração de cards
- feedback positivo/negativo
- relato de problema
- Firestore offline/online
- notificações e preferências
- anúncios com Ad Inspector
- compra/restauração PRO
- renovação/cancelamento/expiração/reembolso quando aplicável
- encerramento e reabertura do app
- reinicialização do aparelho
- exclusão dentro do app
- solicitação pública + processamento administrativo

## Critério de aprovação

Não publicar se houver erro bloqueante em autenticação, geração/estudo, sincronização, compra, anúncios, segurança, exclusão de conta ou recuperação de conexão.
