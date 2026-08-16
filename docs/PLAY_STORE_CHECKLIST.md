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

## Segurança e backend

- [x] Contadores de IA protegidos no backend/Firestore Rules
- [x] `contentRequests` protegidos por proprietário
- [x] `sourceChunks` protegidos por proprietário
- [x] Conteúdo compartilhado somente via Agent/Admin SDK
- [x] Consentimento para alimentar conteúdo compartilhado
- [ ] Revisão final das variáveis de produção
- [ ] Confirmar backend HTTPS de produção
- [ ] Testar rate limiting em produção
- [ ] Testar regras Firestore em projeto de produção

## Homologação Android

- [ ] `npm run build`
- [ ] `npm run android:sync:prod`
- [ ] Gerar AAB Release
- [ ] Instalar e testar em aparelho físico
- [ ] Login Google em release
- [ ] Scanner/câmera
- [ ] PDF/TXT
- [ ] Geração de cards
- [ ] Sincronização Firestore
- [ ] Feedback/relato de problema
- [ ] AdMob em produção
- [ ] Google Play Billing em produção
- [ ] Testar recuperação após perda de conexão

## Google Play Console

- [ ] Nome, descrição e categoria
- [ ] Ícone 512x512
- [ ] Screenshots de celular
- [ ] Screenshots de tablet, se aplicável
- [ ] Feature graphic
- [ ] Política de privacidade publicada
- [ ] Formulário Data Safety
- [ ] Classificação indicativa
- [ ] Público-alvo
- [ ] Permissões declaradas
- [ ] Conta de desenvolvedor configurada
- [ ] Teste interno
- [ ] Teste fechado
- [ ] AAB enviado
- [ ] Produção
