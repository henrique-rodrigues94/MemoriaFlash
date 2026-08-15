# Configuração Android — AdMob + Google Play Billing

## Estado do repositório

O código web agora usa o SDK nativo `@capacitor-community/admob` 8.x, compatível com Capacitor 8, para banner, interstitial e rewarded. O plugin é mantido e a versão 8.0.0 é a release atual documentada para Capacitor 8. citeturn3search0turn3search1

O projeto já possui `@capgo/native-purchases` 8.x para compras nativas e backend próprio para validação do Google Play.

## 1. Instalar dependências

No diretório do projeto:

```bash
npm install
npx cap sync android
```

Como o SDK do AdMob foi adicionado ao `package.json` depois do último lockfile, o `npm install` deve ser executado antes de `npm ci` em uma máquina de desenvolvimento para regenerar `package-lock.json`.

## 2. Criar o projeto Android

Se a pasta `android/` ainda não existir:

```bash
npx cap add android
npx cap sync android
```

Não faça alterações manuais no projeto Android antes de executar `npx cap add android`.

## 3. App ID do AdMob

No Android, o plugin exige o App ID do AdMob no `AndroidManifest.xml` e o recurso `admob_app_id` em `android/app/src/main/res/values/strings.xml`.

Exemplo:

```xml
<application ...>
    <meta-data
        android:name="com.google.android.gms.ads.APPLICATION_ID"
        android:value="@string/admob_app_id" />
</application>
```

```xml
<string name="admob_app_id">SEU_APP_ID_REAL</string>
```

Essa configuração é exigida pela documentação do plugin. citeturn3search0

## 4. Variáveis de produção

Configure no ambiente usado para gerar o bundle Android:

```dotenv
VITE_ADMOB_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
VITE_ADMOB_BANNER_AD_UNIT_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
VITE_ADMOB_REWARDED_AD_UNIT_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
```

Em desenvolvimento, os IDs oficiais de teste continuam sendo usados automaticamente quando as variáveis estão vazias. Em produção, valores vazios fazem o AdMob ficar desativado para evitar chamadas acidentais com configuração incompleta.

## 5. Play Billing

O plugin de compras exige o Base Plan ID para assinaturas Android. O fluxo deve usar:

- produto mensal + Base Plan mensal;
- produto anual + Base Plan anual;
- `purchaseToken` enviado ao backend;
- validação no Google Play Developer API;
- entitlement somente após validação;
- acknowledge no servidor.

Não liberar `isPro` somente no cliente.

## 6. Teste obrigatório antes de produção

Use uma faixa de **Internal testing** no Play Console e contas de licença/testadores. Teste:

1. compra mensal;
2. compra anual;
3. restauração da assinatura;
4. reinício do aplicativo;
5. renovação;
6. cancelamento;
7. grace period;
8. account hold;
9. expiração;
10. reembolso.

O `purchaseToken` deve ser validado no servidor em todos os caminhos relevantes.

## 7. AdMob — Rewarded

O Rewarded não usa mais contador local. O crédito somente é concedido pelo callback `RewardAdPluginEvents.Rewarded` do SDK. O plugin documenta esse callback como o ponto em que a recompensa é entregue. citeturn3search0

## 8. Pendências que continuam fora do código

- criar os App IDs/ad units reais no AdMob;
- configurar consentimento/Privacy & Messaging no AdMob;
- adicionar e verificar `app-ads.txt` no domínio de desenvolvedor;
- criar produtos e Base Plans reais no Play Console;
- criar/vincular a service account com permissões adequadas;
- configurar RTDN via Pub/Sub com autenticação e idempotência;
- executar testes em Internal testing;
- gerar AAB assinado e publicar primeiro em teste fechado/interno.

Essas etapas dependem de contas e consoles externos e não podem ser concluídas apenas editando o repositório.
