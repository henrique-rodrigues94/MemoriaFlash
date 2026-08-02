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
  // Configure ao menos 1. Ordem de tentativa: Groq → OpenRouter → Gemini.
  // As chaves VITE_* são expostas ao browser pelo Vite (prefixo obrigatório).

  /** Groq API Key — https://console.groq.com/keys */
  readonly VITE_GROQ_API_KEY?: string;
  /** Modelo Groq (padrão: llama-3.3-70b-versatile) */
  readonly VITE_GROQ_MODEL?: string;

  /** OpenRouter API Key — https://openrouter.ai/keys */
  readonly VITE_OPENROUTER_API_KEY?: string;
  /** Modelo OpenRouter (padrão: meta-llama/llama-3.1-8b-instruct:free) */
  readonly VITE_OPENROUTER_MODEL?: string;

  /** Google Gemini API Key — https://aistudio.google.com/apikey */
  readonly VITE_GEMINI_API_KEY?: string;
  /** Modelo Gemini (padrão: gemini-2.0-flash) */
  readonly VITE_GEMINI_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
