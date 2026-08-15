import { auth } from '../../lib/firebase';
import { deriveReferralCode } from '../../shared/referralCode';

export { deriveReferralCode };

const PENDING_REF_KEY = 'flashmind_pending_referral_code';

export function buildReferralLink(code: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/?ref=${code}`;
}

export function capturePendingReferralFromURL(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref && !localStorage.getItem(PENDING_REF_KEY)) {
    localStorage.setItem(PENDING_REF_KEY, ref.toUpperCase().trim());
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
  rewardDays?: number;
  alreadyRewarded?: boolean;
  // Campo legado somente para compatibilidade de tipos com uma versão antiga;
  // o backend atual nunca retorna créditos.
  welcomeBonus?: number;
}

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
    return deriveReferralCode(user.uid);
  }
}

export async function claimReferralCode(referralCode: string): Promise<ClaimReferralResult> {
  const code = referralCode.trim().toUpperCase();
  if (!code) return { success: false, message: 'Digite um código de indicação.' };

  const user = auth.currentUser;
  if (!user || typeof (user as any).getIdToken !== 'function') {
    return { success: false, message: 'Entre na sua conta para resgatar um código.' };
  }

  try {
    const idToken = await (user as any).getIdToken();
    const res = await fetch('/api/referral/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referralCode: code, idToken }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message || 'Indicação registrada com sucesso.',
        rewardDays: data.rewardDays,
        alreadyRewarded: data.alreadyRewarded,
      };
    }

    return { success: false, message: data.error || 'Não foi possível validar o código de indicação.' };
  } catch {
    return { success: false, message: 'Não foi possível conectar ao servidor. Tente novamente.' };
  }
}

export async function tryClaimPendingReferral(): Promise<ClaimReferralResult | null> {
  const code = getPendingReferralCode();
  if (!code) return null;

  const result = await claimReferralCode(code);
  if (result.success || result.message.includes('já utilizou') || result.message.includes('já foi registrada')) {
    clearPendingReferralCode();
  }
  return result;
}
