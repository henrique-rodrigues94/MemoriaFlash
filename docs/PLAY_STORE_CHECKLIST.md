# MemoriaFlash — checklist de publicação

## Aplicativo

- [x] React/Vite build configurado
- [x] Capacitor Android versionado
- [x] Login Google
- [x] Firebase Authentication
- [x] Firestore
- [x] Scanner/OCR
- [x] PDF/TXT
- [x] Geração de cards
- [x] Feedback de cards
- [x] Relato de problema
- [x] AdMob/Billing integrados em código
- [x] Controle de exclusão de conta no perfil
- [x] Política de privacidade em `public/privacy.html`

## Segurança e backend

- [x] Contadores de IA protegidos no backend/Firestore Rules
- [x] `contentRequests` protegidos por proprietário
- [x] `sourceChunks` protegidos por proprietário
- [x] Conteúdo compartilhado somente via Agent/Admin SDK
- [x] Consentimento para alimentar conteúdo compartilhado
- [x] Deduplicação por SHA-256
- [x] Recuperação de requests presos em `processing`
- [x] Limite de tentativas/retries
- [x] Exclusão autenticada de conta e dados pessoais
- [x] Checklist de Data Safety documentado
- [x] Runbook de release documentado
- [x] CI configurado para Node.js 22
- [ ] Revisão final das variáveis de produção
- [ ] Confirmar backend HTTPS de produção
- [ ] Testar rate limiting em produção
- [ ] Testar regras Firestore em projeto de produção

## Homologação Android

- [ ] `npm ci`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run android:sync:prod`
- [ ] Gerar AAB Release assinado
- [ ] Instalar e testar em aparelho físico
- [ ] Login Google em release
- [ ] Scanner/câmera
- [ ] PDF/TXT
- [ ] PDF grande dentro do limite de conteúdo
- [ ] PDF sem camada de texto
- [ ] Geração de cards
- [ ] Sincronização Firestore
- [ ] Feedback/relato de problema
- [ ] Exclusão de conta
- [ ] AdMob em produção
- [ ] Google Play Billing em produção
- [ ] Testar recuperação após perda de conexão
- [ ] Testar encerramento/reabertura do app

## Google Play Console

- [ ] Nome, descrição e categoria
- [ ] Ícone 512x512
- [ ] Screenshots de celular
- [ ] Screenshots de tablet, se aplicável
- [ ] Feature graphic
- [ ] Publicar `public/privacy.html` em URL HTTPS estável
- [x] Roteiro Data Safety documentado
- [ ] Formulário Data Safety preenchido
- [ ] Classificação indicativa
- [ ] Público-alvo
- [ ] Permissões declaradas
- [ ] Conta de desenvolvedor configurada
- [ ] Teste interno
- [ ] Teste fechado
- [ ] AAB enviado
- [ ] Produção

## Documentação de release

- `docs/PLAY_STORE_DATA_SAFETY.md`
- `docs/RELEASE_RUNBOOK.md`
- `public/privacy.html`
