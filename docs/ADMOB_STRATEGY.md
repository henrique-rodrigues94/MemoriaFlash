# Estratégia de Monetização — MemoriaFlash

A geração de flashcards não usa mais créditos.

## Regra principal

| Usuário | Geração de cards por IA | Anúncios |
|---|---:|---|
| Gratuito | **200 cards no total** | Sim |
| PRO | **Ilimitada** | Não |

O contador de geração é `userStats/{uid}.aiCardsGenerated` e é atualizado somente pelo backend.

## Limite gratuito

- Acumulado por conta, não diário.
- O backend valida o ID token do Firebase antes de gerar.
- Se a solicitação ultrapassar o saldo restante, a IA não é chamada.
- Somente os cards realmente devolvidos são contabilizados.
- Uma transação do Firestore impede que gerações simultâneas ultrapassem o limite.
- Ao chegar a 200, a tela oferece assinatura PRO.

## AdMob

A estratégia deixou de usar anúncios premiados para conceder créditos de IA.
A versão gratuita utiliza anúncios normais (banner/intersticial), enquanto o PRO não exibe anúncios.

Algumas APIs legadas permanecem temporariamente apenas para compatibilidade com componentes antigos; elas não concedem nem consomem créditos.

## Segurança

O frontend envia o ID token do Firebase para os endpoints de geração. O servidor verifica o token com o Firebase Admin SDK. Os campos de assinatura e `aiCardsGenerated` são protegidos pelas regras do Firestore e só o backend pode alterá-los.
