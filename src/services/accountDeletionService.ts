import { auth } from '../lib/firebase';

/**
 * Solicita ao backend a exclusão definitiva da conta e dos dados associados.
 * A operação é autenticada pelo Firebase ID token e deve ser chamada somente
 * após uma confirmação explícita do usuário.
 */
export async function deleteCurrentAccount(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhuma conta autenticada.');

  const token = await user.getIdToken(true);
  const response = await fetch('/api/billing/account', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || data?.deleted !== true) {
    throw new Error(data?.error || 'Não foi possível excluir a conta.');
  }
}
