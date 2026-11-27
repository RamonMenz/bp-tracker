# V3 — Registro por voz no produto Android

## Decisões

- `EXPO_PUBLIC_ANDROID_VOICE_ENABLED` fica desligada por padrão. Só o valor literal `true` habilita a entrada Android. Com a flag ausente, o Metro resolve a entrada para o componente vazio e o formulário manual continua disponível. A V3 reutiliza o ponto de entrada da tela de registro e o contexto de escrita da V2. [V2 Web](voz-produto.md)
- A tela exige sessão autenticada, aceite vigente confirmado pelo servidor e foco. O toque em **Verificar voz local** carrega o binding e consulta `checkRecognitionSupport` no reconhecedor explicitamente local do Android. A consulta exige API 33+ e `pt-BR` em `installedOnDeviceLanguages`. Ela libera o reconhecedor da consulta antes de mostrar **Registrar por voz**. Serviço ou idioma ausente apresenta uma mensagem fixa e mantém o manual disponível. [Spec de voz, §3 e §7](../specs/spec-voz.md)
- **Registrar por voz** carrega a tela de voz. **Começar a falar** pode pedir permissão de microfone e volta a consultar o idioma na própria instância que vai capturar. A captura usa `createOnDeviceSpeechRecognizer`. O app não solicita download de modelo nem chama reconhecimento remoto. A verificação e a captura são ações separadas do usuário. [TASK-12](task-12-voz-android.md)
- O produto autolinka `aferi-local-voice` e exclui `aferi-photo-capture`. A permissão `RECORD_AUDIO`, aceita pelo autor, consta no manifesto da biblioteca e também na configuração Expo do app para constar no manifesto gerado pelo prebuild, antes do merge de manifestos pelo Gradle. O código nativo fica registrado no cliente compilado. A flag desligada exclui o código JavaScript de voz do bundle e o app não consulta o binding, cria o reconhecedor ou pede a permissão durante o uso manual.
- A sessão entrega somente o resultado final à revisão, depois da liberação do reconhecedor. O parser e os campos revisáveis são os usados na V2. O documento recebe os valores revisados e `source: 'voice'` somente após **Confirmar e salvar medição**. Transcrição e confiança não são incluídas no documento, na observação, em logs ou nos coletores de falhas. A oferta de segunda medição acontece após o ACK do repositório.
- Cancelamento, falha, silêncio, retorno parcial, background, perda de foco e troca de epoch invalidam a tentativa ou a revisão. A troca de epoch inclui novo login com o mesmo UID. A perda de foco cobre a tela, o foco de áudio e a janela Android. Os diálogos do próprio fluxo de microfone e data podem desfocar a janela temporariamente. Background ou saída da tela continua cancelando nesses casos. Quando uma escrita já confirmada chegou ao SDK, ela segue a sincronização normal do Firestore. Seu ACK tardio é descartado pela interface se o fluxo foi invalidado.

## Verificações

| Verificação | Resultado |
|---|---|
| Qualidade | Lint e typecheck passaram. O Jest aprovou 1.049 testes em 87 suítes, incluindo o formulário manual e a V2 Web. |
| Autolinking na raiz | `expo-modules-autolinking resolve --platform android --json` listou `aferi-local-voice` e `expo.modules.aferivoice.AferiVoiceModule`. `aferi-photo-capture` estava ausente. |
| Prebuild | `expo prebuild --platform android --no-install` passou em uma cópia temporária com configuração Firebase fictícia e a flag ausente. `android/app/src/main/AndroidManifest.xml` declarou `RECORD_AUDIO` e não declarou `CAMERA`. |
| Bundle padrão (VOZ-01) | O export Android de produção com a flag ausente usa JavaScript legível para inspecionar o código e todos os mapas de origem. O formulário manual está no bundle. Entrada, binding, sessão, parser, revisão e escrita assistida estão ausentes. A guarda roda no CI. |
| Hook e tela | Reconhecedor Android **SIMULADO**. Os testes exercitam o adaptador, a revisão, o parser e a porta de escrita reais com repositório simulado. Cobrem flag, capacidade, carregamento sob demanda, recusa, toques repetidos, silêncio, parcial, falha, interrupção, confirmação única, cancelamento, background, foco, resposta tardia e troca de epoch. |
| Security Rules | A suíte compartilhada com a V2 usa `@firebase/rules-unit-testing`, repositório real e rascunho de reconhecimento **SIMULADO**. Cobre criação única, fila vazia antes da confirmação, invalidação por epoch e rejeições de cliente anônimo, outra conta e metadados de reconhecimento. Após duas tentativas locais, o emulador ficou indisponível. Na segunda, com cache e configuração em diretório gravável, o CLI falhou ao obter o JAR oficial `cloud-firestore-emulator-v1.21.0.jar`. A execução fica no job de regras do CI. |

Reprodução na raiz, com as dependências instaladas pelo lock. O emulador de regras requer Java 21.

