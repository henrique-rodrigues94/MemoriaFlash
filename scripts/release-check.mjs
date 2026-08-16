import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'capacitor.config.ts',
  'android/app/build.gradle',
  'android/app/src/main/AndroidManifest.xml',
  'android/variables.gradle',
  'docs/PLAY_STORE_CHECKLIST.md',
  'docs/PLAY_STORE_DATA_SAFETY.md',
  'docs/RELEASE_RUNBOOK.md',
  'public/privacy.html',
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

const variables = fs.readFileSync(path.join(root, 'android/variables.gradle'), 'utf8');
const targetMatch = variables.match(/targetSdkVersion\s*=\s*(\d+)/);
if (!targetMatch || Number(targetMatch[1]) < 36) errors.push('targetSdkVersion deve ser 36 ou superior para o release atual.');

const manifest = fs.readFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
if (!manifest.includes('android.permission.INTERNET')) errors.push('Permissão INTERNET ausente.');
if (!manifest.includes('android.permission.CAMERA')) errors.push('Permissão CAMERA ausente.');
if (!manifest.includes('com.google.android.gms.ads.APPLICATION_ID')) errors.push('Configuração do App ID do AdMob ausente no Manifest.');

const privacy = fs.readFileSync(path.join(root, 'public/privacy.html'), 'utf8');
if (!privacy.includes('Política de Privacidade')) errors.push('Página de política de privacidade inválida.');

const deletion = fs.readFileSync(path.join(root, 'src/services/accountDeletionService.ts'), 'utf8');
if (!deletion.includes("method: 'DELETE'")) errors.push('Fluxo de exclusão de conta não configurado.');

if (errors.length) {
  console.error('Release check: FALHOU');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Release check: OK — MemoriaFlash ${packageJson.version}`);
console.log('Atenção: assinatura do AAB, credenciais de produção, Play Console e testes físicos continuam sendo etapas manuais.');
