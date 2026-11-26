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

## Retorno favorável e atualização restrita preparada

Autor retornou `metodo-build-sem-injecao-expo`, BytecodeInspecionado=true e
InjecaoExpoAusenteNoMetodo=true, no escopo exato declarado. FrameTransform roi-1
e limite5760000 confirmados; fonte45/hash591 preservados, instalado259/modelo
reconfirmados. Nenhuma instalação/abertura/captura ocorreu nessa consulta.
Esse resultado não comprova ausência global de interceptores/telemetria/logs,
comportamento runtime de CameraX/ML Kit ou correção dos segmentos.

Ferramentas de atualização fixadas em `0dbfe42c98db528c30a6e91aeb56abc202197868`.
`Update-AferiRoi591Evaluation.ps1` tem fase padrão Inspect e Install explícita.
Antes de ADB, reconfere fonte limpa/flag false, hashes exatos dos dois APKs,
manifesto/backup selecionados, versionName0.1.0 e versionCode não inferior ao
baseline local, assinaturas válidas/iguais e bytecode/constantes. Não supõe
versionCode ainda não devolvido: lê ambos por aapt2 e bloqueia formato inesperado.
Antes da mutação, exige SM-S731B/base única com259 ou591, reconfirma hashes/fonte
e dispositivo inalterado. Somente `install -r` do591 se ainda instalado259;
se já591, não reinstala. Reconfere hash591 depois. Falha nunca dispara retry,
clear, uninstall, downgrade, abertura, reverse ou captura. Recuperação por Inspect.
Isso preserva a estratégia de atualização, não prova todo estado SDK/SO preservado.

Checks locais: lint/TypeScript, 832 testes/71 suítes e check PowerShell novo
aprovados. Fixtures cobrem parsing de versão, chamada privada de badging,
identidades/manifesto/permissões/backup/assinaturas/bytecode, downgrade, ADB e
mudança de baseline/hash, Inspect sem mutação, install único, no-op591, saída
ambígua/erro e hash posterior divergente. Não são instalação real no Windows ou
Samsung. CI do novo head será registrado no PR83. Instalador histórico preservado.

### Windows: preparar ferramentas e inspecionar antes da instalação

Executar na raiz da mesma cópia original, demo fechada/Metro parado, somente
Samsung por USB. Caminho do APK259 é digitado localmente, sem publicar:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    $repo = (git rev-parse --show-toplevel)
    if ($LASTEXITCODE -ne 0 -or -not $repo) { throw 'repo-unavailable' }
    $parent = Split-Path -Parent $repo
    $tools = Join-Path $parent 'aferi-task09-roi591-update-tools'
    $build = Join-Path $parent 'aferi-task09-roi-build'
    if (Test-Path -LiteralPath $tools) { throw 'roi591-update-tools-exist-preserve' }
    git -C $repo fetch origin fix/task-09-guards-roi591
    if ($LASTEXITCODE -ne 0) { throw 'roi591-fetch-failed' }
    git -C $repo worktree add --detach $tools 0dbfe42c98db528c30a6e91aeb56abc202197868
    if ($LASTEXITCODE -ne 0) { throw 'roi591-update-tools-failed' }
    $oldApk = Read-Host 'Caminho completo do APK259 preservado, sem aspas'
    powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$tools\tools\task09\Update-AferiRoi591Evaluation.ps1" -BuildPath $build -PreviousApkPath $oldApk -Phase Inspect
    if ($LASTEXITCODE -ne 0) { throw 'roi591-inspect-failed-stop' }
}
```

Esperado: JSON roi591-update-1, Fase=Inspect,
AtualizacaoDeAvaliacaoPermitida=true, instalado259 (ou já591), versões numéricas
sem downgrade, InstalacaoExecutada=false e HabilitacaoClinica=false.
Se erro ou permissão false, parar e retornar somente JSON/categoria; não executar
o próximo bloco. A assinatura fornecida deve ser do arquivo259 cujo hash é
conferido pelo script; não enviar certificado/caminho privado.

### Windows: instalação em fase separada

Só após Inspect favorável, executar este bloco em outro PowerShell aberto na
raiz da mesma cópia original. Ele repete as guardas no momento da atualização:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    $repo = (git rev-parse --show-toplevel)
    if ($LASTEXITCODE -ne 0 -or -not $repo) { throw 'repo-unavailable' }
    $parent = Split-Path -Parent $repo
    $tools = Join-Path $parent 'aferi-task09-roi591-update-tools'
    $build = Join-Path $parent 'aferi-task09-roi-build'
    $head = (git -C $tools rev-parse HEAD)
    if ($LASTEXITCODE -ne 0 -or $head -cne '0dbfe42c98db528c30a6e91aeb56abc202197868') { throw 'roi591-update-tools-head-unexpected' }
    $changes = @(git --no-optional-locks -C $tools status --porcelain --untracked-files=all)
    if ($LASTEXITCODE -ne 0 -or $changes.Count -ne 0) { throw 'roi591-update-tools-not-clean' }
    $oldApk = Read-Host 'Caminho completo do APK259 preservado, sem aspas'
    powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$tools\tools\task09\Update-AferiRoi591Evaluation.ps1" -BuildPath $build -PreviousApkPath $oldApk -Phase Install
    if ($LASTEXITCODE -ne 0) { throw 'roi591-install-failed-use-inspect-stop' }
}
```

