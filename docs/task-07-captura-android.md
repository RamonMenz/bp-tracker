# TASK-07 — captura Android conectada à revisão, em avaliação

Atualização posterior: a [TASK-09](task-09-interpretacao-fotografia.md) ampliou a
interpretação compartilhada por rótulos/layout. As referências à interpretação
mínima abaixo descrevem o alcance original da TASK-07; suas pendências nativas
permanecem válidas.

27/10/2026. Branch `feature/task-07-android-photo-capture`, mantendo a base staging
`7d72cb3` e todas as alterações locais anteriores. **TASK-07 permanece aberta.**
Há código de integração e testes locais; não há APK aprovado, Kotlin compilado
ou câmera real validada neste ambiente.

## Implementação e alcance

A base é a PoC da TASK-04 em
[`feature/pocs-fotografia-voz`, `7fbe137`](https://github.com/RamonMenz/bp-tracker/tree/7fbe13784afd6b8aee0fea2aa8122150836f1028/pocs).
O módulo fotográfico foi separado de voz, mantendo CameraX **1.5.1** e ML Kit
latino **embarcado 16.0.1**, sem trocar de motor. Nenhum pacote npm novo foi
instalado. CameraX/ML Kit são dependências Gradle da integração, já justificadas na
PoC: análise de quadros, inferência local e modelo embarcado; peso final não medido.

- `native-modules/aferi-photo-capture`: módulo Expo Android próprio, sem APIs de
  fotografia em arquivo, URI, galeria, MediaStore, compressão JPEG ou gravador.
- `ImageAnalysis` → cópia YUV_420_888 para **NV21 em ByteArray/ByteBuffer** → fecha
  `ImageProxy` → desassocia preview/análise da câmera → ML Kit → `OcrObservation`.
  Diferentemente da PoC, o ML Kit não depende de manter o ImageProxy aberto, o
  que permite desligar a câmera ao cancelar sem fechar memória usada pelo motor.
- `FrameBytes.java` trata rowStride/pixelStride e posição dos três buffers, sem
  modificá-los. Uma única cópia, limitada a **1.920.000 pixels**, dimensões pares.
  Resolução solicitada: 1280×960; se o dispositivo entregar quadro fora do limite,
  a tentativa é recusada, sem gravar imagem para contornar a limitação.
- Exclusão global entre views e tentativas, inclusive enquanto um ML Kit antigo
  termina. Buffer privado e reconhecedor só são descartados/fechados após completion.
  Câmera pode ser desligada antes. Cancelar não é cancelamento mágico da tarefa ML.
- `createAndroidPhotoSession`: permissão contextual, identidade/cancelamento/deadline
  da PoC, trava síncrona de captura, status por tentativa, erros fixos, fechamento
  aguardado antes de entregar candidatos. Falha/timeout de liberação bloqueia novo
  início; não afirma que liberou nem inicia processamento concorrente.
- `useAndroidPhotoReview`/`AndroidPhotoCaptureScreen`: permissão, preview, captura,
  cancelamento, recaptura e background; dados de OCR transitórios fora do estado
  React. View removida depois do fechamento, não mantida durante a revisão.
- Interpretação reaproveitada da PoC: **apenas rótulo SYS/DIA/PUL e um número na
  mesma linha**. Ausência/ambiguidade explícitas, sem inferir por faixa ou completar
  histórico. Caixas são normalizadas no frame orientado; não se implementou o
  parser completo da TASK-09 nem se comprovou leitura de sete segmentos.
- Revisão compartilhada das TASK-10/15, com validações, correções, instante do frame,
  cancelar/recapturar e **“Confirmar revisão em memória”**. A UI diferencia captura
  real em avaliação de fixtures sintéticas; confirmação não chama writer clínico.

Limites experimentais: permissão 30 s, preparação 20 s, enquadramento 60 s,
reconhecimento 30 s, fechamento 10 s; nativo aguarda frame até 10 s. Não são metas
aprovadas da TASK-06. Se a tarefa nativa não terminar, seu lease permanece ocupado
para impedir reaproveitamento inseguro. Não se promete sobrescrita física da RAM.

## Isolamento e legado

`demos/android-capture` é um Dev Client de avaliação independente, pacote
**`com.ramonmenz.afericapturetest`**, scheme `afericapturetest`. Reutiliza dependências
travadas na raiz, sem instalação/lock separado. Não importa raiz autenticada,
Firebase, App Check, Crashlytics, Google Sign-In ou writer clínico. Autolinking
exclui os módulos Firebase/Google Sign-In. Manifest solicita CAMERA e bloqueia
RECORD_AUDIO e permissões de armazenamento externo/mídia.

O módulo está em `native-modules/`, habilitado explicitamente pelo projeto de
avaliação. **Não entra no autolinking do aplicativo legado nesta etapa**. A tela e
os adaptadores estão no `src/` do produto, prontos para composição futura sob
demanda; habilitar no app principal depende de TASK-04/06 e validação segura.
Isso evita mudar o APK/fluxo manual ainda não homologado ou ligar produção à PoC.

## O que foi efetivamente verificado aqui

| Verificação | Resultado e limite |
|---|---|
| Cópia YUV/NV21 em Java | **8 checks** executados com buffers sintéticos: planar, padding, offsets, pixelStride, dimensão inválida/limite, buffer curto/stride inválido e somente leitura. Não é câmera/ML Kit |
| Jest | **553 testes em 56 suítes aprovados**, incluindo 22 novos de interpretação mínima, sessão de captura e integração do hook à revisão; SDK/view substituídos em testes isolados |
| Lint/TypeScript | Raiz e TypeScript da entrada de avaliação aprovados |
| Prebuild Android | Aprovado, sem instalação; manifesto/configuração gerados. Isso não compila Kotlin |
| Autolinking | Identificou AferiPhotoModule no projeto de avaliação; Firebase/Google Sign-In ausentes; módulo novo ausente do autolinking do produto |
| Bundle Android/Hermes | Export aprovado, aproximadamente 3,1 MB. Bytes JS, não tamanho de APK/modelo/memória |
| Kotlin/Gradle/APK | **Não compilados**: bootstrap do wrapper Gradle 9.3.1 falhou ao baixar a distribuição, `SocketException: Operation not permitted` no ambiente restrito. Não há Android SDK/ADB/aparelho instalado aqui |
| Câmera/privacidade em runtime | **Não verificadas**. Ausência de arquivos no código e compilação/export não comprovam ausência de persistência interna de SDK/SO |

Testes cobrem recusa de permissão, permissão tardia após cancelar, uma captura,
status/resultado de tentativa antiga, reconhecimento cancelado, cleanup aguardado,
cleanup falho/timeout bloqueando recaptura, erros sem conteúdo clínico, background,
interpretação parcial e confirmação apenas em memória. Testes não comprovam
comportamento de câmera física, libs nativas, rede ou armazenamento do dispositivo.

Nenhuma operação Firebase, alteração remota, dependência npm nova, build pago,
commit, push ou deploy. Os documentos e código das PoCs não foram sobrescritos.

Reproduzir verificações locais na raiz (JDK 17+ para o teste Java):

```bash
npm run lint
npm run typecheck
npm test -- --runInBand
node node_modules/typescript/bin/tsc --noEmit -p demos/android-capture/tsconfig.json
mkdir -p /tmp/aferi-frame-tests
java -m jdk.compiler/com.sun.tools.javac.Main -d /tmp/aferi-frame-tests native-modules/aferi-photo-capture/android/src/main/java/expo/modules/aferiphoto/FrameBytes.java native-modules/aferi-photo-capture/checks/FrameBytesTest.java
java -cp /tmp/aferi-frame-tests expo.modules.aferiphoto.FrameBytesTest
```

## Executar no computador — build local isolado

1. Use a cópia deste workspace **com arquivos não commitados**, incluindo
   `native-modules/`, `demos/android-capture` e novos arquivos de `src/`. Não basta
   baixar staging: esta tarefa não foi commitada/enviada.
2. Instale Node 24 e Android Studio/SDK. A geração usa Expo SDK 57/RN 0.86.0 e
   Gradle 9.3.1. Prepare JDK 17 e os componentes requeridos pelo Gradle; a PoC
   anterior observou plataforma Android 36, Build-Tools 36.0.0 e NDK 27.1.12297006.
   Se a sincronização pedir versão diferente, envie o erro sanitizado antes de
   trocar dependências. Sem Android Studio/SDK não há build nativo local.
3. Na raiz, instale **somente pelo lock da raiz**:

```bash
npm ci --ignore-scripts
cd demos/android-capture
../../node_modules/.bin/expo prebuild --platform android --no-install
../../node_modules/.bin/expo run:android --device --port 8097
```

No Windows use o equivalente do executável em `node_modules/.bin` ou Android Studio.
O primeiro build exige acesso aos repositórios Maven/Gradle/Google/npm. A PoC antiga
também encontrou bloqueio em `repo.reactnative.dev` ao baixar RN 0.86.0; esse download
não foi alcançado nesta rodada. Não desligue TLS nem troque versões para contornar.

Habilite depuração USB no telefone e aceite sua autorização. O comando compila
**localmente** e instala somente `com.ramonmenz.afericapturetest`. Não use Expo Go,
EAS Build, Firebase CLI ou credenciais do produto. Depois de instalar esse Dev
Client, para reiniciar só o JS:

```bash
../../node_modules/.bin/expo start --dev-client --port 8097
```

Alterar Kotlin/Java/Gradle exige recompilar. Se necessário, encaminhe Metro por USB
com `adb reverse tcp:8097 tcp:8097`. Isso encaminha assets/JS estáticos; não é
prova de processamento local ou de ausência de envio de captura.

## Roteiro específico no dispositivo

Use somente um cartão/monitor controlado, sem pessoa/PII, com texto grande:

```text
SYS 120
DIA 80
PUL 72
```

Esse primeiro teste é OCR real de **cartão sintético**, não leitura comprovada de
display de aparelho. Ensaios de displays reais e seus limites devem ser registrados
separadamente; não use valores de usuários do produto.

| Passo | Procedimento | Resultado esperado / o que registrar |
|---|---|---|
| A | Abrir app sem tocar em Iniciar | Sem pedido de câmera, indicador apagado; nenhum login/Firestore |
| B | Iniciar e negar permissão | Mensagem de recusa; sem preview/revisão; nova solicitação somente por ação |
| C | Autorizar após nova ação | Preview traseiro, orientação textual, Capturar habilitado só após ready |
| D | Enquadrar cartão e Capturar | Reconhecer uma vez, câmera desligar após copiar frame, fase de liberação antes da revisão; conferir números/ausências reais |
| E | Corrigir candidato/data/nota e confirmar | Resultado **somente em memória**, sem histórico ou mensagem de salvamento clínico |
| F | Tirar outra fotografia | Limpa revisão, solicita nova captura; candidato antigo não reaparece |
| G | Tocar repetidamente Iniciar/Capturar/Recapturar | Uma sessão e um reconhecimento; sem abrir outra enquanto ocupado/liberando |
| H | Cancelar na permissão, preparação, preview e reconhecimento | Sem revisão restaurada depois; indicador de câmera apaga; aguardar liberação, sem prometer cancelamento do ML Kit já iniciado |
| I | Home/troca de app/bloqueio/rotação durante cada etapa | Captura interrompida, recursos liberados; voltar não reinicia nem restaura resultado antigo |
| J | Sair/voltar rapidamente e recapturar | Lease antigo impede sobreposição até concluir; recurso ocupado tem mensagem segura, não outro OCR paralelo |
| K | Mostrar rótulo separado, número extra, ausência de pulso e texto ilegível | Campos faltantes/incertos, sem inventar, trocar SYS/DIA ou preencher pelo histórico; anotar limites da interpretação mínima |
| L | Sem câmera disponível ou sem condições de leitura | Erro/timeout seguro, cancelamento disponível. Timeout injetado foi testado isoladamente; não declare testado em hardware se não ocorreu |

### Inspeção de armazenamento, rede e recursos — condição de aceite

**Não afirmar conformidade apenas por conseguir executar D/E.** Em build debug,
inspecione o sandbox **somente do pacote de avaliação**, antes/depois de sucesso,
cancelamento, erro, background e reinício. Não copiar fotos/áudio, fazer heap dump
com captura ou ativar logs de transcrição. Exemplo de inventário sem ler conteúdo:

```bash
adb shell run-as com.ramonmenz.afericapturetest find . -type f
adb shell run-as com.ramonmenz.afericapturetest ls -la files cache no_backup
```

Diretórios ausentes são possíveis. Assets estáticos, modelo embarcado, bundle JS,
preferências e cache do Dev Client devem ser distinguidos de mídia/resultados.
Qualquer foto temporária/cache clínico observado reprova o caminho; anote apenas
metadados seguros e interrompa a habilitação. Um inventário sem arquivo novo é
evidência limitada, não prova universal de que SO/SDK jamais persistem.

Depois de carregar o JS estático, repita o cartão em modo avião. Monitore também
destinos/contadores de rede por UID do app ao capturar com rede ativa e ao
reconectar; não grave payloads/pcaps contendo imagens. Diferencie tráfego de Metro
de conteúdo clínico. Falta de requisição no inspector Java não cobre todo tráfego
nativo: registre ferramenta/alcance. Inferência offline útil não prova ausência
de filas ou arquivos internos; confira armazenamento e reconexão separadamente.

Use indicador de câmera, estado da UI e profiler **ao vivo**, sem dump de buffers,
para avaliar liberação/repetição. Se permanecer ocupado ou indicar cleanup falho,
não insistir em novas capturas concorrentes: cancelar/sair, registrar o estado e
retornar para correção. Não há garantia de sobrescrita física da memória.

### Devolver evidência segura

Registre modelo/Android/API, versão local da fonte/APK, toolchain, estado de rede,
permissão e cada passo A–L como passou/falhou/não executado, com erro **sanitizado**.
Inclua somente valores esperados do cartão sintético e métricas agregadas de tempo/
memória. Não envie serial, dados de paciente, imagem capturada, logcat completo,
credenciais ou dumps. Se o build falhar, envie tarefa Gradle, primeira mensagem
relevante e domínio/código HTTP, não o ambiente completo.

## Pendências

- Compilar Kotlin e APK, corrigindo qualquer erro antes de declarar build aprovado.
- TASK-04/06: viabilidade em dispositivo, privacidade efetiva, cobertura/limites.
- TASK-09: interpretação completa por rótulos/layout e avaliação de sete segmentos.
- TASK-10/11: integração no app principal, contexto/sessão e persistência clínica
  somente após homologação segura; permanecem sem ligação a este cliente de teste.
- Acessibilidade em Android real e regressão/desempenho do legado no dispositivo.

Próxima ação recomendada: build local e roteiro A–L/inspeção acima; trazer o erro
de build se houver. Saldo de horas/custos reais segue não informado, teto R$300
preservado, sem contratar equipamentos/serviços/builds.
