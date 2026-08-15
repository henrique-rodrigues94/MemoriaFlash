import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const androidRoot = path.join(root, 'android');
const manifestPath = path.join(androidRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
const stringsPath = path.join(androidRoot, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
const production = process.argv.includes('--production');
const TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';

function readEnvFile(fileName) {
  const filePath = path.join(root, fileName);
  if (!fs.existsSync(filePath)) return {};

  const values = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function getAppId() {
  const envFiles = {
    ...readEnvFile('.env'),
    ...readEnvFile('.env.local'),
  };
  return process.env.VITE_ADMOB_APP_ID || envFiles.VITE_ADMOB_APP_ID || (!production ? TEST_APP_ID : '');
}

function assertAppId(appId) {
  if (!appId) {
    throw new Error(
      'VITE_ADMOB_APP_ID não configurado. Para produção, defina o App ID real do AdMob antes de preparar o Android.',
    );
  }

  if (!/^ca-app-pub-\d{16}~\d{10}$/.test(appId)) {
    throw new Error(`VITE_ADMOB_APP_ID inválido: ${appId}`);
  }
}

function ensureManifest(manifest, appId) {
  const marker = 'com.google.android.gms.ads.APPLICATION_ID';
  const metaData = `    <meta-data\n        android:name="${marker}"\n        android:value="@string/admob_app_id" />`;

  if (manifest.includes(marker)) {
    return manifest.replace(
      /\s*<meta-data\s+android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"\s+android:value="[^"]+"\s*\/?\s*>/,
      `\n${metaData}`,
    );
  }

  const applicationOpen = manifest.indexOf('<application');
  const applicationClose = manifest.indexOf('>', applicationOpen);
  if (applicationOpen < 0 || applicationClose < 0) {
    throw new Error('Não foi possível localizar <application> no AndroidManifest.xml.');
  }

  return `${manifest.slice(0, applicationClose + 1)}\n${metaData}${manifest.slice(applicationClose + 1)}`;
}

function ensureStrings(strings, appId) {
  const escaped = appId.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const entry = `    <string name="admob_app_id">${escaped}</string>`;

  if (/<string\s+name="admob_app_id">/.test(strings)) {
    return strings.replace(/\s*<string\s+name="admob_app_id">.*?<\/string>/s, `\n${entry}`);
  }

  const resourcesClose = strings.lastIndexOf('</resources>');
  if (resourcesClose < 0) {
    throw new Error('Não foi possível localizar </resources> em strings.xml.');
  }

  return `${strings.slice(0, resourcesClose)}${entry}\n${strings.slice(resourcesClose)}`;
}

if (!fs.existsSync(manifestPath) || !fs.existsSync(stringsPath)) {
  throw new Error(
    'Projeto Android não encontrado. Execute "npx cap add android" e depois rode "npm run android:sync".',
  );
}

const appId = getAppId();
assertAppId(appId);

const originalManifest = fs.readFileSync(manifestPath, 'utf8');
const originalStrings = fs.readFileSync(stringsPath, 'utf8');
const updatedManifest = ensureManifest(originalManifest, appId);
const updatedStrings = ensureStrings(originalStrings, appId);

fs.writeFileSync(manifestPath, updatedManifest, 'utf8');
fs.writeFileSync(stringsPath, updatedStrings, 'utf8');

console.log(`[AdMob] Android App ID configurado: ${production ? 'produção' : 'teste/desenvolvimento'}`);
console.log('[AdMob] Manifest: android/app/src/main/AndroidManifest.xml');
console.log('[AdMob] Strings:   android/app/src/main/res/values/strings.xml');
