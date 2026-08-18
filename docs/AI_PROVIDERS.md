# Provedores de IA — Fallback Multi-Provedor

O MemoriaFlash usa três provedores de IA. Todas as rotas de IA
(`/api/gemini/*`) passam pelo `AIOrchestrator`
(`src/server/ai/AIOrchestrator.ts`), que tenta a fila abaixo em ordem e faz
fallback automático quando um provedor:

- atinge o limite de uso (HTTP 429 / "quota exceeded");
- fica indisponível (timeout, erro 5xx);
- não está configurado (variável de ambiente ausente).

Se **todos** os provedores falharem, a rota retorna erro explícito para o
cliente (não há gerador local de fallback) — o app exibe uma mensagem clara
em vez de ficar carregando indefinidamente.

## Ordem padrão (edite em `src/server/ai/index.ts`)

1. **Google Gemini** (`gemini-2.5-flash`) — **PROVEDOR PRINCIPAL** (gratuito via AI Studio)
2. **DeepSeek Chat** (`deepseek-chat`) — **SEGUNDO** (pago, custo muito baixo)
3. **OpenAI ChatGPT** (`gpt-4o-mini`) — **TERCEIRO** (pago, fallback de alta qualidade)

## Como obter cada chave

| Provedor | Papel | Link para criar chave | Variável no `.env` |
|---|---|---|---|
| Google Gemini | Principal (gratuito) | https://aistudio.google.com/apikey | `GEMINI_API_KEY` |
| DeepSeek | Segundo (pago, barato) | https://platform.deepseek.com/api_keys | `DEEPSEEK_API_KEY` |
| OpenAI ChatGPT | Terceiro (pago) | https://platform.openai.com/api-keys | `OPENAI_API_KEY` |

Você **não precisa configurar todos** — o mínimo recomendado é só o
**Gemini** (gratuito). Quanto mais provedores configurados, maior a
resiliência a picos de uso ou instabilidade momentânea de um deles.

Cada provedor tem timeout próprio (`AbortController`) para nunca travar a
fila indefinidamente:

| Provedor | Timeout padrão | Variável de override |
|---|---|---|
| Gemini | 30s | — |
| DeepSeek | 30s | `DEEPSEEK_TIMEOUT` (ms) |
| OpenAI | 25s | `OPENAI_TIMEOUT` (ms) |

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
   como modelo — todos seguem o mesmo padrão de ~50 linhas, incluindo
   `AbortController` com timeout).
2. Importe e adicione à lista em `src/server/ai/index.ts`.
3. Pronto — nenhuma outra parte do app precisa mudar (Adapter Pattern).

## Camada de segurança (rate limiting)

Todas as rotas `/api/gemini/*` e `/api/referral/*` passam por um rate
limiter simples por IP (`src/server/middleware/rateLimit.ts`) para evitar
abuso e estourar a cota gratuita/paga de todos os provedores de uma vez.
Ajuste `windowMs`/`max` em `server.ts` conforme necessário.

## Cache inteligente de respostas

Antes de qualquer provedor ser chamado, `src/server/ai/cache/aiCache.ts`
verifica se já existe uma resposta salva no Firestore (coleção `aiCache`)
para um pedido equivalente — ex: dois alunos gerando "flashcards sobre
mitose" recebem o mesmo resultado, sem gastar uma segunda chamada de API.

- Aplicado em: `generateFlashcards`, `suggestTopics` — tarefas de conteúdo
  genérico e reutilizável.
- TTL configurável por tarefa em `CACHE_TTL` (`aiCache.ts`).
- A chave de cache normaliza texto (minúsculas, espaços) e ordena arrays
  antes de gerar o hash, então pequenas variações de digitação/maiúsculas
  ainda geram cache hit.
- Sem Firebase Admin SDK configurado, o cache é automaticamente ignorado —
  a IA é chamada normalmente (nunca quebra o app).
- Estatísticas de hit/miss em tempo real: `GET /api/ai/status` (campo
  `cache`).
