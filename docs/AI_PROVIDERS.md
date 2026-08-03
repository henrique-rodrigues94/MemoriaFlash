# Provedores de IA — Fallback Multi-Provedor

O MemoriaFlash nunca depende de um único provedor de IA. Todas as 6 rotas de
IA (`/api/gemini/*`) passam pelo `AIOrchestrator`
(`src/server/ai/AIOrchestrator.ts`), que tenta uma fila de provedores
**gratuitos** em ordem e faz fallback automático quando um deles:

- atinge o limite de uso (HTTP 429 / "quota exceeded");
- fica indisponível (timeout, erro 5xx);
- não está configurado (variável de ambiente ausente).

Se **todos** os provedores de nuvem falharem, um **gerador local
determinístico** (`src/server/ai/providers/localFallback.ts`) garante que o
endpoint sempre responde algo utilizável — o app nunca trava esperando IA.

## Ordem padrão (edite em `src/server/ai/index.ts`)

1. **Google Gemini** (`gemini-2.5-flash`) — **PROVEDOR PRINCIPAL** (gratuito via AI Studio)
2. **OpenAI ChatGPT** (`gpt-4o-mini`) — **FALLBACK IMEDIATO** (usado quando o Gemini falha)
3. **Groq** (`llama-3.3-70b-versatile`) — inferência ultrarrápida, gratuita
4. **DeepSeek Chat** — qualidade excelente, preço muito baixo
5. **OpenRouter** (modelos `:free`) — agrega dezenas de modelos gratuitos
6. **Hugging Face** (Inference Router) — gratuito com rate limit
7. **Cohere** (`command-r`) — trial key gratuita
8. **FreeLLM** — sem chave, último recurso sem custo
9. **Anthropic Claude** — última rede de segurança paga (opcional)

## Como obter cada chave

| Provedor | Papel | Link para criar chave | Variável no `.env` |
|---|---|---|---|
| Google Gemini | Principal (gratuito) | https://aistudio.google.com/apikey | `GEMINI_API_KEY` |
| OpenAI ChatGPT | Fallback imediato (pago) | https://platform.openai.com/api-keys | `OPENAI_API_KEY` |
| Groq | Rede de segurança (grátis) | https://console.groq.com/keys | `GROQ_API_KEY` |
| OpenRouter | Rede de segurança (grátis) | https://openrouter.ai/keys | `OPENROUTER_API_KEY` |
| Hugging Face | Rede de segurança (grátis) | https://huggingface.co/settings/tokens | `HUGGINGFACE_API_KEY` |
| Cohere | Rede de segurança (grátis) | https://dashboard.cohere.com/api-keys | `COHERE_API_KEY` |
| Anthropic (pago, opcional) | Última defesa | https://console.anthropic.com/ | `ANTHROPIC_API_KEY` |

Você **não precisa configurar todos** — o mínimo recomendado é **Gemini
(principal) + OpenAI (fallback)**. Quanto mais provedores configurados,
maior a resiliência.

## Verificando o status dos provedores

Com o servidor rodando, acesse:

```
GET /api/ai/status
```

Retorna quais provedores estão configurados, disponíveis, ou em cooldown
(e por quê) — útil para depurar sem expor nenhuma chave.

## Adicionando um novo provedor

1. Crie `src/server/ai/providers/meuProvedor.ts` implementando a interface
   `AIProvider` (veja `src/server/ai/types.ts` e qualquer provedor existente
   como modelo — todos seguem o mesmo padrão de ~50 linhas).
2. Importe e adicione à lista em `src/server/ai/index.ts`.
3. Pronto — nenhuma outra parte do app precisa mudar (Adapter Pattern).

## Migrando para um provedor pago como principal

Configure `OPENAI_API_KEY` (ou adicione um adapter para Anthropic/outro) e
defina no `.env`:

```
AI_PRIORITIZE_PAID=true
```

Isso move os provedores pagos para o início da fila — útil em produção
quando você prioriza qualidade/velocidade sobre custo zero, mantendo os
provedores gratuitos como fallback caso o pago falhe.

## Camada de segurança (rate limiting)

Todas as rotas `/api/gemini/*` e `/api/referral/*` passam por um rate
limiter simples por IP (`src/server/middleware/rateLimit.ts`) para evitar
abuso e estourar a cota gratuita de todos os provedores de uma vez. Ajuste
`windowMs`/`max` em `server.ts` conforme necessário.

## Cache inteligente de respostas

Antes de qualquer provedor ser chamado, `src/server/ai/cache/aiCache.ts`
verifica se já existe uma resposta salva no Firestore (coleção `aiCache`)
para um pedido equivalente — ex: dois alunos gerando "flashcards sobre
mitose" recebem o mesmo resultado, sem gastar uma segunda chamada de API.

- Aplicado em: `generateFlashcards`, `suggestTopics`, `generateQuiz`,
  `recoveryPlan` — tarefas de conteúdo genérico e reutilizável.
- **Não** aplicado em: `quizDiagnostic` (depende dos erros específicos de
  cada aluno) e `voiceTutor` (conversa/contexto pessoal) — cachear essas
  poderia entregar a análise de um aluno para outro.
- TTL configurável por tarefa em `CACHE_TTL` (`aiCache.ts`) — de 7 dias
  (planos de recuperação) a 30 dias (flashcards/tópicos).
- A chave de cache normaliza texto (minúsculas, espaços) e ordena arrays
  antes de gerar o hash, então pequenas variações de digitação/maiúsculas
  ainda geram cache hit.
- Sem Firebase Admin SDK configurado, o cache é automaticamente ignorado —
  a IA é chamada normalmente (nunca quebra o app).
- Estatísticas de hit/miss em tempo real: `GET /api/ai/status` (campo
  `cache`).
