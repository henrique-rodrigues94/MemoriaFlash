# MemoriaFlash — preparação do Data Safety

Este arquivo é o roteiro técnico para preencher o formulário Data Safety do Google Play Console. Ele descreve o comportamento implementado no código; a declaração final deve ser conferida contra os SDKs e variáveis realmente habilitados na versão enviada.

## Categorias atualmente tratadas

| Categoria | Tratamento no MemoriaFlash | Finalidade principal | Exclusão |
|---|---|---|---|
| Conta Google | nome, e-mail, foto e identificador quando o usuário entra com Google | autenticação e sincronização | exclusão da conta |
| Conteúdo do usuário | decks, cards, progresso, estatísticas e preferências | estudo e sincronização | exclusão da conta |
| Feedback | relatos, avaliações e mensagens de ajuda | suporte e melhoria do produto | exclusão conforme dados associados |
| PDF/TXT | arquivos/conteúdo enviados ao Scanner | análise e geração de conteúdo solicitada | exclusão da conta/solicitação |
| Dados de anúncios | dados tratados pelo SDK do AdMob | exibição de anúncios para usuários elegíveis | controles do SDK/Google |
| Compras | purchase token e estado da assinatura no backend | validar e manter acesso PRO | exclusão da conta, observadas retenções legais/da plataforma |
| Dados técnicos | logs mínimos, erros e dados necessários ao funcionamento | segurança, diagnóstico e estabilidade | conforme política de retenção |
| Solicitação pública de exclusão | e-mail informado fora do app | localizar e validar a conta para atender pedido de exclusão | após processamento |

## O que marcar no Play Console

Para cada categoria, confirmar no formulário:

1. se o dado é coletado;
2. se é compartilhado com terceiros;
3. finalidade do tratamento;
4. se é opcional ou obrigatório;
5. se é criptografado em trânsito;
6. mecanismo de exclusão disponível ao usuário;
7. retenção aplicável;
8. quais SDKs/provedores efetivamente estão ativos na release.

## Terceiros relevantes

A versão atual integra ou pode integrar:

- Firebase Authentication/Firestore;
- Google Play Billing;
- Google AdMob;
- provedores de IA configurados no backend;
- OCR configurado no backend.

As respostas do Data Safety devem refletir somente os provedores efetivamente habilitados no ambiente de produção.

## Exclusão

O usuário autenticado pode excluir a conta dentro do aplicativo. Também existe uma página pública em `/delete-account.html` para solicitar a exclusão quando o aplicativo não estiver instalado. Solicitações públicas ficam pendentes até validação administrativa e são processadas pelo backend com Firebase Admin SDK.

## Importante

O formulário deve refletir exatamente a versão publicada e os SDKs efetivamente habilitados. Não marcar uma categoria apenas porque ela existe no código: revisar também Firebase Authentication, Firestore, AdMob, Billing, login social e provedores de IA/OCR configurados em produção.
