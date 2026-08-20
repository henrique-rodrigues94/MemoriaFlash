# MemoriaFlash — checklist de publicação Play Store

> Auditoria técnica revisada em 20/08/2026. O código está preparado para Capacitor/Android, mas itens que dependem de conta Google Play, Firebase/AdMob de produção, aparelho físico ou configuração externa permanecem pendentes até serem executados de fato.

## 1. Aplicativo

- [x] React/Vite build configurado
- [x] Capacitor Android versionado
- [x] `appId` Android `com.memoriaflash.app`
- [x] `webDir` do Capacitor apontando para `dist`
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
- [x] Gate de autenticação impede uso sem conta autenticada
- [x] Sincronização de baralhos/estatísticas com Firestore

## 2. Android / Capacitor

- [x] Capacitor Android 8.x
- [x] `minSdkVersion = 24`
- [x] `compileSdkVersion = 36`
- [x] `targetSdkVersion = 36`
- [x] Activity principal `exported=true`
- [x] INTERNET
- [x] CAMERA
- [x] FileProvider não exportado
- [x] App ID do AdMob no Manifest
- [x] Backup Android desativado (`allowBackup=false`) para reduzir risco de cópia de dados pessoais
- [x] Assinatura Release parametrizada por secrets
- [x] `versionCode` e `versionName` parametrizados no Gradle
- [x] Workflow Release gera `VERSION_CODE` único por execução
- [x] Workflow Release valida `signingReport`
- [x] Workflow Release gera AAB assinado
- [x] Workflow candidate gera AAB assinado para homologação

O Google Play passa a exigir API 36+ para novos apps e atualizações a partir de 31/08/2026; o projeto já está em API 36. urlRequisito oficial de target API do Google Playhttps://developer.android.com/google/play/requirements/target-sdk

## 3. Segurança e backend

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
- [x] Typecheck/testes/build no pipeline
- [x] Preflight de produção valida HTTPS, IDs de AdMob, produtos Play e RTDN
- [x] Preflight exige `VERSION_CODE` e `VERSION_NAME` em produção

### Pendências externas obrigatórias

- [ ] Confirmar backend HTTPS de produção e `/api/health`
- [ ] Testar rate limiting em produção
- [ ] Testar regras Firestore no projeto de produção
- [ ] Revisar todas as variáveis de produção no host/CI
- [ ] Confirmar Firebase Project usado pelo AAB de produção

## 4. Homologação Android

- [x] `npm ci`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run build`
- [x] `npm run android:sync`
- [x] Compilação Android automatizada
- [x] AAB Release candidato automatizado
- [x] AAB candidato agora é assinado
- [x] AAB de produção assinado automatizado
- [x] Verificação de assinatura via `signingReport`
- [x] IDs AdMob de teste separados do workflow de produção

### Testes físicos / serviços externos

- [ ] `npm run android:sync:prod` com variáveis reais
- [ ] Gerar AAB Release assinado com keystore de produção no workflow
- [ ] Instalar release em aparelho físico
- [ ] Login Google em release
- [ ] Login Google após reinstalação
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
- [ ] Notificações locais e permissão Android 13+
- [ ] Tema claro/escuro nas telas principais
- [ ] Banner AdMob não sobrepor navegação/modais
- [ ] Banner AdMob ausente durante estudo
- [ ] Botão de relato de problema fixo no topo do card

## 5. Google Play Console

- [ ] Nome, descrição e categoria
- [ ] Ícone 512x512
- [ ] Screenshots de celular
- [ ] Screenshots de tablet, se aplicável
- [ ] Feature graphic
- [ ] URL HTTPS pública para `public/privacy.html`
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
- [ ] Teste fechado, se exigido pela conta
- [ ] AAB assinado enviado
- [ ] Pré-lançamento aprovado
- [ ] Produção
- [ ] Verificação de desenvolvedor Android conferida no Play Console antes de 30/09/2026

## 6. AdMob

- [x] Integração nativa real
- [x] Banner/interstitial/rewarded implementados no código
- [x] Produção não deve usar IDs de teste
- [x] Preflight de produção bloqueia `VITE_ADMOB_USE_TEST_IDS=true`
- [ ] App criado no AdMob
- [ ] Ad units reais criados
- [ ] Privacy & Messaging configurado
- [ ] Consentimento validado em dispositivo
- [ ] Ad Inspector validado
- [ ] `app-ads.txt` publicado e verificado
- [ ] Testar banner fora da tela de estudo
- [ ] Testar banner sem sobreposição de abas/painéis

## 7. MemoriaFlashAgent / conteúdo

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

## 8. Documentação

- [x] `docs/PLAY_STORE_DATA_SAFETY.md`
- [x] `docs/RELEASE_RUNBOOK.md`
- [x] `docs/MONETIZATION_PRODUCTION_AUDIT.md`
- [x] `public/privacy.html`
- [x] `public/delete-account.html`
- [x] Checklist de produção do MemoriaFlashAgent

## 9. Bloqueadores reais para publicar

O código e o pipeline Android estão preparados, mas a publicação **não deve ser marcada como concluída** enquanto estes itens não forem executados:

1. configurar e validar secrets de produção;
2. gerar AAB assinado pelo workflow;
3. testar o AAB em aparelho físico;
4. configurar produtos/base plans do Google Play;
5. configurar RTDN/Service Account;
6. validar Billing real no teste interno;
7. configurar AdMob/Privacy & Messaging/app-ads.txt;
8. preencher Data Safety e demais formulários do Play Console;
9. publicar política de privacidade em URL HTTPS estável;
10. realizar teste interno/fechado e corrigir qualquer falha encontrada;
11. conferir a verificação de desenvolvedor Android para distribuição no Brasil.

O status acima é deliberadamente conservador: itens externos só são marcados como concluídos depois de uma execução real, não apenas porque existe código para eles.
