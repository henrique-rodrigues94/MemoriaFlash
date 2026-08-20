import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const production = process.env.RELEASE_PRODUCTION === 'true';
const errors = [];
const warnings = [];

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

const requiredFiles = [
  'capacitor.config.ts',
  'android/app/build.gradle',
  'android/app/src/main/AndroidManifest.xml',
  'android/variables.gradle',
  'src/main.tsx',
  'src/lib/firebase.ts',
  'src/services/billing/playBilling.ts',
  'src/server/routes/billing.ts',
  'public/privacy.html',
  'public/delete-account.html',
  'docs/PLAY_STORE_DATA_SAFETY.md',
  'docs/PLAY_STORE_CHECKLIST.md',
];

for (const file of requiredFiles) if (!exists(file)) fail(`Arquivo obrigatório ausente: ${file}`);

const pkg = JSON.parse(read('package.json'));
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) fail(`Versão inválida: ${pkg.version}`);
for (const dep of ['@capacitor/android', '@capacitor/core', '@capacitor-community/admob', '@capgo/native-purchases']) {
  if (!pkg.dependencies?.[dep]) fail(`Dependência ausente: ${dep}`);
}

const capacitor = read('capacitor.config.ts');
if (!capacitor.includes("appId: 'com.memoriaflash.app'")) fail('Capacitor appId incorreto.');
if (!capacitor.includes("webDir: 'dist'")) fail('Capacitor webDir deve apontar para dist.');

const variables = read('android/variables.gradle');
const target = Number(variables.match(/targetSdkVersion\s*=\s*(\d+)/)?.[1] || 0);
const compile = Number(variables.match(/compileSdkVersion\s*=\s*(\d+)/)?.[1] || 0);
if (target < 36) fail(`targetSdkVersion=${target}; novos apps/updates exigem API 36 a partir de 31/08/2026.`);
if (compile < target) fail(`compileSdkVersion=${compile} menor que targetSdkVersion=${target}.`);

const gradle = read('android/app/build.gradle');
if (!gradle.includes('applicationId "com.memoriaflash.app"')) fail('applicationId Android incorreto.');
if (!gradle.includes('signingConfigs') || !gradle.includes('MEMORIAFLASH_KEYSTORE_PATH')) fail('Assinatura release não configurada.');
if (!gradle.includes('versionCode')) fail('versionCode não configurado.');
if (!gradle.includes("System.getenv('VERSION_CODE')")) warn('versionCode ainda não está ligado ao ambiente de CI.');

const manifest = read('android/app/src/main/AndroidManifest.xml');
for (const permission of ['android.permission.INTERNET', 'android.permission.CAMERA']) {
  if (!manifest.includes(permission)) fail(`Permissão Android ausente: ${permission}`);
}
if (!manifest.includes('com.google.android.gms.ads.APPLICATION_ID')) fail('App ID do AdMob ausente no Manifest.');
if (manifest.includes('android:allowBackup="true"')) warn('Backup Android está habilitado; confirme compatibilidade com exclusão de conta.');

const main = read('src/main.tsx');
if (!main.includes('onAuthStateChanged') || !main.includes('<EntryGate') || !main.includes('<App />')) fail('Gate de autenticação principal incompleto.');

const firebase = read('src/lib/firebase.ts');
if (!firebase.includes('VITE_API_BASE_URL')) fail('Configuração da API mobile ausente.');
if (!firebase.includes('Servidor do MemoriaFlash não configurado')) fail('API mobile não possui fail-fast quando a URL não está configurada.');

const billing = read('src/services/billing/playBilling.ts');
for (const marker of ['purchasePlaySubscription', 'verify-purchase', 'restorePlaySubscription']) if (!billing.includes(marker)) fail(`Billing incompleto: ${marker}`);

const billingServer = read('src/server/routes/billing.ts');
for (const marker of ['verifySubscriptionPurchase', 'acknowledgeSubscriptionPurchase', '/rtdn']) if (!billingServer.includes(marker)) fail(`Backend Billing incompleto: ${marker}`);

const privacy = read('public/privacy.html');
if (!/Política de Privacidade/i.test(privacy)) fail('Política de privacidade inválida.');
if (!privacy.includes('delete-account.html')) fail('Política de privacidade sem link para exclusão.');

const deletion = read('public/delete-account.html');
if (!deletion.includes('/api/billing/account-deletion/request')) fail('Página pública de exclusão sem endpoint correto.');
if (!billingServer.includes("billingRouter.delete('/account'")) fail('Exclusão autenticada da conta ausente.');
if (!billingServer.includes('deleteAccountData')) fail('Rotina de exclusão dos dados ausente.');

const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' || entry.name === 'android') continue;
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|jsx|css|html|json)$/.test(entry.name)) sourceFiles.push(full);
  }
}
walk(path.join(root, 'src'));
walk(path.join(root, 'public'));

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (/ca-app-pub-3940256099942544/.test(content)) fail(`ID de teste AdMob encontrado: ${path.relative(root, file)}`);
  if (/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(content)) fail(`URL localhost encontrada no código publicado: ${path.relative(root, file)}`);
}

if (production) {
  const required = ['VITE_API_BASE_URL', 'CORS_ORIGIN', 'VITE_ADMOB_APP_ID', 'VITE_ADMOB_BANNER_AD_UNIT_ID', 'VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID', 'VITE_PLAY_MONTHLY_PRODUCT_ID', 'VITE_PLAY_MONTHLY_BASE_PLAN_ID', 'VITE_PLAY_ANNUAL_PRODUCT_ID', 'VITE_PLAY_ANNUAL_BASE_PLAN_ID', 'GOOGLE_PLAY_RTDN_TOKEN'];
  for (const key of required) if (!process.env[key]?.trim()) fail(`Variável de produção ausente: ${key}`);
  if (process.env.VITE_ADMOB_USE_TEST_IDS === 'true') fail('VITE_ADMOB_USE_TEST_IDS=true não é permitido em produção.');
  if (process.env.VITE_API_BASE_URL && !process.env.VITE_API_BASE_URL.startsWith('https://')) fail('VITE_API_BASE_URL deve usar HTTPS.');
}

console.log('=== MemoriaFlash — auditoria Play Store / Capacitor ===');
console.log(`Versão: ${pkg.version}`);
console.log(`Capacitor: ${pkg.dependencies['@capacitor/core']}`);
console.log(`Target SDK: ${target}`);
console.log(`Production preflight: ${production ? 'SIM' : 'NÃO'}`);
if (warnings.length) { console.log('\nAVISOS:'); for (const item of warnings) console.log(`- ${item}`); }
if (errors.length) { console.error('\nFALHAS:'); for (const item of errors) console.error(`- ${item}`); process.exit(1); }
console.log('\nRESULTADO: OK — auditoria estrutural aprovada.');
console.log('Os testes externos de aparelho, Play Console, AdMob e Billing continuam obrigatórios antes da publicação.');