Esperado: JSON Fase=Install, InstalacaoExecutada=true (false se já591),
CoincideComCandidato=true e hash591 em InstaladoDepois; abertura/captura/clinical
false. Devolver os dois JSONs, sem saídas brutas, certificados, dumps ou caminhos.
Se instalação falhar/for interrompida, preservar tudo e não repetir Install;
reconsultar por Inspect antes de qualquer recuperação. Não abrir a demo após
instalar: Metro/bundle/revisões e avaliação offline são fases posteriores.
Etapa3 continua parcial nesta entrega; nenhuma execução física da atualização
é alegada. TASK-04/06/07/09/18 e habilitação clínica continuam pendentes.

## Instalação confirmada pelo autor; abertura sem captura

Recebidos os JSONs Inspect/Install: versionCode1→1 e versionName0.1.0; inspeção
sem mutação sobre259, instalação executada e hash posterior exatamente591.
Estado ADB/modelo conferidos. Scripts não solicitaram abertura/captura e mantêm
habilitação clínica false. Isso não observa a tela nem garante que o SO não
inicialize componentes. Não inferir conformidade global SDK/SO ou eficácia OCR.

Fonte do Metro permanece45f7376; bundle2191/fontea649 e ferramentas antigas
fixadas em259 não servem para esta abertura. Ferramentas Metro agora fixadas em
`e3d480cc43127497dfde1673ec1c174ba69ecd24`, numa worktree nova
`aferi-task09-roi591-metro-tools`. Nenhum rebuild/reinstall é necessário.

Terminal A: iniciar da raiz da cópia original. Criar essa worktree pelo commit
fixado após fetch de fix/task-09-guards-roi591, preservando pastas existentes.
Verificar fonte45 limpa e hash591 no build; recusar porta8097 já ocupada, sem
matar processos ou aceitar porta alternativa. Iniciar Metro dentro da demo:

```powershell
node --dns-result-order=ipv4first ..\..\node_modules\expo\bin\cli start --dev-client --localhost --port 8097
```

