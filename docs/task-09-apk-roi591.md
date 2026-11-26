# TASK-09 — artefato ROI591 e consulta antes de atualização

## Evidência recebida do autor

Fonte de build `45f7376a7ed2f7e04725866ffe98ff625f057566`, limpa.
Novo APK `591555a24e8ba0d952c8dc93829c8204b3c731348764a61f80c29a79580038f6`.
Preparação e assembleDebug concluídos no Windows pelo autor, com Node24.22.0,
npm11.19.1, JDK17.0.21, Gradle9.3.1/JVM17.0.21 (Adoptium17.0.21+9).
Codex não recebeu/executou o APK. Configuração gerada e argumento Gradle do
inspector false; nenhum install/open executado pelo roteiro.

Retorno `roi-inspect-1`, aapt2 `2.20-13193326`, hashes coincidentes antes/depois:

| Verificação | Evidência recebida e alcance |
|---|---|
| Identidade | Fonte45f7376 limpa; SHA591555a2… em todos os coletores |
| Manifesto | Pacote de avaliação com.ramonmenz.afericapturetest, minSDK24/targetSDK36, debuggable/cleartext true, networkSecurityConfig não declarado |
| Permissões selecionadas | CAMERA e INTERNET presentes; áudio, armazenamento externo e permissões de mídia consultadas ausentes. Não é enumeração universal de permissões/caminhos de rede. |
| Backup | allowBackup=false, duas referências conferidas; full-backup-content/cloud-backup/device-transfer com nove domínios excluídos pela raiz em cada seção |
| Assinaturas locais | apksigner0.9 verificou APK25990bb4… e APK591555a2…; certificados iguais. Certificados/caminhos privados não registrados. |
| Inspector | false em configuração/invocação; bytecode ainda não observado nesse retorno |
| Dispositivo | Instalado ainda não reconfirmado; nenhum comando de instalação/abertura/captura nesta fase |

Flags debug/cleartext/INTERNET são da demo Dev Client, não homologação clínica.
Regras empacotadas não comprovam comportamento universal de OEM/transferência,
nem ausência de persistência/rede/logs internos do SDK/SO. Assinatura igual entre
dois APKs locais não identifica o atualmente instalado. Nenhuma eficácia de OCR
ou correção de segmentos foi demonstrada pelo build/inspeção estática.

## Próxima consulta: somente leitura, vinculada ao novo candidato

Ferramentas fixadas em `a9373eb65d85c7e12369ef6a6207ccbddc49a80c`, branch
`fix/task-09-guards-roi591`, carregando #82 sem exigir merge intermediário.
Os snapshots anteriores e a fonte/APK de build permanecem preservados.

`Read-AferiRoi591Readiness.ps1` aceita somente BuildPath. Reconfere fonte45 limpa,
flag false e SHA591 antes de analisar e antes/depois de consultar o aparelho.
Identidades de candidato591/baseline259/pacote são constantes próprias; o
instalador histórico EDF→259 não é alterado ou tratado como genérico.

Usa somente apkanalyzer já instalado no SDK para duas consultas privadas ao APK:

- `okhttp3.OkHttpClient$Builder.build`: exige método completo reconhecido e forma
  esperada (new-instance do cliente, invoke-direct do construtor, return-object).
  Vazio, método truncado/duplicado, instruções inesperadas, falha de comando ou
  ferramenta ausente/ambígua permanecem pendentes. Interceptores Expo presentes
  no método retornam categoria própria. A falta de texto em uma saída inválida
  nunca é interpretada como ausência de injeção.
- `FrameTransform`: exige classe conhecida e campos estáticos REVISION=roi-1 e
  MAX_OWNED_PIXEL_BYTES=5760000 no formato reconhecido. Não comprova todo o fluxo
  nativo, chamadas runtime, heap total ou preservação física dos rótulos.

Essa inspeção dirigida testa o ponto que o plugin Expo instrumenta. Mesmo um
resultado favorável não significa ausência global de interceptores, DevTools,
telemetria, rede ou logs. O wrapper PowerShell mantém a saída do analisador em
RAM e não grava dumps nem reproduz texto bruto. Isso não audita caches internos
da ferramenta SDK. Não há download automático de ferramentas.

ADB usa helper de streams privados, USB `-d` e somente start-server/get-state,
getprop do modelo, pm path do pacote e run-as/sha256sum do base.apk. Exige
SM-S731B, uma única base, caminho válido e hash associado ao mesmo caminho.
Resultados são categorias/booleans/hashes; nenhum serial ou caminho é publicado.
Não há install, uninstall, clear, reverse, Metro, lançamento ou captura.
`AtualizacaoLiberada=false` permanece em todos os resultados.

## Windows — próximo comando

Roteiro inicial preservado. Após os retornos abaixo, usar a consulta revisada
na seção final; não recriar nem editar a worktree a9373eb já existente.

