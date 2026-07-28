/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Chave VAPID pública do Firebase Cloud Messaging (Console > Project Settings > Cloud Messaging > Web Push certificates). */
  readonly VITE_FIREBASE_VAPID_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
