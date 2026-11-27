# Terminal — trechos selecionados e sanitizados

Transcrição documental em **11/11/2026 (UTC)** das mensagens fornecidas pelo autor.
Não é nova execução. O texto anexado `Texto colado.txt` foi lido nesta sessão;
outros trechos vieram das mensagens. Removidos identificadores pessoais, serial,
IP da LAN, QR Code e caminhos de perfil. Valores de duração são dos comandos.

## Dispositivo ainda não conectado

```text
CommandError: No Android connected device found, and no emulators could be started automatically.

Test-Path $aferiAdb
True

adb devices -l
List of devices attached
```

Posteriormente, o mesmo comando listou um aparelho no estado `device`, modelo
`SM_S731B`. O serial foi omitido deste registro.

## Comando na raiz do produto

```text
Error reading Expo config at <RAIZ_DO_PROJETO>\app.config.ts
Variável de ambiente ausente: EXPO_PUBLIC_FIREBASE_API_KEY.
```

O nome da variável é informação de configuração, não seu valor. A solução do
ensaio foi usar a demo isolada, sem fornecer credenciais do produto.

## Caminho com acento corrompido

```text
Error resolving plugin [id: 'com.facebook.react.settings']
Included build '<PASTA_COM_CARACTERE_CORROMPIDO>\aferi-task07\node_modules\@react-native\gradle-plugin' does not exist.
BUILD FAILED
```

O caminho apresentado nas mensagens codificava incorretamente `Ciência`. O projeto
passou a ser executado em `C:\dev\aferi-task07`.

## SDK não localizado

```text
Failed to apply plugin 'com.facebook.react.rootproject'.
A problem occurred configuring project ':app'.
SDK location not found. Define a valid SDK location with an ANDROID_HOME
environment variable or by setting the sdk.dir path in your project's
local properties file at '<DEMO>\android\local.properties'.
BUILD FAILED in 3s
```

## Primeiro build concluído, seguido de desconexão

```text
[ExpoRootProject] Using the following versions:
  - buildTools: 36.0.0
  - minSdk: 24
  - compileSdk: 36
  - targetSdk: 36
  - ndk: 27.1.12297006
  - kotlin: 2.1.20
  - ksp: 2.1.20-2.0.1

This version only understands SDK XML versions up to 3 but an SDK XML file of version 4 was encountered.
Deprecated Gradle features were used in this build, making it incompatible with Gradle 10.

BUILD SUCCESSFUL in 31m 27s
537 actionable tasks: 406 executed, 99 from cache, 32 up-to-date
Starting Metro Bundler

CommandError: Failed to get properties for device (<SERIAL_OMITIDO>)
adb.exe: device '<SERIAL_OMITIDO>' not found
```

## npx fora do diretório do projeto

```text
npx --no-install expo run:android --device --port 8097
npm error npx canceled due to missing packages and no YES option: ["expo@58.0.23"]
```

A mensagem ocorreu no diretório do perfil Windows; não comprova instalação de Expo 58.

## Texto anexado: build incremental e falha ao abrir pelo ADB

```text
BUILD SUCCESSFUL in 11s
537 actionable tasks: 19 executed, 518 up-to-date
Starting Metro Bundler
Installing <DEMO>\android\app\build\outputs\apk\debug\app-debug.apk
Opening <URL_LOCAL_DO_DEV_CLIENT> on SM_S731B
Error: closed
adb -s <SERIAL_OMITIDO> shell am start ... exited with non-zero code: 1
```

O erro veio depois da compilação e da tentativa de instalação/abertura. O comando
de instalação impresso não basta, sozinho, para provar que todas as etapas posteriores
concluíram. O app foi aberto posteriormente pelo autor e pelo QR Code do Metro.

## Metro empacotando com UI ainda vazia

```text
Starting project at C:\dev\aferi-task07\demos\android-capture
Starting Metro Bundler
An update for expo is available: 57.0.8 → ~57.0.32
4 other packages may need updating.
Android Bundled 425ms index.tsx (1026 modules)
Android Bundled 28ms index.tsx (1 module)
```

Empacotar não comprova renderização correta nem exige aceitar a atualização sugerida.

## Reabertura durante a investigação do preview

```text
Android Bundled 929ms index.tsx (1226 modules)
Opening <URL_LOCAL_DO_DEV_CLIENT> on SM_S731B
```

Essas linhas não identificam crash. Posteriormente a faixa “Atualizando” deixou
de aparecer quando o autor desativou Fast Refresh; não há log do evento exato
que disparou a atualização.

## Estados visuais relevantes transcritos

```text
captura-2:
fase:permission
permissao:solicitada
app:background
cancelamento:mudanca-do-app
fase:cancelled
permissao:concedida

captura-3:
permissao:ja-concedida-sem-dialogo
nativo:ready
fase:ready
toque:capturar
fase:recognizing
fase:closing
fase:failed
falha:frame-failed

captura-5:
App: active | Fase: reviewing
Nativo: preview-1
nativo:ready
fase:ready
toque:capturar
fase:recognizing
fase:closing
fase:reviewing
view:referencia-removida
```

São recortes dos painéis, não sequências completas nem logs persistidos pelo app.
Na última revisão, os candidatos visíveis eram 120/80/72, do cartão sintético.