Demo fechada, Metro parado. Conectar somente o Samsung por USB para consulta,
sem abrir a demo. Executar na raiz da mesma cópia original do repositório:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    $repo = (git rev-parse --show-toplevel)
    if ($LASTEXITCODE -ne 0 -or -not $repo) { throw 'repo-unavailable' }
    $parent = Split-Path -Parent $repo
    $tools = Join-Path $parent 'aferi-task09-roi591-tools'
    $build = Join-Path $parent 'aferi-task09-roi-build'
    if (Test-Path -LiteralPath $tools) { throw 'roi591-tools-exist-preserve' }
    git -C $repo fetch origin fix/task-09-guards-roi591
    if ($LASTEXITCODE -ne 0) { throw 'roi591-fetch-failed' }
    git -C $repo worktree add --detach $tools a9373eb65d85c7e12369ef6a6207ccbddc49a80c
    if ($LASTEXITCODE -ne 0) { throw 'roi591-tools-failed' }
    $head = (git -C $tools rev-parse HEAD)
    if ($LASTEXITCODE -ne 0 -or $head -cne 'a9373eb65d85c7e12369ef6a6207ccbddc49a80c') { throw 'roi591-tools-head-unexpected' }
    $changes = @(git --no-optional-locks -C $tools status --porcelain --untracked-files=all)
    if ($LASTEXITCODE -ne 0 -or $changes.Count -ne 0) { throw 'roi591-tools-not-clean' }
    powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$tools\tools\task09\Read-AferiRoi591Readiness.ps1" -BuildPath $build
    if ($LASTEXITCODE -ne 0) { throw 'roi591-readiness-failed-stop' }
}
```

Devolver somente JSON `roi591-readiness-1` ou categoria sanitizada do impedimento.
Não compartilhar saídas de apkanalyzer/ADB, certificados, dumps, payloads ou
screenshots. Se analisador ausente/saída desconhecida, instalado diferente,
modelo inesperado, ADB indisponível/múltiplo, fonte/hash alterado ou qualquer
erro: parar para análise. Não instalar ferramentas/recompilar/atualizar por
tentativa. Desconectar após a consulta é suficiente; não abrir a aplicação.

## Verificações e pendências

Lint/TypeScript e 832 testes Jest em 71 suítes aprovados. Novo check PowerShell
cobre identidades, método completo/vazio/injetado/desconhecido, constantes,
privacidade, allowlist de ADB, modelo/splits/traversal/hash/caminho, descoberta do
analisador e ordem de bloqueio antes de ADB. Processo nativo fictício no Linux
confere argumentos literais, exit code e stderr privado. Não é apkanalyzer
Windows real, DEX do autor ou execução física; o CI adiciona esse mesmo check.

Etapa3 continua parcial aguardando o retorno desta consulta e análise dos gates
restantes. Atualização requer futura guarda específica, manifesto/versões,
assinatura e baseline instalado conferidos; nenhum instalador é fornecido aqui.
Abertura e experimento A/B são etapas posteriores, com bundle/revisões próprios.
Etapa1 física e TASK-04/06/07/09/18 continuam parciais; habilitação clínica bloqueada.

## Retornos e consulta revisada da classe OkHttp

Primeiro retorno: analisador indisponível nas duas consultas; SDK/modelo e hash
instalado259 conferidos. Após o autor disponibilizar Android SDK Command-line
Tools no SDK existente, FrameTransform confirmou roi-1/5760000 no APK591. Somente
a consulta OkHttp retornou `analisador-falhou`; fonte45/hash591 preservados,
instalado259 reconfirmado e nenhuma atualização/abertura/captura.

A chamada anterior usava `--method build`, sem evidência de compatibilidade desse
seletor com a CLI instalada. A revisão solicita somente a classe Builder inteira
e seleciona internamente o descritor exato do método. Não atribui definitivamente
a falha ao seletor: classe/argumentos/JVM e erros não classificados permanecem
possíveis. Não muda parser OCR, aplicativo, APK, JDK ou SDK. O reconhecimento
exige uma única classe conhecida e método completo; código de outros métodos
não é tratado como parte de build. Categorias fixas distinguem falhas conhecidas
da ferramenta sem expor mensagens privadas. Sem fallback silencioso ou retry.

Ferramentas revisadas: `e994fcab621adc53d579351603a20b104fba4911`. Lint,
TypeScript, 832 testes/71 suítes e check PowerShell aprovados. Regressão falhou
antes e passou após a correção. Processo fictício verifica classe literal sem
--method, seleção isolada, rejeição de outra classe e erros sanitizados; não é
apkanalyzer real no Windows. CI do novo head é registrado no PR #83.

Executar na raiz da mesma cópia original, demo fechada, Metro parado e somente
Samsung por USB. Nova pasta de ferramentas; fontes/APKs anteriores preservados:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    $repo = (git rev-parse --show-toplevel)
    if ($LASTEXITCODE -ne 0 -or -not $repo) { throw 'repo-unavailable' }
    $parent = Split-Path -Parent $repo
    $tools = Join-Path $parent 'aferi-task09-roi591-class-tools'
    $build = Join-Path $parent 'aferi-task09-roi-build'
    if (Test-Path -LiteralPath $tools) { throw 'roi591-class-tools-exist-preserve' }
    git -C $repo fetch origin fix/task-09-guards-roi591
    if ($LASTEXITCODE -ne 0) { throw 'roi591-fetch-failed' }
    git -C $repo worktree add --detach $tools e994fcab621adc53d579351603a20b104fba4911
    if ($LASTEXITCODE -ne 0) { throw 'roi591-class-tools-failed' }
    $head = (git -C $tools rev-parse HEAD)
    if ($LASTEXITCODE -ne 0 -or $head -cne 'e994fcab621adc53d579351603a20b104fba4911') { throw 'roi591-class-tools-head-unexpected' }
    $changes = @(git --no-optional-locks -C $tools status --porcelain --untracked-files=all)
    if ($LASTEXITCODE -ne 0 -or $changes.Count -ne 0) { throw 'roi591-class-tools-not-clean' }
    powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$tools\tools\task09\Read-AferiRoi591Readiness.ps1" -BuildPath $build
    if ($LASTEXITCODE -ne 0) { throw 'roi591-readiness-failed-stop' }
}
```

Retornar somente JSON ou categoria sanitizada. Erro, formato desconhecido,
fonte/hash/modelo/instalado divergente exige parada para análise; não interpretar
campo false como presença de injeção. Continua AtualizacaoLiberada=false em
todos os casos. Etapa3 parcial, nenhuma atualização ou validação clínica.
