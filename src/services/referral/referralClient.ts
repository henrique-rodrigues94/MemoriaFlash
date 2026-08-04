import { auth } from '../../lib/firebase';
import { deriveReferralCode } from '../../shared/referralCode';

export { deriveReferralCode };

const PENDING_REF_KEY = 'flashmind_pending_referral_code';

export function buildReferralLink(code: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/?ref=${code}`;
}

/** Lê `?ref=CODE` da URL atual (se houver) e guarda como pendente até a conta ativar. */
export function capturePendingReferralFromURL(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref && !localStorage.getItem(PENDING_REF_KEY)) {
    localStorage.setItem(PENDING_REF_KEY, ref.toUpperCase());
  }
}

export function getPendingReferralCode(): string | null {
  return localStorage.getItem(PENDING_REF_KEY);
}

export function clearPendingReferralCode(): void {
  localStorage.removeItem(PENDING_REF_KEY);
}

export interface ClaimReferralResult {
  success: boolean;
  message: string;
  welcomeBonus?: number;
}

/**
 * Garante que o mapeamento código→uid deste usuário existe no servidor
 * (necessário para que AMIGOS consigam resgatar o código dele depois).
 * Chame uma vez após a autenticação ser confirmada.
 */
export async function ensureOwnReferralCodeRegistered(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user || typeof (user as any).getIdToken !== 'function') return null;

  try {
    const idToken = await (user as any).getIdToken();
    const res = await fetch('/api/referral/ensure-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json();
    return data?.code ?? deriveReferralCode(user.uid);
  } catch {
    // Sem servidor/backend disponível (ex: preview estático) — ainda assim
    // conseguimos mostrar o código localmente, só não fica resgatável por
    // amigos até o backend estar no ar.
    return deriveReferralCode(user.uid);
  }
}

/**
 * Tenta resgatar o código de indicação pendente chamando o backend, que usa
 * o Firebase Admin SDK para validar e creditar ambas as contas com
 * segurança (evita que o próprio cliente possa se autocreditar créditos
 * infinitos escrevendo direto no Firestore).
 *
 * Requer que o usuário tenha um Firebase ID Token válido (login Google ou
 * autenticação anônima real do Firebase). Se o app estiver rodando em modo
 * "guest" local (sem Firebase Auth habilitado no console), a indicação fica
 * marcada como pendente e será resgatada automaticamente no primeiro login.
 */
export async function tryClaimPendingReferral(): Promise<ClaimReferralResult | null> {
  const code = getPendingReferralCode();
  if (!code) return null;

  const user = auth.currentUser;
  if (!user || typeof (user as any).getIdToken !== 'function') {
    return null;
  }

  try {
    const idToken = await (user as any).getIdToken();
    const res = await fetch('/api/referral/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referralCode: code, idToken }),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      clearPendingReferralCode();
      return { success: true, message: data.message, welcomeBonus: data.welcomeBonus };
    }

    // CORREÇÃO: antes, QUALQUER falha (inclusive erro transitório do servidor,
    // ex: 500/503 por config do Firebase Admin ainda não pronta) descartava o
    // código pendente para sempre — o usuário perdia o bônus de indicação
    // mesmo que uma nova tentativa mais tarde funcionasse. Agora só
    // descartamos em rejeições DEFINITIVAS do servidor (código inválido,
    // autoindicação, já resgatado antes) — erros de servidor mantêm o código
    // pendente para tentar de novo no próximo login.
    const isDefinitiveRejection = res.status === 400 || res.status === 404 || res.status === 409;
    if (isDefinitiveRejection) {
      clearPendingReferralCode();
    }
    return { success: false, message: data.error || 'Não foi possível validar o código de indicação.' };
  } catch (err) {
    console.warn('Falha ao resgatar indicação (tentaremos novamente mais tarde):', err);
    return null;
  }
}
