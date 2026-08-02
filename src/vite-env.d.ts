/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Firebase Cloud Messaging VAPID key */
  readonly VITE_FIREBASE_VAPID_KEY?: string;

  /** AdMob app ID (test ID by default) */
  readonly VITE_ADMOB_APP_ID?: string;
  /** AdMob banner ad unit ID (test ID by default) */
  readonly VITE_ADMOB_BANNER_AD_UNIT_ID?: string;
  /** AdMob interstitial ad unit ID (test ID by default) */
  readonly VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID?: string;
  /** AdMob rewarded ad unit ID (test ID by default) */
  readonly VITE_ADMOB_REWARDED_AD_UNIT_ID?: string;
  /** AdMob native ad unit ID (test ID by default) */
  readonly VITE_ADMOB_NATIVE_AD_UNIT_ID?: string;

  // ── Provedores de IA client-side (browser) ──────────────────────────────
  // Configure para ativar o fallback direto no browser (usado só se o
  // servidor falhar). As chaves VITE_* são expostas ao browser pelo Vite.

  /** Google Gemini API Key — https://aistudio.google.com/apikey */
  readonly VITE_GEMINI_API_KEY?: string;
  /** Modelo Gemini (padrão: gemini-2.5-flash) */
  readonly VITE_GEMINI_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
