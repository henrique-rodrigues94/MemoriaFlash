import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const production = process.env.RELEASE_PRODUCTION === 'true';
const requiredFiles = [
  'capacitor.config.ts',
  'android/app/build.gradle',
  'android/app/src/main/AndroidManifest.xml',
  'android/variables.gradle',
  'docs/PLAY_STORE_CHECKLIST.md',
  'docs/PLAY_STORE_DATA_SAFETY.md',
  'docs/RELEASE_RUNBOOK.md',
  'public/privacy.html',
  'public/delete-account.html',
  'src/services/accountDeletionService.ts',
];

const errors = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Arquivo obrigatório ausente: ${file}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(packageJson.version)) errors.push(`Versão inválida no package.json: ${packageJson.version}`);

const capacitor = fs.readFileSync(path.join(root, 'capacitor.config.ts'), 'utf8');
if (!capacitor.includes("appId: 'com.memoriaflash.app'")) errors.push('applicationId/appId inesperado.');

const gradle = fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8');
if (!gradle.includes('applicationId "com.memoriaflash.app"')) errors.push('applicationId Android inesperado.');
if (!/versionCode\s+\d+/.test(gradle)) errors.push('versionCode Android ausente ou inválido.');
if (!gradle.includes('signingConfigs') || !gradle.includes('MEMORIAFLASH_KEYSTORE_PATH')) {
  errors.push('Configuração de assinatura de release ausente.');
}

const variables = fs.readFileSync(path.join(root, 'android/variables.gradle'), 'utf8');
const targetMatch = variables.match(/targetSdkVersion\s*=\s*(\d+)/);
if (!targetMatch || Number(targetMatch[1]) < 36) errors.push('targetSdkVersion deve ser 36 ou superior para o release atual.');

const manifest = fs.readFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
if (!manifest.includes('android.permission.INTERNET')) errors.push('Permissão INTERNET ausente.');
if (!manifest.includes('android.permission.CAMERA')) errors.push('Permissão CAMERA ausente.');
if (!manifest.includes('com.google.android.gms.ads.APPLICATION_ID')) errors.push('Configuração do App ID do AdMob ausente no Manifest.');

const privacy = fs.readFileSync(path.join(root, 'public/privacy.html'), 'utf8');
if (!privacy.includes('Política de Privacidade')) errors.push('Página de política de privacidade inválida.');
if (!privacy.includes('delete-account.html')) errors.push('Política sem link para a página pública de exclusão de conta.');

const deletion = fs.readFileSync(path.join(root, 'src/services/accountDeletionService.ts'), 'utf8');
if (!deletion.includes("method: 'DELETE'")) errors.push('Fluxo de exclusão de conta não configurado.');

const deletionPage = fs.readFileSync(path.join(root, 'public/delete-account.html'), 'utf8');
if (!deletionPage.includes('/api/billing/account-deletion/request')) errors.push('Página pública de exclusão sem integração com o endpoint.');

const adMob = fs.readFileSync(path.join(root, 'src/lib/adMobConfig.ts'), 'utf8');
if (!adMob.includes('isProductionBuild') || !adMob.includes('isNative')) errors.push('Proteção de IDs de teste do AdMob não configurada.');
if (production) {
  const requiredProductionEnv = [
    'VITE_ADMOB_APP_ID',
    'VITE_ADMOB_BANNER_AD_UNIT_ID',
    'VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID',
    'VITE_ADMOB_REWARDED_AD_UNIT_ID',
    'VITE_PLAY_MONTHLY_PRODUCT_ID',
    'VITE_PLAY_MONTHLY_BASE_PLAN_ID',
    'VITE_PLAY_ANNUAL_PRODUCT_ID',
    'VITE_PLAY_ANNUAL_BASE_PLAN_ID',
    'VITE_API_BASE_URL',
    'CORS_ORIGIN',
  ];
  for (const key of requiredProductionEnv) {
    if (!process.env[key]?.trim()) errors.push(`Variável de produção ausente: ${key}`);
  }
  if (process.env.VITE_ADMOB_USE_TEST_IDS === 'true') errors.push('VITE_ADMOB_USE_TEST_IDS=true não pode ser usado em produção.');
  if (process.env.VITE_API_BASE_URL && !process.env.VITE_API_BASE_URL.startsWith('https://')) errors.push('VITE_API_BASE_URL de produção deve usar HTTPS.');
  if (!process.env.GOOGLE_PLAY_RTDN_TOKEN?.trim()) errors.push('GOOGLE_PLAY_RTDN_TOKEN ausente para produção.');
}

if (errors.length) {
  console.error(`Release check ${production ? 'de produção' : 'padrão'}: FALHOU`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Release check: OK — MemoriaFlash ${packageJson.version}`);
if (production) {
  console.log('Preflight de produção validado: configuração de AdMob/Billing/API e assinatura declaradas.');
} else {
  console.log('Preflight padrão validado. Use RELEASE_PRODUCTION=true para validar credenciais/configuração final.');
}
