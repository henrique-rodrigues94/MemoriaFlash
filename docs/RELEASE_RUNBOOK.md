# MemoriaFlash — runbook de release Android

## Pré-release

- [ ] Confirmar versão e versionCode.
- [ ] Confirmar Firebase de produção.
- [ ] Confirmar backend HTTPS de produção.
- [ ] Confirmar IDs reais do AdMob.
- [ ] Confirmar produtos reais do Google Play Billing.
- [ ] Confirmar OAuth/Google Login para o app Android de produção.
- [ ] Confirmar política de privacidade pública.
- [ ] Confirmar Data Safety.

## Build

```bash
npm ci
npm run typecheck
npm run test
npm run build
npm run android:sync:prod
```

Depois, no Android Studio:

1. abrir `android/`;
2. sincronizar Gradle;
3. configurar assinatura de release com keystore mantido fora do Git;
4. gerar Android App Bundle (`.aab`);
5. verificar `applicationId` e `versionCode`;
6. instalar o APK de teste derivado do release em aparelho físico quando necessário.

## Smoke test obrigatório

- Login Google
- Logout/login novamente
- criação manual de deck
- estudo e progresso
- scanner/câmera
- PDF com texto
- TXT
- PDF sem camada de texto
- geração de cards
- feedback positivo/negativo
- relato de problema
- Firestore offline/online
- anúncios
- compra/restauração PRO
- encerramento e reabertura do app

## Critério de aprovação

Não publicar se houver erro bloqueante em autenticação, geração/estudo, sincronização, compra, anúncios, segurança ou recuperação de conexão.
