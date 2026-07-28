# Instruções de Exclusão de Dados — FlashMind AI

Em conformidade com a LGPD (Art. 18, VI) e as políticas de Data Safety da
Google Play / App Store, todo usuário pode solicitar a exclusão completa dos
seus dados a qualquer momento.

## Opção 1 — Excluir dados diretamente no app (autoatendimento)

1. Abra o FlashMind AI.
2. Toque no seu avatar (canto superior esquerdo) para abrir a tela de conta.
3. Vá em **Configurações da Conta > Privacidade > Excluir meus dados**.
4. Confirme a exclusão.

Isso remove imediatamente:
- Todos os seus decks e flashcards salvos localmente e na nuvem;
- Suas estatísticas de progresso (XP, streak, créditos);
- Seu histórico de conversas com o Tutor de Voz;
- Seu vínculo de indicação (referral).

> Nota de implementação: o botão de autoatendimento descrito acima faz parte
> do roadmap de UI; até que esteja disponível na interface, use a Opção 2
> abaixo — o backend e as coleções do Firestore já foram desenhados para
> suportar a exclusão completa por uid (`decks`, `userStats`, `classes`,
> `referrals`, `referralCodes`).

## Opção 2 — Solicitar por e-mail

Envie um e-mail para **[PREENCHER: e-mail de contato de privacidade]** com:

- Assunto: "Solicitação de Exclusão de Dados — FlashMind AI"
- Seu e-mail de cadastro (se usou login Google) OU o identificador anônimo
  do dispositivo (visível em Configurações > Sobre > ID do Dispositivo)
- Confirmação de que deseja excluir permanentemente sua conta e dados

**Prazo de atendimento:** até 15 dias úteis para confirmação, com exclusão
completa (inclusive de backups) em até 30 dias, conforme Art. 18 da LGPD.

## O que é excluído

| Dado | Excluído? |
|---|---|
| Decks e flashcards (Firestore + localStorage) | ✅ Sim |
| Estatísticas de progresso (XP, streak, créditos) | ✅ Sim |
| Vínculo de indicação (quem indicou/foi indicado) | ✅ Sim |
| Conta de autenticação (Firebase Auth) | ✅ Sim |
| Logs de servidor agregados/anonimizados (sem PII) | ⚠️ Retidos até 30 dias por segurança, depois expurgados automaticamente |
| Dados de faturamento de assinatura PRO (se aplicável) | Retidos conforme obrigação legal fiscal/contábil do processador de pagamento, tipicamente 5 anos, tratado separadamente pelo próprio processador (ex.: Google Play Billing, Stripe) |

## Exclusão automática de conta inativa

Contas 100% anônimas (sem login Google) que não abrirem o app por 24 meses
consecutivos podem ter seus dados anonimizados/excluídos automaticamente,
conforme o princípio de minimização e limitação de retenção da LGPD.
