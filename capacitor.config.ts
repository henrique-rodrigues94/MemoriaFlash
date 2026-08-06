// 📁 flashmind-ai/capacitor.config.ts
//
// ⚠️ appId é um PLACEHOLDER. Troque para o identificador final ANTES de
// rodar `npx cap add android` — o applicationId do app Android é definido a
// partir daqui e NÃO pode ser alterado depois de publicado na Play Store.
// Sugestão de padrão: com.SUANOMEDEEMPRESA.memoriaflash
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.memoriaflash.app', // TODO: definir o appId final antes do primeiro build
  appName: 'MemoriaFlash',
  webDir: 'dist',
};

export default config;
