# TASK-09 — Etapa 3: verificação do candidato ROI

## Estado e escopo

Revisão do candidato `roi-1`, fonte de build fixa
`45f7376a7ed2f7e04725866ffe98ff625f057566`, código funcional `730b721`.
Branch desta revisão: `test/task-09-verificacao-candidato`, criada desse head
limpo. Staging remoto consultado em `a106a39d10d17b6e5cb16a48fd10328a4dede24e`;
PRs #80 e #81 abertos/draft. Esta entrega contém seus ancestrais, sem exigir
merge intermediário. Branches, arquivos e referências anteriores preservados.
Ferramentas Windows fixadas no commit `eb92ec0251033b537b74ecd784f6ed0c6f005005`.
Não há mudança no código executável do candidato nesta revisão: testes e
ferramentas verificam o mesmo candidato do PR #81.

Referências: [constituição](../constitution.md), [diretrizes](../CLAUDE.md),
[tarefas](../tasks.md), [spec de fotografia](../specs/spec-fotografia.md),
[plano, etapa 3](task-09-plano-correcao-segmentos.md),
[diagnóstico](task-09-diagnostico-visor-real.md),
[revisão da etapa 1](task-09-plano-correcao-segmentos.md#revisão-da-primeira-entrega--etapa-1-parcial),
[candidato e prova geométrica](task-09-candidato-roi-ram.md) e
[backup anterior](task-07-backup-pos-merge.md).

**Veredito: Etapa 3 parcial.** Revisão e testes locais concluídos; compilação
Android completa e identidade/inspeção do novo APK dependem do build do autor.
Não houve novo APK, instalação, abertura, captura ou execução física nesta etapa.
Etapa 1 continua parcial fisicamente. A/B histórico não identifica a causa no
SDK/LCD: ausência de ASCII nos tokens filtrados não demonstra ausência na saída
original do ML Kit. Não declara correção da leitura, viabilidade universal ou
conclusão das TASK-04/06/07/09/18. Habilitação clínica permanece bloqueada.

## Matriz da revisão

| Requisito | Estado | Evidência e limite |
|---|---|---|
| Recorte, bordas, identidade e escala | Atendido no código/testes puros | `FrameTransformTest`: Y e VU, oráculos explícitos 4×4 para recortes nas quatro rotações, redução 4×4→2×2, ampliação, uniforme e identidade. Não mede nitidez ou OCR. |
| Dimensões, overflow, strides, posições e limites | Atendido no código/testes puros | `FrameBytesTest`: 18 verificações de buffers/11 de dimensões; padding, pixelStride=2, leitura somente, slice direto, posição/limit truncados, strides inválidos, cap/overflow. Validação anterior à alocação. |
| Guia e quadro analisado | Parcial | `CaptureGuide` usa transformações reais CameraX, ViewPort compartilhado, buffer completo e rotação; guia inversa do ROI alinhado; captura revalida geometria desenhada. Matrizes sintéticas fill-center, quarter turn e espelhamento testadas. Sem observação no Samsung. |
| Caixas no upright-frame de origem | Atendido no código/testes puros; físico pendente | `Plan.toSourceBox`: offset e escalas efetivas por eixo; pixels já upright recebem rotação zero no SDK. Ida/volta nas quatro rotações, clipping/bordas e rejeição de caixas não finitas/invertidas. |
| Números e rótulos externos BSPII | Parcial | Guia exige LCD **e carcaça rotulada** dentro dela; ROI arredonda para fora. Testes incluem pares sintéticos à esquerda/direita. Não há detector semântico de carcaça: preservação depende de enquadramento e reconhecimento; não demonstrada no hardware. |
| Alocações próprias | Atendido no código/testes puros | Até 1.920.000 pixels por array NV21; cada um até 2.880.000 bytes; original+saída até 5.760.000 bytes. Teste materializa o limite e rejeita saída inválida. Sem bitmap/array de rotação intermediário. Não mede heap total, SDK, CameraX ou GPU. |
| Ownership, completion e lease | Atendido na revisão/modelo; SDK físico pendente | `CaptureRunTest`: nenhuma passagem concorrente; original/saída retidos durante SDK/worker; cancelamento em cada fronteira; estados/saídas/completions inválidos rejeitados. `AferiPhotoView` só avança no listener de completion. Listener não registrável após aceitação mantém lease bloqueado. Mocks não provam o SDK. |
| Cancelar, background, desmontar e resultado tardio | Atendido na revisão/mocks; físico pendente | Eventos nativos cancelam; worker consulta cancelamento por linha; geração e identidade descartam callback antigo. Jest cobre cancel/dispose, AppState, reinício/effect retirement e resultado antigo durante tentativa nova. |
| Falha e timeout de cleanup | Atendido na revisão/mocks; físico pendente | Fechamento precisa de ACK, falha/timeout bloqueiam nova tentativa; resultado/ACK tardio não desbloqueiam. `releaseIdle` só solta lease após unbind e close sem falha. Não significa apagamento físico imediato de RAM. |
| Sem mistura/escolha de resultados | Atendido no código/Jest | Par só publicado após duas conclusões e cleanup; falha em uma descarta ambas; original/processado vazios/distintos preservados; nenhuma chamada silenciosa a recognize como fallback. |
| Sanitização, filtros e diagnóstico | Atendido no código/Jest/política pura | Text/TextBlock/Line e pós-filtro distinguidos por indicadores fixos; bbox ausente e limites 500 linhas/500 UTF-16 mantidos. `OcrLinePolicyTest`: 3.238 verificações; testes de contrato descartam campos extras/texto bruto e erros sensíveis. Não explica a execução histórica B. |
| Ausência de mídia persistente, logs clínicos, upload e fallback | Atendido na revisão do caminho próprio; SDK/SO pendentes | Caminho CameraX→cópia NV21→InputImage→ML Kit→bridge→OcrObservation→parser em RAM, sem File/URI de captura, logger, writer ou rede introduzidos. Comparação só na demo, sem confirmação clínica. Busca de APIs e leitura do caminho não provam internals de bibliotecas, disco/rede no dispositivo ou telemetria SDK. |
| Compilação Android/novo APK | Bloqueado aguardando autor | JVM/TypeScript e checagens Kotlin isoladas anteriores não são assembleDebug/DEX/Expo completo. Roteiro separado abaixo. |
| Manifesto, backup, inspector e assinatura do novo APK | Bloqueado aguardando artefato identificado | Ferramentas com hashes explícitos preparadas; propriedades false não equivalem a inspeção compilada. Novo hash ainda desconhecido; guard de atualização será vinculado a ele após retorno, nunca herdado do hash259. |

## Problemas encontrados e verificações

As principais lacunas corrigíveis eram de cobertura: recorte testava sobretudo
comprimento/ida e volta, sem oráculos independentes de pixels; faltavam redução,
materialização do limite de arrays, mais casos de limit/slice/stride, completion
duplicado e par antigo durante nova tentativa. Os testes adicionados cobrem esses
casos e timeout/erro sanitizado do modo de comparação. Nenhuma falha funcional foi
demonstrada por eles; não houve alteração do parser ou da variante. Luminância
continua segunda variante condicional, não implementada.

Executado localmente:

- Lint, TypeScript raiz e demo, Jest: **832 testes/71 suítes aprovados**. Mocks e
  entradas sintéticas; avisos `act` em suítes legadas, sem falhas.
- Quatro checks Java puros: `FrameBytes`, `FrameTransform`, `CaptureRun` e
  `OcrLinePolicy`, aprovados. Compilador ECJ 3.38 com alvo Java17, runtime Java21;
  CI usa javac/JDK17. Não executam CameraX/ML Kit/Android.
- Check PowerShell novo: fonte limpa/correta, flag false única, hash alterado,
  parser dos entrypoints e processos reais com stderr/exit0 e exit7, aprovado.
  Não simula compilação bem-sucedida como prova nativa.
- Mods reais Expo de inspector/backup e checks PowerShell existentes de
  assinatura, manifesto e regras empacotadas, aprovados. aapt2/apksigner simulados
  nesses checks; nenhum APK real inspecionado aqui.
- `git diff --check`, aprovado. Inspeção dos diffs/caminhos nativo e JS sem nova
  persistência, logs clínicos, transporte ou fallback. Código de produto, motor,
  dependências e parser preservados.

CI do candidato fonte `45f7376`: quatro jobs aprovados, execução
[45688397647](https://github.com/RamonMenz/bp-tracker/actions/runs/45688397647).
CI desta revisão será registrado no PR com o head exato após o push. Nenhum desses
jobs compila um APK Android. Inspeções Kotlin isoladas da etapa 2 continuam apenas
evidência de APIs/tipos, com doubles Expo no teste de AferiPhotoView.

## Windows — preparação (Terminal A, PowerShell)

Executar a partir da raiz de **uma cópia local já existente** do repositório.
Não assumir caminho C:\\dev de sessões antigas. Telefone desconectado, demo
fechada; não iniciar Metro. Preservar fontes/APKs antigos, bundle2191 e cartões.
Pré-requisitos: Git, Node em faixa suportada pelo RN0.86, npm, JDK17 e Android SDK
existentes em `%LOCALAPPDATA%\Android\Sdk`, build-tools36.0.0. Não atualizar ou
instalar versões por tentativa. Se Java/SDK não forem encontrados, parar e
devolver somente a categoria do impedimento.

```powershell
$ErrorActionPreference = 'Stop'
$repo = (git rev-parse --show-toplevel)
if ($LASTEXITCODE -ne 0 -or -not $repo) { throw 'repo-unavailable' }
$origin = (git -C $repo remote get-url origin)
if ($LASTEXITCODE -ne 0 -or $origin -notmatch '^(https://github\.com/|git@github\.com:)RamonMenz/bp-tracker(?:\.git)?$') { throw 'repo-origin-unexpected' }
$parent = Split-Path -Parent $repo
$tools = Join-Path $parent 'aferi-task09-etapa3-tools'
$build = Join-Path $parent 'aferi-task09-roi-build'
if ((Test-Path -LiteralPath $tools) -or (Test-Path -LiteralPath $build)) { throw 'destination-exists-preserve' }
node --version
if ($LASTEXITCODE -ne 0) { throw 'node-unavailable' }
npm.cmd --version
if ($LASTEXITCODE -ne 0) { throw 'npm-unavailable' }
java -version
if ($LASTEXITCODE -ne 0) { throw 'java-unavailable' }
git -C $repo fetch origin test/task-09-verificacao-candidato feat/task-09-roi-ram
if ($LASTEXITCODE -ne 0) { throw 'fetch-failed' }
git -C $repo worktree add --detach $tools eb92ec0251033b537b74ecd784f6ed0c6f005005
if ($LASTEXITCODE -ne 0) { throw 'tools-worktree-failed' }
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$tools\tools\task09\Build-AferiRoiCandidate.ps1" -Phase Prepare -RepositoryPath $repo -BuildPath $build
if ($LASTEXITCODE -ne 0) { throw 'prepare-failed-stop' }
```

Esperado: nova worktree de ferramentas eb92ec0 e nova worktree de build45f7376,
npm ci com lock/sem scripts e prebuild Android da demo, checks dos mods aprovados,
JSON `Fase=Prepare`, `FonteLimpa=true`, inspector false e hash nulo. Nenhum APK
compilado/instalado. O build não toca no checkout original. Se pasta já existir,
preservar e parar; não apagar/resetar/reutilizar por conta própria. Execução parcial
também deve ser preservada para diagnóstico antes de preparar outra pasta.

## Windows — compilação (Terminal B, PowerShell separado)

Abrir outro terminal na raiz da mesma cópia original. Só após Prepare aprovado.

```powershell
$ErrorActionPreference = 'Stop'
$repo = (git rev-parse --show-toplevel)
if ($LASTEXITCODE -ne 0 -or -not $repo) { throw 'repo-unavailable' }
$parent = Split-Path -Parent $repo
$tools = Join-Path $parent 'aferi-task09-etapa3-tools'
$build = Join-Path $parent 'aferi-task09-roi-build'
$toolsHead = (git -C $tools rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $toolsHead -cne 'eb92ec0251033b537b74ecd784f6ed0c6f005005') { throw 'tools-head-unexpected' }
$toolsChanges = @(git --no-optional-locks -C $tools status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0 -or $toolsChanges.Count -ne 0) { throw 'tools-not-clean-preserve' }
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$tools\tools\task09\Build-AferiRoiCandidate.ps1" -Phase Build -RepositoryPath $repo -BuildPath $build
if ($LASTEXITCODE -ne 0) { throw 'build-failed-stop' }
```

Executa apenas `:app:assembleDebug`, arm64-v8a, inspector explicitamente false.
APK novo em `aferi-task09-roi-build\demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk`.
Para se já houver APK: preserva e recusa possível artefato antigo. Esperado
`BUILD SUCCESSFUL` e JSON `Fase=Build`, fonte45f7376 limpa, SHA256 novo,
`FlagFalsePassadaAoGradle=true`, `BytecodeInspecionado=false`,
`InstalacaoExecutada=false`, `AplicativoAberto=false`.

**Parar** em qualquer erro, identidade/flag diferente, conflito, licença/SDK/JDK
indisponível ou mudança rastreada. Não usar installDebug, expo run:android,
prebuild --clean, npm install na demo, clear, uninstall ou atualização forçada.
Aviso em stderr com exit0 não é falha; exit diferente de zero sempre é.
Não substituir o comando por build em pasta antiga.

Retorno desta fase: versões Node/npm/Java consultadas, preparação/build
`concluído` ou categoria fixa do impedimento e **somente o JSON final**. Não enviar
APK, logs completos, caminhos pessoais, keystore/certificado, imagens ou valores.
Não abrir aplicação nem iniciar captura após compilar.

## Inspeção — somente após retornar e conferir o novo hash

Codex deve conferir fonte/hash recebidos antes do próximo comando. O script
`Inspect-AferiRoiCandidate.ps1` está preparado para exigir `-ExpectedSha256`,
`-PreviousApkPath` e `-PreviousExpectedSha256` sem defaults históricos. Caminho
anterior fica privado no Windows; sua existência não é presumida. Usa aapt2 SDK36
para manifesto/backup selecionados e apksigner verify para comparar assinaturas
localmente. Saída contém hashes/booleans, nunca certificados ou dump completo.
Os comandos concretos serão preenchidos com o **novo hash conferido**, após o
retorno, sem placeholders copiáveis de identidade.

Conferir pacote `com.ramonmenz.afericapturetest`, versões/SDKs, debug/cleartext/
INTERNET de avaliação, allowBackup=false, as duas referências XML e exclusões
CE/DE/external de backup e transferência. Conferir flag false gerada e passada
ao Gradle; inspeção compilada do inspector permanece distinta e pendente se não
houver ferramenta/evidência adequada. `BytecodeInspecionado=false` não pode ser
convertido em comprovação por inferência. Verificar assinatura de ambos os APKs,
exigir certificados iguais para atualização. Reconfirmar identidade do pacote
instalado em consulta sanitizada antes de usar o APK local antigo como referência
do instalado; o histórico259 não basta. Nenhuma assinatura deve ser publicada.

## Atualização — pendente, separada da inspeção

Não há instalador novo liberado sem identidade. Após o retorno, adaptar guard
restrito para **esse** candidato (fonte, hash, pacote, versão e assinatura
conferidos), baseline instalado então observado e SM-S731B. Testar recusas de hash
errado/alterado, baseline diverso, pacote/modelo/assinatura incompatível e ADB
ausente/offline/múltiplo antes de fornecer comando. Manter `install -r` somente
para baseline aprovado, sem downgrade/force, clear, uninstall ou abertura;
reconferir hash instalado depois. Não modificar/reutilizar
`Update-AferiInspectorEvaluation.ps1` como se seu hash259 aceitasse este APK.
Se alguma condição não puder ser verificada, parar e preservar o instalado.

## Abertura — etapa posterior, sem captura implícita

Só preparar após inspeção e atualização confirmadas: Metro/bundle da fonte45f7376
em porta/cópia identificadas, sem reaproveitar bundle2191 ou fonte Windows a649b6c.
Verificar revisões nativas/comparação roi-1, modo explícito e revisão vazia antes
de qualquer gesto. Preparar offline separadamente. Não abrir por scripts de build,
inspeção ou instalação. Não pressionar `a` no Metro. Não iniciar experimento A/B
ou LCD neste roteiro. Condições da etapa4 e gates SDK/rede/privacidade continuam
abertos; compilação não valida reconhecimento ou uso clínico.
