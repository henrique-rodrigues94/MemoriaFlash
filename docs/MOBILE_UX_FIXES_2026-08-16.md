# Correções Mobile — 2026-08-16

- Gerador único com abas **GERAR COM IA** e **MANUAL**.
- Removido o fluxo do antigo gerador avançado.
- Grade curricular com seleção/desmarcação de todos os tópicos e subtópicos.
- Níveis Fundamental, Médio, Faculdade, Concurso e Técnico.
- Banco compartilhado consultado antes da IA.
- Buckets legados sem `ttlAt` continuam utilizáveis quando possuem cards.
- Quantidades 25, 50, 100 e **TODOS DISPONÍVEIS**, respeitando o limite diário.
- Formulários de geração exibem valores digitados em maiúsculas.
- Modo manual mostra imediatamente os cards adicionados abaixo do botão.
- Feedback de estudo fixado no topo do card, ao lado do controle de inversão, sem sair da sessão.
- Modal de feedback respeita tema claro/escuro e envia contexto do card ao Firestore.
- AdMob deixa de ser ocultado pelo cleanup do StrictMode e usa margem inferior para não cobrir a navegação.
- Código de indicação pode ser realmente atualizado; o anterior é desativado.
- Link público de indicação continua usando domínio de produção, nunca localhost.
- Autocomplete passa a aquecer o catálogo de matérias do Firestore e combinar com sugestões locais.
- Compatibilidade visual global para componentes antigos no tema claro.
