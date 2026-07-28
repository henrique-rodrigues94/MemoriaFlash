# Política de Privacidade — FlashMind AI

**Última atualização:** [PREENCHER: data da publicação]

Esta Política de Privacidade descreve como o FlashMind AI ("nós", "aplicativo")
coleta, usa e protege os dados dos usuários, em conformidade com a Lei Geral
de Proteção de Dados (LGPD — Lei nº 13.709/2018) e, para usuários na União
Europeia, o Regulamento Geral de Proteção de Dados (GDPR).

> ⚠️ **Antes de publicar:** substitua todos os campos marcados como
> `[PREENCHER]` por informações reais da sua empresa/pessoa física
> responsável. Não publique esta política com dados fictícios — isso pode
> configurar propaganda enganosa e violar a própria LGPD (que exige um
> controlador de dados identificável e contatável).

## 1. Controlador dos Dados

- **Responsável:** [PREENCHER: nome da empresa ou pessoa física]
- **CNPJ/CPF:** [PREENCHER]
- **E-mail de contato para assuntos de privacidade:** [PREENCHER]
- **Encarregado de Proteção de Dados (DPO):** [PREENCHER — nome e contato real. Se
  você ainda não nomeou um DPO formalmente, indique o mesmo e-mail de contato
  acima até nomear um.]

## 2. Dados que Coletamos

| Categoria | Exemplos | Base legal (LGPD) |
|---|---|---|
| Dados de conta | Nome, e-mail, foto (se login via Google) | Consentimento / execução de contrato |
| Conteúdo do usuário | Flashcards, decks, respostas de quiz | Execução de contrato |
| Dados de uso | Progresso de estudo, XP, sequência de dias | Legítimo interesse |
| Dados de voz (Modo Voz, se ativado) | Áudio transcrito temporariamente | Consentimento explícito |
| Identificador de dispositivo/anônimo | UID anônimo do Firebase | Legítimo interesse (funcionamento do app) |
| Dados de anúncios | Interações com vídeos recompensados e intersticiais | Consentimento (anúncios personalizados) / legítimo interesse (anúncios não personalizados) |

Nós praticamos **minimização de dados**: coletamos apenas o necessário para o
funcionamento das funcionalidades que você usa.

## 3. Como Usamos os Dados

- Fornecer e personalizar as funcionalidades de estudo (flashcards, IA, SRS);
- Processar prompts de geração de conteúdo através de provedores de IA
  terceirizados (veja seção 5);
- Exibir anúncios (banner, intersticial, vídeo recompensado) para manter o
  app gratuito;
- Processar o programa de indicação (referral) — créditos de indicação são
  processados no servidor, nunca compartilhados publicamente;
- Prevenir fraude e abuso (ex.: limites diários de anúncios).

## 4. Cookies e Armazenamento Local

Utilizamos `localStorage` do navegador para:

- **Essenciais** (sempre ativos): manter seu progresso salvo localmente,
  preferências de idioma/tema.
- **Analytics** (requer consentimento): métricas agregadas de uso.
- **Anúncios personalizados** (requer consentimento): segmentação de
  anúncios pelos parceiros listados na seção 6.

Você pode revisar e alterar suas preferências de consentimento a qualquer
momento no banner exibido no rodapé do app ou limpando os dados do site nas
configurações do seu navegador.

## 5. Provedores de IA (Processamento de Terceiros)

Para gerar flashcards, resumos, planos de estudo e respostas do tutor de
voz, o conteúdo que você envia (ex.: o tema do deck, sua pergunta ao tutor)
é enviado a **um** dos seguintes provedores, conforme disponibilidade
(sistema de fallback automático — veja `docs/AI_PROVIDERS.md`):

- Google Gemini API (Google LLC)
- Groq
- OpenRouter (agrega diversos modelos de terceiros)
- Hugging Face Inference
- Cohere
- OpenAI (somente se configurado pelo operador do app como provedor pago)

Nenhum desses provedores é usado para treinar modelos com seus dados
pessoais identificáveis, de acordo com os termos de API de cada um (consulte
as políticas de cada provedor para detalhes atualizados). Não enviamos
dados de identificação pessoal (nome, e-mail) nesses prompts — apenas o
conteúdo educacional necessário para gerar a resposta.

## 6. Parceiros de Publicidade

Ao consentir com anúncios personalizados, seus dados de uso podem ser
compartilhados com:

- Google AdMob / Google Ad Manager (quando empacotado como app nativo)
- [PREENCHER: liste aqui outras redes de anúncio que você efetivamente
  integrar, ex.: Google AdSense para a versão web]

Você pode optar por anúncios **não personalizados** a qualquer momento pelo
banner de consentimento, sem perder acesso a nenhuma funcionalidade gratuita.

## 7. Retenção de Dados

- Dados de conta e progresso: mantidos enquanto sua conta estiver ativa.
- Dados de voz: processados e descartados imediatamente após a resposta;
  não armazenamos áudio.
- Logs de servidor: até 30 dias, para fins de segurança e depuração.
- Após solicitação de exclusão (veja `DATA_DELETION.md`): até 30 dias para
  remoção completa de backups.

## 8. Seus Direitos (LGPD Art. 18 / GDPR)

Você pode solicitar, a qualquer momento, pelo e-mail de contato acima:

- Confirmação da existência de tratamento de dados;
- Acesso aos seus dados;
- Correção de dados incompletos, inexatos ou desatualizados;
- Anonimização, bloqueio ou eliminação de dados desnecessários;
- Portabilidade dos dados;
- Eliminação dos dados tratados com consentimento (veja `DATA_DELETION.md`);
- Revogação do consentimento a qualquer momento.

## 9. Crianças e Adolescentes

O FlashMind AI não é direcionado a menores de 13 anos. Caso o app seja usado
por escolas (Modo Professor), o tratamento de dados de estudantes menores de
idade segue as bases legais específicas da LGPD (Art. 14) e requer
consentimento de pais/responsáveis ou da instituição de ensino, conforme
aplicável.

## 10. Alterações nesta Política

Esta política pode ser atualizada periodicamente. A data da última
atualização está sempre indicada no topo deste documento. Mudanças
materiais serão comunicadas dentro do app.

## 11. Contato

Dúvidas sobre esta política ou sobre o tratamento dos seus dados:
[PREENCHER: e-mail de contato]