```sh
npm run lint
npm run typecheck
npm test -- --runInBand
npx expo-modules-autolinking resolve --platform android --json
node tools/voz-produto/android-bundle-off.check.cjs
npm run test:rules
```

## Limites

- A compilação Kotlin e o manifesto mesclado do APK do produto ficam sem verificação nesta entrega. O ambiente não tem SDK Android nem ADB. O prebuild gera o projeto sem compilar. A evidência no Samsung da V1 é do cliente de avaliação. [Resultado da TASK-12](task-12-voz-android.md)
- Ainda é necessário verificar no novo cliente do produto o serviço e o modelo oferecidos pelo aparelho, a consulta de idioma antes da permissão, a liberação física do microfone, a ausência de retenção e tráfego do serviço do sistema (VOZ-13 e VOZ-15) e a interação com TalkBack. A disponibilidade pode variar por versão, fabricante e idioma instalado. [Critérios de aceite](../specs/spec-voz.md#5-critérios-de-aceite)

## Roteiro no aparelho após o novo build

Em Windows PowerShell, na raiz da branch, use o APK novo do Dev Client do produto e a configuração Firebase de teste já definida pelo autor. Use a conta separada e frases sintéticas do próprio autor. Garanta que a flag esteja ausente em `.env.local`.

```powershell
$bpAdb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
& $bpAdb -d install -r '<caminho do novo APK do BP Tracker>'
& $bpAdb -d shell getprop ro.build.version.sdk
& $bpAdb -d shell dumpsys package com.ramonmenz.bptracker | Select-String 'android.permission.(RECORD_AUDIO|CAMERA)'
& $bpAdb -d reverse tcp:8081 tcp:8081
Remove-Item Env:EXPO_PUBLIC_ANDROID_VOICE_ENABLED -ErrorAction SilentlyContinue
npm run start -- --localhost --port 8081 --clear
```

1. Abra o Dev Client e conecte ao Metro em `http://localhost:8081`. Com a flag ausente, confira que a tela de registro mantém o formulário manual e não oferece verificação de voz nem pede microfone. Registre uma medição sintética manual com a conta de teste.
2. Pare o Metro com `Ctrl+C`. Só para o ensaio local conduzido pelo autor, inicie o Metro com a flag temporária e recarregue o Dev Client.

   ```powershell
   $env:EXPO_PUBLIC_ANDROID_VOICE_ENABLED = 'true'
   npm run start -- --localhost --port 8081 --clear
   ```

3. Toque em **Verificar voz local**. Espere **Registrar por voz** somente se pt-BR local estiver instalado e verificável. Confira que a verificação não pede microfone. Onde a capacidade falhar, confira a mensagem fixa e continue pelo formulário manual.
4. Abra **Registrar por voz** e escolha **Começar a falar**. Teste negar a permissão e depois conceder em nova tentativa explícita. Se o Android colocar o app em segundo plano ao abrir o diálogo, volte ao app e comece uma nova tentativa. Dite “doze por oito, pulso setenta e dois”, confira os campos, edite data e hora e cancele. Repita com silêncio, segundo plano, perda de foco e troca de sessão. O histórico deve ficar sem novas medições nessas tentativas.
5. Com o pacote local e a sessão carregados, repita o reconhecimento com Wi-Fi e dados móveis desligados e cancele a revisão. Para validar persistência, restabeleça a rede, dite uma nova medição de teste, corrija um campo e confirme uma vez. Confira uma nova leitura com `source: 'voice'` na conta de teste, após o ACK. Se o backend recusar `voice`, registre o erro em português e verifique com o autor qual versão de rules está publicada.
6. Ao terminar, pare o Metro e remova a flag da sessão com `Remove-Item Env:EXPO_PUBLIC_ANDROID_VOICE_ENABLED -ErrorAction SilentlyContinue`. Registre API, versão do serviço se disponível, resultado de cada cenário, liberação observada do microfone e contagem de escritas. O relato usa resultados sanitizados, sem áudio, transcrição, serial ou identificador da conta.

## Registro para o relatório final

- **Decisão.** A V3 acrescenta reconhecimento local Android ao BP Tracker atrás de uma flag desligada por padrão. A entrada depende de `pt-BR` instalado e verificável. A porta de confirmação reaproveitada da V2 cria uma leitura `source: 'voice'` após o gesto explícito.
- **Evidência.** Autolinking, manifesto do prebuild e bundle padrão foram verificados no host. O ciclo de captura, descarte, revisão e confirmação foi exercitado com reconhecedor **SIMULADO**. O emulador de regras ficou pendente no CI por falha de obtenção do JAR no host.
- **Validação pendente.** Compilação Kotlin e ensaio com o novo Dev Client do produto, incluindo uma leitura real confirmada com fala sintética do autor, verificação do microfone e inspeção de privacidade do serviço no aparelho.
