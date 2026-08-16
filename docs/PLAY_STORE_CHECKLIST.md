# MemoriaFlash — checklist de publicação

## 1. Aplicativo

- [x] React/Vite build configurado
- [x] Capacitor Android versionado
- [x] Login Google
- [x] Firebase Authentication
- [x] Firestore
- [x] Scanner/OCR
- [x] PDF/TXT
- [x] Geração de cards independente do MemoriaFlashAgent
- [x] Feedback de cards durante o estudo
- [x] Relato de problema com contexto do card
- [x] Feedback persistido no Firestore para processamento assíncrono pelo Agent
- [x] AdMob/Billing integrados em código
- [x] Controle de exclusão de conta no perfil
- [x] Página pública de solicitação de exclusão fora do app
- [x] Processamento administrativo das solicitações externas de exclusão
- [x] Política de privacidade pública com link para exclusão

## 2. Segurança e backend

- [x] Contadores de IA protegidos no backend/Firestore Rules
- [x] `contentRequests` protegidos por proprietário
- [x] `sourceChunks` protegidos por proprietário
- [x] Conteúdo compartilhado somente via Agent/Admin SDK
- [x] Consentimento para alimentar conteúdo compartilhado
- [x] Deduplicação por SHA-256
- [x] Recuperação de requests presos em `processing`
- [x] Limite de tentativas/retries
- [x] Exclusão autenticada de conta e dados pessoais
- [x] Exclusão em lotes para contas com grande volume de documentos
- [x] Solicitação pública de exclusão sem enumeração de contas
- [x] Processamento administrativo protegido por `ADMIN_TOKEN`
- [x] RTDN protegido por token secreto + idempotência por `messageId`
- [x] Validação server-side do produto retornado pelo Google Play
- [x] Checklist de Data Safety documentado
- [x] Runbook de release documentado
- [x] CI configurado para Node.js 22
- [x] Testes unitários alinhados aos contratos atuais do app
- [x] Suite de testes atualizada para o modelo sem rewarded ads/créditos
- [x] Cenário de reset de cooldown do AIOrchestrator coberto
- [x] CI confirma typecheck, testes, release preflight e build de produção
- [x] Preflight de produção valida HTTPS, IDs de AdMob, produtos Play e RTDN

### Validações externas obrigatórias antes da publicação

- [ ] Confirmar backend HTTPS de produção e `/api/health`
- [ ] Testar rate limiting em produção
- [ ] Testar regras Firestore no projeto de produção
- [ ] Revisar variáveis de produção no host/CI
- [ ] Confirmar Firebase Project usado pelo APK/AAB de produção

## 3. Homologação Android

- [x] `npm ci` — CI
- [x] `npm run typecheck` — CI
- [x] `npm run test` — CI
- [x] `npm run build` — CI
- [x] `npm run android:sync` — CI
- [x] Compilação do APK debug — CI
- [x] Compilação do AAB Release candidato — workflow `release-candidate.yml`
- [x] Configuração de assinatura Release implementada
- [x] Workflow manual para AAB Release assinado implementado
- [x] Sync de produção impede IDs AdMob de teste

### Para você testar agora

1. Abra **GitHub → MemoriaFlash → Actions**.
2. Execute **release-candidate** manualmente.
3. Aguarde o workflow terminar.
4. Baixe o artifact `memoriaflash-release-candidate`.
5. Use o AAB no fluxo de teste interno/fechado do Google Play quando estiver com assinatura de produção configurada.

### Testes físicos / serviços externos

- [ ] `npm run android:sync:prod` com variáveis reais
- [ ] Gerar AAB Release assinado com keystore de produção
- [ ] Instalar/testar release em aparelho físico
- [ ] Login Google em release
- [ ] Scanner/câmera
- [ ] PDF/TXT
- [ ] PDF grande dentro do limite de conteúdo
- [ ] PDF sem camada de texto
- [ ] Geração independente do Agent
- [ ] Geração quando Agent está desligado
- [ ] Sincronização Firestore
- [ ] Feedback/relato de problema
- [ ] Confirmar `cardFeedback` como `pending`
- [ ] Executar Agent e confirmar correção do card
- [ ] Confirmar `cardFeedback` como `processed`
- [ ] Exclusão de conta dentro do app
- [ ] Solicitação externa de exclusão + processamento administrativo
- [ ] AdMob com IDs de produção e Ad Inspector
- [ ] Google Play Billing em teste interno
- [ ] Compra, restauração, renovação, cancelamento, expiração, reembolso, grace period e account hold
- [ ] Recuperação após perda de conexão
- [ ] Encerramento/reabertura do app
- [ ] Reinicialização do aparelho e persistência das preferências

## 4. Google Play Console

- [ ] Nome, descrição e categoria
- [ ] Ícone 512x512
- [ ] Screenshots de celular
- [ ] Screenshots de tablet, se aplicável
- [ ] Feature graphic
- [ ] Publicar `public/privacy.html` em URL HTTPS estável
- [x] Roteiro Data Safety documentado
- [ ] Formulário Data Safety preenchido com a versão final
- [ ] Classificação indicativa
- [ ] Público-alvo
- [ ] Permissões declaradas/revisadas
- [ ] Conta de desenvolvedor configurada
- [ ] Produtos e Base Plans criados
- [ ] Service Account vinculada e permissões concedidas
- [ ] RTDN/Pub/Sub configurado com segredo
- [ ] Teste interno
- [ ] Teste fechado
- [ ] AAB assinado enviado
- [ ] Produção

## 5. AdMob

- [x] Integração nativa real
- [x] Banner/interstitial/rewarded implementados
- [x] Produção não cai silenciosamente em IDs de teste
- [ ] App criado no AdMob
- [ ] Ad units reais criados
- [ ] Privacy & Messaging configurado
- [ ] Consentimento validado em dispositivo
- [ ] Ad Inspector validado
- [ ] `app-ads.txt` publicado e verificado

## 6. MemoriaFlashAgent / conteúdo

- [x] Mobile funciona sem o Agent
- [x] Feedback do Mobile entra no Firestore
- [x] Agent corrige cards com feedback
- [x] Agent atualiza conteúdo solicitado
- [x] Agent descobre novos conteúdos somente quando autorizado
- [x] Agent possui limpeza com dry-run
- [x] Admin Agent audita matérias, níveis, tópicos, subtópicos, cards e feedbacks
- [x] Admin Agent estima uso do Firestore
- [x] Workflow `admin-audit.yml` gera relatório JSON
- [ ] Executar primeira auditoria real do banco de produção
- [ ] Revisar cobertura e lacunas antes da publicação

## 7. Documentação

- `docs/PLAY_STORE_DATA_SAFETY.md`
- `docs/RELEASE_RUNBOOK.md`
- `docs/MONETIZATION_PRODUCTION_AUDIT.md`
- `public/privacy.html`
- `public/delete-account.html`
- `MemoriaFlashAgent/docs/PRODUCTION_CHECKLIST.md`