ANDROID_HOME do SDK existente e EXPO_NO_TELEMETRY=1 somente nesse terminal.
Manter aberto e ainda não pressionar a. Terminal B: executar das ferramentas
fixadas, passando o caminho da worktree de build45:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$tools\tools\task09\Prepare-AferiRoi591Metro.ps1" -BuildPath $build
```

Preparo vincula /status de loopback8097 ao caminho real da demo (header raiz
esperada e packager-status:running). Não lê corpo de outro servidor. Reconfere
fonte/hash local e instalado591/SM-S731B, valida formato/conflitos de reverse,
configura somente tcp8097→tcp8097 se ausente, preserva outras linhas e reconfere.
Saída roi591-metro-1 só tem hashes/booleans/contagens; sem serial, caminho ou
conteúdo bruto. Não instala, abre ou captura. Testes de guards/HTTP/ADB simulados
aprovados, além de lint/TypeScript/832 testes em71 suítes. Não é conexão física.

Só depois de FonteEsperada/MetroPronto=true, Reverse8097Conhecido=1 e instalado591,
no Terminal A pressionar a uma vez. Se pedir instalação/build/Expo Go/login,
seleção de outro projeto ou houver erro, parar. Só Samsung conectado, sem
emuladores. Se carregar sozinho, não repetir abertura. Verificar header captura5,
conteúdo montado, App active/Fase idle, botão de comparação disponível e ausência
percebida de preview/revisão anterior/indicador de câmera. Nativo nao-carregado
é esperado antes de carregar o binding; não iniciar câmera para mudar isso.
Fast Refresh desligado no menu de desenvolvimento, depois fechar o menu.

Retorno: JSON de preparo e somente categorias visuais acima, sem screenshots,
URLs, valores ou logs completos. Não iniciar câmera, capturar, reconhecer ou
confirmar. Identificação do bundle, preparo offline e experimento controlado
serão fases posteriores. Etapa3/aceites físicos continuam parciais; nenhuma
leitura foi validada, TASK-04/06/07/09/18 abertas, habilitação clínica bloqueada.

## Abertura recebida e identificação do bundle/preparo offline

Autor devolveu roi591-metro-1: fonte45, instalado591, fonte esperada/Metro pronto,
reverse8097=1 e outras linhas=0; preparo sem install/open/capture. Confirmou todas
as categorias visuais do roteiro: header/conteúdo, active/idle, comparação
disponível, ausência percebida de preview/revisão/indicador e Fast Refresh off.
Isso não é teste de câmera, OCR, consumo, tráfego ou privacidade universal.

Próxima ferramenta fixada em `1eac9017182fbf9e1993eb5028dfaec50a501472`, em pasta
nova `aferi-task09-roi591-offline-tools`: Prepare-AferiRoi591Offline.ps1 -BuildPath
da worktree45. Metro deve continuar aberto nessa chamada. Reconfere fonte/hash,
header/status do Metro e instalado591, lê somente SHA do arquivo estático de
bundle Dev Client, exige apenas reverse8097 e remove somente esse mapeamento.
Outras linhas/conflito causam parada ANTES da remoção. Depois exige lista vazia,
mesmo bundle e instalado591. Nenhum inventário/idle30s repetido, leitura de
conteúdo, relatório persistente, instalação, abertura ou captura. O hash identifica
o arquivo consultado, não todo código executado em RAM ou ausência de telemetria.

Após JSON favorável roi591-offline-1, parar Metro por Ctrl+C. No telefone, modo
avião, Wi-Fi/Bluetooth/dados móveis desligados, VPN e todas as ancoragens
(inclusive USB) desativadas. Voltar à demo sem reload/reabrir processo/iniciar
câmera. Mudança de configurações pode gerar background/cancelamento: active com
fase cancelled é compatível com o cancelamento previsto, não exige nova captura.
Sem preview/revisão antiga/indicador de câmera; informar qualquer erro em categoria.
Não alegar redes desligadas apenas por reverse=0: o JSON mantém
RedesDoTelefoneVerificadas=false e OfflineComprovado=false. As verificações
manuais devem ser declaradas separadamente, sem prints ou configurações pessoais.

Retornar JSON (hash real novo, sem supor igualdade/diferença de2191), Metro parado,
categorias manuais de rede/estado/erro. Falha ou divergência: parar para análise,
preservar tudo e não restaurar mapeamentos/redes automaticamente. Nenhum A/B ou
LCD nesta ação. Captura permanece etapa posterior com protocolo próprio.
Lint/TypeScript, 832 testes/71 suítes e check offline com ADB/HTTP simulados
aprovados; novo CI registrado no PR. Mocks não são desconexão física ou teste SDK.
