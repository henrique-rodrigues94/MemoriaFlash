# MemoriaFlash — configuração do runtime Android

## Problemas que esta configuração resolve

O aplicativo usa React/Vite dentro do Capacitor. No Android, chamadas como `/api/...` não chegam automaticamente ao Express que roda em outro servidor. O frontend agora usa `VITE_API_BASE_URL` para direcionar essas chamadas ao backend.

O login Google também não usa mais `signInWithPopup` dentro do WebView. No Android/iOS via Capacitor, o MemoriaFlash usa `@capgo/capacitor-social-login` e depois troca o ID token por uma credencial do Firebase JS SDK.

## Variáveis necessárias

No `.env` usado para o build do aplicativo:

```text
VITE_API_BASE_URL=https://SEU-BACKEND-EXPRESS
VITE_GOOGLE_WEB_CLIENT_ID=SEU_WEB_CLIENT_ID.apps.googleusercontent.com
```

Para desenvolvimento local com um celular físico, use o IP da máquina na rede, não `localhost`:

```text
VITE_API_BASE_URL=http://192.168.1.100:3000
```

O computador e o celular precisam estar na mesma rede e o Windows Firewall precisa permitir a porta 3000.

Para produção, use HTTPS e um domínio/endpoint público do backend.

## Google Sign-In Android

O `webClientId` usado pelo plugin é o OAuth Client ID do tipo **Web**. O Google também exige um OAuth Client ID do tipo **Android** associado ao package name e ao SHA-1 do certificado que assina o APK/AAB.

Para descobrir os certificados locais:

```powershell
cd android
.\gradlew.bat signingReport
```

Cadastre no Firebase/Google Cloud:

- package: `com.memoriaflash.app`
- SHA-1 do certificado de debug para testes locais;
- SHA-1 do certificado de release para builds de produção;
- SHA-1 da chave de assinatura do Google Play quando o app estiver publicado.

O Google Sign-In precisa estar habilitado no Firebase Authentication.

## Após instalar/atualizar dependências

```powershell
npm install
npx cap sync android
npm run build
npx cap copy android
cd android
.\gradlew.bat assembleDebug
```

## Teste no celular

Depois que o ADB reconhecer o dispositivo:

```powershell
adb devices
adb install -r ".\app\build\outputs\apk\debug\app-debug.apk"
```

Teste nesta ordem:

1. login Google;
2. digitar uma matéria;
3. aguardar a identificação dos níveis;
4. aguardar a grade curricular;
5. selecionar tópicos;
6. gerar cards;
7. salvar o baralho;
8. abrir `Seus Decks` e confirmar os cards;
9. estudar os cards;
10. verificar o contador gratuito.

## Diagnóstico rápido

Se aparecer `Servidor do MemoriaFlash não configurado`, falta `VITE_API_BASE_URL` no build.

Se aparecer `Login Google nativo não configurado`, falta `VITE_GOOGLE_WEB_CLIENT_ID` no build.

Se o Google retornar erro de configuração no Android, rode `signingReport` e confira package + SHA-1 no Firebase/Google Cloud.

Se a matéria não carregar a grade ou a geração não responder, verifique primeiro se `VITE_API_BASE_URL` aponta para o mesmo backend Express que está funcionando e se o endpoint `/api/health` responde pelo celular.
