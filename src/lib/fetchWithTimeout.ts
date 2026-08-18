/**
 * fetch() com timeout via AbortController.
 *
 * Qualquer chamada ao backend que possa acionar um provedor de IA (grade
 * curricular, níveis de ensino, geração de flashcards, scanner) precisa de um
 * teto de tempo no cliente. Sem isso, se a rede travar (proxy, Wi-Fi
 * instável, tab em background) ou o backend nunca responder por qualquer
 * motivo, a Promise do fetch nunca resolve nem rejeita e a UI fica presa em
 * "carregando..." para sempre, sem chance de o usuário tentar de novo.
 *
 * Use um timeout generoso o bastante para cobrir o pior caso do backend
 * (fallback entre múltiplos provedores de IA + retries), mas finito.
 */
export async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 30_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('A operação demorou demais e foi cancelada. Verifique sua conexão e tente novamente.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
