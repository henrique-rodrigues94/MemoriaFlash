import { auth } from '../../lib/firebase';
import { deriveReferralCode } from '../../shared/referralCode';
export { deriveReferralCode };

const PENDING_REF_KEY = 'flashmind_pending_referral_code';
const DEFAULT_PUBLIC_REFERRAL_URL = 'https://flashcardsia-a2f43.web.app';

function getPublicReferralBaseUrl(): string {
  const configured = String(import.meta.env.VITE_PUBLIC_REFERRAL_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  if (typeof window === 'undefined') return DEFAULT_PUBLIC_REFERRAL_URL;
  const origin = window.location.origin.replace(/\/+$/, '');
  const isLocal = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const isCapacitor = /^(capacitor|ionic):\/\//i.test(origin);
  return isLocal || isCapacitor ? DEFAULT_PUBLIC_REFERRAL_URL : origin;
}

export function buildReferralLink(code: string): string { return `${getPublicReferralBaseUrl()}/?ref=${encodeURIComponent(code)}`; }
export function capturePendingReferralFromURL(): void { if (typeof window === 'undefined') return; const ref = new URLSearchParams(window.location.search).get('ref'); if (ref && !localStorage.getItem(PENDING_REF_KEY)) localStorage.setItem(PENDING_REF_KEY, ref.toUpperCase().trim()); }
export function getPendingReferralCode(): string | null { return localStorage.getItem(PENDING_REF_KEY); }
export function clearPendingReferralCode(): void { localStorage.removeItem(PENDING_REF_KEY); }

export interface ClaimReferralResult { success: boolean; message: string; rewardDays?: number; alreadyRewarded?: boolean; welcomeBonus?: number; }

export async function ensureOwnReferralCodeRegistered(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return null;
  try {
    const idToken = await user.getIdToken();
    const res = await fetch('/api/referral/ensure-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.code === 'string' && data.code ? data.code : null;
  } catch (error) {
    console.warn('[Referral] Não foi possível registrar o código no servidor:', error);
    return null;
  }
}

export async function claimReferralCode(referralCode: string): Promise<ClaimReferralResult> {
  const code = referralCode.trim().toUpperCase();
  if (!code) return { success: false, message: 'Digite um código de indicação.' };
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return { success: false, message: 'Entre na sua conta para resgatar um código.' };
  try {
    const idToken = await user.getIdToken();
    const res = await fetch('/api/referral/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ referralCode: code, idToken }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) return { success: true, message: data.message || 'Indicação registrada com sucesso.', rewardDays: data.rewardDays, alreadyRewarded: data.alreadyRewarded };
    return { success: false, message: data.error || 'Não foi possível validar o código de indicação.' };
  } catch { return { success: false, message: 'Não foi possível conectar ao servidor. Tente novamente.' }; }
}

export async function tryClaimPendingReferral(): Promise<ClaimReferralResult | null> {
  const code = getPendingReferralCode();
  if (!code) return null;
  const result = await claimReferralCode(code);
  if (result.success || result.message.includes('já utilizou') || result.message.includes('já foi registrada')) clearPendingReferralCode();
  return result;
}
