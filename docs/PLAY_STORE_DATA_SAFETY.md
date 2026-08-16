# MemoriaFlash — preparação do Data Safety

Este arquivo é um roteiro técnico para preencher o formulário Data Safety do Google Play Console.

## Dados que precisam ser confirmados antes do envio

- [ ] Dados de conta/autenticação
- [ ] Conteúdo criado pelo usuário
- [ ] Progresso e preferências
- [ ] Feedback e relatos de problemas
- [ ] Conteúdo de PDF/TXT enviado para processamento
- [ ] Dados coletados pelos SDKs de anúncios
- [ ] Dados processados pelo sistema de compras
- [ ] Dados técnicos e diagnósticos

## Para cada categoria

Confirmar no Play Console:

1. se o dado é coletado;
2. se é compartilhado com terceiros;
3. finalidade do tratamento;
4. se é opcional ou obrigatório;
5. se é criptografado em trânsito;
6. mecanismo de exclusão disponível ao usuário.

## Importante

O formulário deve refletir exatamente a versão publicada e os SDKs efetivamente habilitados. Não marcar uma categoria apenas porque ela existe no código: revisar também Firebase Authentication, Firestore, AdMob, Billing, login social e provedores de IA configurados em produção.
