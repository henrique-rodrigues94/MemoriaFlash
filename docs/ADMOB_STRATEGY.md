# Estratégia de Monetização — MemoriaFlash

A geração de flashcards não usa mais créditos.

## Regra principal

| Usuário | Geração de cards por IA | Anúncios |
|---|---:|---|
| Gratuito | **200 cards no total** | Sim |
| PRO | **Ilimitada** | Não |

O contador de geração é `userStats/{uid}.aiCardsGenerated` e é atualizado
somente pelo backend. O cliente não pode alterar esse campo pelas regras do
Firestore.

## Limite gratuito

- O limite é acumulado por conta, não diário.
- O backend valida o ID token do Firebase antes de gerar.
- O backend consulta o contador atual no Firestore.
- Se a solicitação ultrapassar o saldo restante, a IA nem é chamada.
- Depois da geração, somente os cards realmente devolvidos são contabilizados.
- Uma transação do Firestore impede que duas gerações simultâneas ultrapassem o
  limite.
- Ao chegar a 200, a tela oferece assinatura PRO.

## AdMob

A estratégia deixou de usar anúncios premiados para conceder créditos de IA.
A versão gratuita utiliza anúncios normais (banner/intersticial), enquanto o
PRO não exibe anúncios.

Algumas APIs legadas de créditos permanecem temporariamente apenas para
compatibilidade com componentes antigos; elas não concedem nem consomem
créditos e não fazem parte da experiência atual.

## Segurança

O frontend envia o ID token do Firebase para os endpoints de geração. O
servidor verifica o token com o Firebase Admin SDK antes de consultar ou
alterar o limite. Os campos de assinatura e `aiCardsGenerated` são protegidos
pelas regras do Firestore e só o backend pode alterá-los.

Antes de publicar, mantenha o backend em HTTPS e considere ativar Firebase App
Check para proteger ainda mais os endpoints próprios contra clientes não
autorizados.
