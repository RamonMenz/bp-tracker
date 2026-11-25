# TASK-07 — backup/transferência e preparação após os merges

Registro em 24/11/2026. TASK-04/06/07/18 continuam parciais; habilitação clínica
bloqueada. Não houve novo ensaio de captura, instalação, merge ou deploy pelo Codex.

## Evidência recebida e base desta etapa

PRs #74 e #75 consultados como merged, respectivamente 4ef8d92 e 9612c64.
Staging consultado em 9612c643a4d56d29631c81cb62a588fc322a925d; CI do último head
#75 (9649065) aprovado. A worktree Windows C:\dev\aferi-task07-pos-merge foi
criada destacada nesse staging; autor devolveu HEAD esperado, status vazio e
pacote com.ramonmenz.afericapturetest/AllowBackupNaFonte=false.
Não equivale a prebuild, build, manifesto mesclado ou atualização do Samsung.
Cópias TalkBack/integração/privacidade e APK anterior devem ser preservados.

[M0a/M0b e limites anteriores](task-07-inspecao-privacidade-localidade.md#retorno-m0b--manifesto-do-apk-identificado-e-configuração-de-backup):
APK69d5a0b3… instalado tem allowBackup=true, sem regras nos atributos selecionados;
bundle86017456… conhecido. Nem o merge nem Metro alteram esse APK.

## Correção preparada só na demo

[Plugin de prebuild](../demos/android-capture/plugins/with-no-backup.js) registrado
no app.json da demo, sem alterar a configuração do produto ou dependências.
Exige pacote de avaliação e android.allowBackup=false; recusa outra configuração.
Configura application com allowBackup=false e referências a dois XML estáticos:

- fullBackupContent → aferi_capture_backup_rules: exclusões para regras legadas;
- dataExtractionRules → aferi_capture_data_extraction_rules: seções distintas de
  cloud-backup e device-transfer, ambas com exclusões.

Cada seção exclui path="." em root, file, database, sharedpref, external,
device_root, device_file, device_database e device_sharedpref. São domínios de
armazenamento CE/DE e externo privado documentados pelo Android; não há leitura
ou classificação de arquivos reais. Cache/no_backup seguem exclusões próprias do SO.

O mod de recursos escreve somente esses XML estáticos no projeto nativo gerado,
em app/src/main/res/xml. É uma operação de build, sem execução pelo produto e
sem acesso a mídia/resultados clínicos. Recusa recurso homônimo com conteúdo
inesperado antes de escrever; execuções repetidas com arquivos iguais são aceitas.
Não muda INTERNET, cleartext ou debug do Dev Client nem o motor de OCR/fluxo clínico.

Fontes consultadas nesta etapa: [Android Auto Backup](https://developer.android.com/identity/data/autobackup#EnablingAutoBackup),
[formato Android 12+](https://developer.android.com/identity/data/autobackup#xml-syntax-android-12)
e [transferência entre plataformas](https://developer.android.com/identity/data/autobackup#cross-platform).
allowBackup=false pode não impedir D2D em certos fabricantes; por isso não basta
omitir a seção device-transfer. As regras explícitas reduzem essa superfície,
sem garantir comportamento universal de OEM/serviços externos ou migrações.

A documentação atual também descreve cross-platform-transfer desde Android16
QPR2. A demo não configura associação com app iOS; não inventar bundleId/teamId
nem adicionar seção incompleta. Seu alcance no Samsung/API37 continua uma lacuna
antes de habilitar, não uma garantia implícita de exclusão. Esta entrega verifica
as regras legadas, cloud e D2D documentadas; não declara todo mecanismo de
transferência bloqueado. Não iniciar backup/restauração real para testar.

## Verificações e alcance

[Check de integração](../tools/task07/AferiBackupRules.check.cjs) executa os mods
reais do Expo com configuração real da demo e manifesto/árvore nativa sintéticos:
referências resolvidas em XML, exclusões dos nove domínios em três seções, ausência
de include, repetição, preservação de permissões/cleartext/debug e rejeição de
configuração divergente/recurso desconhecido. Fixtures estáticas temporárias do
host são descartadas. O check entra no job App do CI.

Lint e TypeScript da raiz aprovados; Jest com 742 testes/67 suítes aprovados.
Check de integração Expo aprovado. Ambos os XML estáticos compilaram com aapt2
Linux 2.19-12782657: verificação de sintaxe, não de política de backup em runtime. Nenhum desses checks constitui build completo, execução em Windows,
inspeção do Samsung ou evidência de ausência de dados no SDK/SO. Functions/rules
não alteradas; validação remota é registrada separadamente no PR.

## Próxima ação do autor — apenas versões do ambiente

A cópia pos-merge permanece fixada em 9612c64. Ainda não fazer prebuild/build ou
instalação nela: as regras adicionais desta etapa pertencem a outra branch.
No PowerShell, consultar somente versões; não consultar variáveis de ambiente
completas, caminhos pessoais, arquivos do aparelho ou logs de build:

```powershell
Set-Location -LiteralPath 'C:\dev\aferi-task07-pos-merge'
node --version
npm --version
java -version
```

Devolver somente as versões ou informar qual comando não foi encontrado. Se o
Java não estiver no PATH, não alterar JAVA_HOME por tentativa nem instalar outro
JDK: a existência do JBR do Android Studio pode ser verificada separadamente.
Este passo não exige telefone conectado e não modifica o app. Não pressionar a
no Metro para aplicar a correção: ela é nativa e depende de novo APK.

## Sequência para a próxima rodada, após preparar o build

1. Fixar commit desta nova branch em outra worktree de build limpa, preservando
   pos-merge e os APKs/fontes anteriores. Consultar staging remoto novamente.
2. Conferir Node/npm/JDK/SDK, espaço e dependências; fornecer comandos locais
   compatíveis com o Windows. Não copiar node_modules nem projeto android antigo.
3. Gerar Android apenas nessa worktree e compilar APK local sem instalação,
   com dispositivo desconectado se necessário. Separar geração/build da ação
   de instalar; não usar expo run:android como atalho que instala/abre o app.
4. Antes de instalar, analisar localmente manifesto final, identidade e recursos
   XML efetivamente empacotados. Esperado allowBackup=false e ambas referências;
   a presença da referência sozinha não valida o conteúdo da regra. Definir
   extrator de regras estáticas antes de solicitar saída sanitizada ao autor.
5. Só depois fornecer procedimento de atualização que preserve a evidência do
   APK anterior. Registrar novo hash e ambiente; não reutilizar resultados antigos
   como se fossem do binário novo. Não desinstalar/limpar dados por tentativa.
6. Selecionar ferramenta que observe somente pacote/UID, destinos/portas e
   contagens. Sem payloads/headers/URLs/HAR/PCAP/DNS bruto/logcat completo;
   ferramenta que coleta conteúdo e só o esconde na tela não serve. Sem ferramenta
   qualificada, marcar indisponível e manter habilitação bloqueada.
7. Planejar cenários necessários do novo APK: controle idle, abertura do preview,
   sucesso/cancelamento/background/reinício/negativa, offline e reconexão, com
   metadados e recursos. Configurações de rede só entre tentativas: background
   deve continuar cancelando. Distinguir Metro:8097/Dev Client de destinos externos,
   sem atribuir payload/produtor apenas por UID/destino ou coincidência temporal.

O roteiro físico detalhado depende de identidade do novo binário e capacidade
real da ferramenta de rede. Não pedir capturas extras enquanto essas condições
estiverem pendentes. Telemetria/ID persistente, conteúdo de deltas DataTransport,
contas/escritas e SDK/SO integral seguem as lacunas já registradas. Nem ausência
de tráfego numa janela nem ausência de arquivo em snapshot prova comportamento
universal ou permite concluir as quatro tarefas.

## Retorno de versões e verificação independente de prebuild

Autor informou Node v24.22.0, npm11.19.1 e Temurin OpenJDK17.0.21+9, build
2026-10-20, VM64-bit. Registro em 24/11/2026, sem hora de execução informada.
React Native0.86.0 instalado declara Node ^20.19.4 || ^22.13.0 || ^24.3.0 || >=25;
Node recebido está nessa faixa. Plugin Gradle RN usa jvmToolchain(17). Isso não
comprova que JAVA_HOME/Gradle selecionam o mesmo Java consultado no PATH.
Não trocar JDK ou atualizar dependências por tentativa.

Codex executou prebuild real da demo em cópia temporária isolada do commit
062e9b188c7af6cf9539b0ba1faed63dd26460e8, com dependências já disponíveis e
EXPO_NO_TELEMETRY=1/CI=1. Comando expo prebuild --platform android --no-install,
sem SDK/Gradle/telefone. Concluiu sem alterar package.json; aviso de expo-system-ui
para userInterfaceStyle não levou à instalação de dependência extra.
Manifesto fonte gerado: allowBackup=false, referências fullBackupContent e
dataExtractionRules corretas; ambos os recursos existem, com nove exclusões em
cada seção legada/cloud/D2D. Wrapper gerado usa Gradle9.3.1. Não é manifesto final
mesclado/empacotado, compilação APK ou execução no Samsung.

### Windows — preparação isolada e geração, sem instalar

Preservar pos-merge em9612c64 e outras worktrees. Usar outra pasta inexistente,
fixada no commit funcional062e9b1 do PR76; não requer merge do PR. O commit
continua referência de código mesmo se documentação posterior avançar a branch.
Não instalar nada no telefone; ele pode ficar desconectado durante a compilação.
Os comandos precisam de rede no PC para dependências de desenvolvimento;
isso não é ensaio de reconhecimento offline do aplicativo.

```powershell
Set-Location -LiteralPath 'C:\dev\aferi-task07-pos-merge'
git fetch origin fix/task-07-regras-backup
if ($LASTEXITCODE -ne 0) { throw 'fetch-backup-failed' }
$aferiBuild = 'C:\dev\aferi-task07-backup-build'
if (Test-Path -LiteralPath $aferiBuild) { throw 'build-destination-exists' }
git worktree add --detach $aferiBuild 062e9b188c7af6cf9539b0ba1faed63dd26460e8
if ($LASTEXITCODE -ne 0) { throw 'build-worktree-failed' }
Set-Location -LiteralPath $aferiBuild
git rev-parse HEAD
git status --short
npm ci --ignore-scripts --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'dependencies-failed' }
node .\tools\task07\AferiBackupRules.check.cjs
if ($LASTEXITCODE -ne 0) { throw 'backup-check-failed' }
Set-Location -LiteralPath .\demos\android-capture
$env:EXPO_NO_TELEMETRY = '1'
node ..\..\node_modules\expo\bin\cli prebuild --platform android --no-install
if ($LASTEXITCODE -ne 0) { throw 'prebuild-failed' }
```

Esperado: HEAD062e9b1/status vazio antes de instalar dependências, check aprovado,
prebuild concluído. Não executar npm install na demo, expo run:android,
prebuild --clean, adb install ou tarefas installDebug. Não copiar android/ ou
node_modules de outra worktree. Se falhar, parar nessa etapa; devolver só etapa,
código fixo e mensagem curta com caminhos/identificadores omitidos.

### Windows — compilar sem instalação

Na mesma sessão, apenas após preparação aprovada:

```powershell
$aferiSdkBuild = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (-not (Test-Path -LiteralPath $aferiSdkBuild -PathType Container)) {
    throw 'sdk-not-found'
}
$env:ANDROID_HOME = $aferiSdkBuild
Set-Location -LiteralPath (Join-Path $aferiBuild 'demos\android-capture\android')
.\gradlew.bat --version
if ($LASTEXITCODE -ne 0) { throw 'gradle-version-failed' }
.\gradlew.bat :app:assembleDebug --no-daemon --console=plain -PreactNativeArchitectures=arm64-v8a
if ($LASTEXITCODE -ne 0) { throw 'assemble-failed' }
$aferiApkBuild = Join-Path $aferiBuild 'demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path -LiteralPath $aferiApkBuild -PathType Leaf)) { throw 'apk-not-found' }
[pscustomobject]@{
    Fonte = (git -C $aferiBuild rev-parse HEAD)
    ApkExiste = $true
    Sha256Apk = (Get-FileHash -LiteralPath $aferiApkBuild -Algorithm SHA256).Hash.ToLowerInvariant()
} | ConvertTo-Json
git -C $aferiBuild status --short
```

Esperado Gradle9.3.1, Launcher JVM compatível Java17, assembleDebug concluído e
JSON com hash calculado, nunca um hash previsto. Builds podem baixar componentes
SDK/NDK/dependências; se houver licença/erro, informar impedimento e não atualizar
ferramentas/configuração por tentativa. Saída --version pode conter caminhos
locais: transcrever somente versão Gradle e Launcher JVM, sem copiar saída inteira.
Devolver também resumo prebuild/build, JSON e status, sem APK ou log completo.
Se falhar, não executar linhas seguintes nem enviar stacktrace inteiro.

Parar depois do build. Manifesto mesclado, recursos XML empacotados e assinatura
precisam de análise local selecionada antes de atualizar o app. Não rodar Metro
desta nova cópia nem pressionar a para instalar/abrir. APK anterior não foi
substituído e não há nova evidência funcional de captura/privacidade.

## Retorno do build Windows — APK gerado, ainda não inspecionado

Autor devolveu prebuild e build concluídos, sem aviso/impedimento percebido.
Data/hora efetivas da execução não informadas. Gradle9.3.1; Launcher JVM17.0.21
(Eclipse Adoptium17.0.21+9), portanto a seleção efetiva reportada pelo wrapper
corresponde à versão17 previamente consultada. Fonte:
062e9b188c7af6cf9539b0ba1faed63dd26460e8. ApkExiste=true; SHA-256:
**edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed**.

Status vazio no bloco1. No bloco3, somente Refresh index:100%(448/448),done.,
sem linhas de alterações depois: progresso de atualização do índice, não uma
alteração listada. Status relatado limpo em ambos os pontos. O número448 não é
inventário de arquivos clínicos nem prova de conteúdo do APK.

Esse retorno comprova geração relatada de um artefato com identidade nova; não
comprova manifesto/recursos finais, assinatura, instalação, captura ou privacidade.
O Codex não recebeu/executou o APK. Ainda não instalar, iniciar Metro desta cópia,
pressionar a, limpar dados ou repetir capturas. O APK anterior continua referência;
nenhuma consulta atual ao instalado foi solicitada para este passo.

### Próximo retorno: manifesto selecionado do novo APK

Usar o extrator manifesto-1 que já existe no commit062e9b1, sem atualizar a
worktree de build ou reinstalar dependências. Aapt2 SDK36 já localizado; o módulo
confere o hash esperado antes da leitura e devolve somente metadados selecionados.
Não envolve ADB nem requer telefone conectado:

```powershell
Set-Location -LiteralPath 'C:\dev\aferi-task07-backup-build'
Import-Module .\tools\task07\AferiManifestMetadata.psm1 -Force -ErrorAction Stop
$aferiAapt2Build = Join-Path $env:LOCALAPPDATA 'Android\Sdk\build-tools\36.0.0\aapt2.exe'
$aferiApkNovo = Join-Path (Get-Location).Path 'demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk'
Get-AferiManifestMetadata -Aapt2Path $aferiAapt2Build -ApkPath $aferiApkNovo -ExpectedSha256 'edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed' | ConvertTo-Json -Depth 8
```

Devolver só JSON ou código fixo/impedimento. Esperado pacote de avaliação,
allowBackup=false, fullBackupContent/dataExtractionRules referencia-presente;
debuggable/cleartext podem continuar true no Dev Client. Qualquer divergência
requer análise, sem alterar/recompilar por tentativa. Não imprimir árvore inteira.

A presença da referência não prova que a regra aponta para o recurso esperado
ou que o XML contém todas as exclusões; análise local selecionada dos recursos
empacotados e sua vinculação é o passo seguinte, antes de instalação. Não pedir
que o autor envie XML binário/árvore bruta/APK ou use dump completo como atalho.
Telemetria/ID/UID/destinos/OEM/cross-platform e gate permanecem pendentes.

## Retorno do manifesto do novo APK e próximo extrator

Autor devolveu manifesto-1/aapt2 **2.20-13193326**, hash
**edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed** igual ao build.
Pacote de avaliação, min24/target36; allowBackup=false,
fullBackupContent/dataExtractionRules referencia-presente; cleartext/debuggable
true e networkSecurityConfig nao-declarado. CAMERA/INTERNET uses-permission,
sem maxSdk; sete permissões selecionadas de áudio/storage/mídia não declaradas.
Data/hora efetivas da execução não informadas. Evidência de manifesto estático
do novo artefato, sem evidência de instalação ou comportamento no Samsung.
Não comprova conteúdo/vinculação das regras por si só ou ausência de escrita/rede.

**Extrator backup-1 preparado:** novo Get-AferiBackupMetadata no mesmo módulo
[AferiManifestMetadata.psm1](../tools/task07/AferiManifestMetadata.psm1), sem alterar
saída de manifesto-1. Usa os mesmos guards de pacote/hash/processo sem shell.
Releitura privada do manifesto obtém os dois IDs distintos apenas de atributos
diretos de application. aapt2 dump resources é retido em memória: verifica os IDs
contra nomes fixos e um único recurso XML sem qualificador para cada regra.
Lê via aapt2 somente os dois caminhos fixos res/xml/aferi_capture_*rules.xml,
sem extrair o APK ou criar relatório/arquivo intermediário no Windows.

O parser exige estrutura conhecida: full-backup-content legado; cloud-backup e
device-transfer no moderno; nove exclude path="." nos domínios fixos em cada
seção. Rejeita include, domínio/path desconhecido, duplicata, atributo adicional,
seção desconhecida, regra ausente, referência divergente, arquivo alternativo,
variante por configuração ou formato não suportado. Não tenta adivinhar política
se houver divergência. Reconfere hash ao final para recusar mudança do APK.

A saída contém apenas Tool backup-1, versão aapt2, hash/pacote/AllowBackup,
ReferenciasConferidas e seção/contagem/SomenteExclusoesRaiz. Não devolve árvore,
IDs/tabela de recursos, caminhos privados, valores não permitidos ou stderr.
Erro fixo exige análise, sem enviar dump completo ou recompilar por tentativa.
A tabela completa de recursos é metadado estático do APK de avaliação e fica
privada em memória; isso não é inventário/leitura dos arquivos runtime do telefone.

Verificação: novo check PowerShell no CI com árvore/tabela/fronteira nativa
simuladas cobre vínculos, estrutura, exclusões, erros privados e alteração de hash
durante análise. Integração real independente passou com aapt2 oficial Linux
2.19-12782657 e APK sintético sem código: recursos estáticos compilados/vinculados,
manifesto binário sintético apontando para IDs correspondentes. Não recebeu APK
do autor; não confundir hash sintético com edf860b7…. Windows/aapt2 do autor
continua dependente do próximo retorno; nenhum teste de backup real foi executado.

### Como executar sem alterar a fonte avaliada

Preservar C:\dev\aferi-task07-backup-build em062e9b1 e seu APK. Criar outra
worktree de ferramentas, C:\dev\aferi-task07-backup-tools, no commit publicado
com este extrator; consultar sua identidade antes de importar. Se o destino já
existir, parar e preservar. Não mover HEAD da worktree de build, instalar npm ou
recompilar para obter o extrator. Importar o módulo da nova worktree e apontar
para o APK existente na worktree de build:

```powershell
Import-Module .\tools\task07\AferiManifestMetadata.psm1 -Force -ErrorAction Stop
$aferiAapt2Regras = Join-Path $env:LOCALAPPDATA 'Android\Sdk\build-tools\36.0.0\aapt2.exe'
$aferiApkRegras = 'C:\dev\aferi-task07-backup-build\demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk'
Get-AferiBackupMetadata -Aapt2Path $aferiAapt2Regras -ApkPath $aferiApkRegras -ExpectedSha256 'edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed' | ConvertTo-Json -Depth 6
```

Esperado ReferenciasConferidas=true e três seções com DominiosExcluidos=9 e
SomenteExclusoesRaiz=true. Devolver apenas JSON ou código fixo/impedimento,
sem APK/árvore/log completo. Não requer dispositivo conectado.

Resultado positivo confirma essas regras estáticas no binário identificado;
não garante obediência universal do SO/OEM/serviços de migração e não resolve
cross-platform/telemetria/ID/UID/destinos. Assinatura e plano de preservação antes
da atualização ainda devem ser conferidos. Nenhuma instalação/captura nova
solicitada nesta etapa, nenhuma das quatro tarefas concluída ou habilitação.

## Retorno backup-1 — referências e exclusões empacotadas conferidas

Autor executou a ferramenta na worktree backup-tools limpa em
5e2ca59c5db827bccebc58d2ea71f5f83aa8b77a. Data/hora efetivas não informadas.
Tool backup-1, aapt2 Windows2.20-13193326, APK
edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed,
pacote de avaliação, AllowBackup=false, ReferenciasConferidas=true.
full-backup-content/cloud-backup/device-transfer: cada seção devolveu
DominiosExcluidos=9 e SomenteExclusoesRaiz=true.

Isso fecha o cruzamento estático dos IDs diretos de application com tabela e
recursos padrão esperados, além da estrutura/exclusões desses XML no artefato.
Não é inspeção de transferência/backup real, prova universal de obediência por
OEM/SO, ausência de outras migrações, telemetria ou privacidade integral. Não
houve nova captura/instalação solicitada. CI do extrator no commit5e2ca59 aprovado:
https://github.com/RamonMenz/bp-tracker/actions/runs/45518120354 .

### Próximo passo — assinaturas dos dois APKs locais, sem instalar

Comparar artefatos locais preservados, não extrair APK do telefone. O anterior
69d5a0b3… foi vinculado ao instalado em M0a; essa é evidência histórica. Antes de
uma futura atualização será preciso reconfirmar o instalado, pois a comparação
local sozinha não prova seu estado atual. O novo é edf860b7… da fonte062e9b1.

Usar apksigner.bat existente no SDK36, apenas version/verify --print-certs.
Saída completa, inclusive nomes de certificado e hashes de chave, permanece em
variáveis privadas; reportar só versão/identidades dos arquivos/verificação e
igualdade dos certificados. Não imprimir $raw, $certificates, $aferiAnterior ou
$aferiNovo. Não acessar keystore, senha, chave privada ou gerar certificado.
O script confere hashes antes/depois de cada análise e recusa alteração,
assinatura inválida, quantidade/formato de signatário inesperados ou indisponibilidade.
Caminhos com metacaracteres de batch são recusados; não contornar a restrição.
Não confundir assinatura válida com privacidade ou integridade do comportamento.

Atualizar somente a worktree de ferramentas limpa ao commit publicado com
[Compare-AferiApkSignatures.ps1](../tools/task07/Compare-AferiApkSignatures.ps1),
sem mover HEAD da pasta de build. Se houver alterações locais, parar e preservar.
O script mantém as variáveis em seu escopo; não executá-lo com dot-sourcing.
Se qualquer throw aparecer, parar. Devolver só JSON final ou código fixo/impedimento. Não requer
telefone conectado, novo build, atualização de ferramentas ou mudança de HEAD.

```powershell
& .\tools\task07\Compare-AferiApkSignatures.ps1
```

Esperado AssinaturasVerificadas=true. CertificadosIguais ainda é desconhecido;
não pressupor true nem trocar a assinatura para forçar atualização. Se false,
não desinstalar/limpar dados, não reassinar e não usar flags de bypass. Analisar
opções de avaliação separada que preservem o pacote e a evidência existentes.

Mesmo se true, a atualização pode ter outros impedimentos; esta etapa não a
executa nem atesta compatibilidade integral. Reconfirmar alvo/hash instalado,
identidade do novo APK e estado/câmera antes de orientar eventual adb install -r.
Não iniciar backup/restauração para preservar evidência e não copiar dados
privados do pacote. O arquivo local anterior e documentos já são referência de
binário; não prometer restauração universal dos dados caso seja preciso voltar.

Qualificação da ferramenta UID/destino continua pendente. Não repetir capturas
nem alegar zero tráfego para compensar essa lacuna. Habilitação clínica e as
TASK-04/06/07/18 permanecem bloqueada/parciais nos alcances já registrados.


Verificação do protocolo de assinatura no host: sintaxe e helper testados com
apksigner simulado, hashes de fixture, resposta contendo nome/chave privados,
erro nativo, formato inválido, múltiplos signatários, alteração do arquivo durante
análise e metacaracteres de batch. O check integra o CI. Não há apksigner real
executado no host nem resultado de assinatura dos APKs do autor nesta entrega;
versão/disponibilidade/verificação reais dependem do retorno Windows.

## Retorno assinatura-1 — comparação dos APKs locais aprovada

Autor executou na worktree backup-tools limpa em
fd658734c79adf7659bcf2f9adeba0872e6b8170. Tool assinatura-1, apksigner0.9;
SHA anterior69d5a0b31023a9b3647b0036cc2eb3af0683be19a02782a2b8e834635849e09c,
novoedf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed;
AssinaturasVerificadas=true e CertificadosIguais=true. Data/hora efetivas não
informadas. Sem certificado/nome/chave brutos, APK ou logs completos recebidos.

Confirma a verificação criptográfica reportada dos dois artefatos locais e a
igualdade do digest de certificado analisado. Resolve essa condição de assinatura;
não prova identidade atual do instalado, aceitação de atualização pelo Android,
preservação universal de estado ou privacidade. CI do commitfd65873 aprovado:
https://github.com/RamonMenz/bp-tracker/actions/runs/45519293204 .

### Próximo passo — identidade instalada, somente leitura

Conectar Samsung por USB e aceitar depuração se necessário; não pressionar a,
iniciar outra demo/Metro, instalar APK, limpar dados ou abrir captura. Se a demo
já estiver aberta, manter idle/cancelled e câmera desligada; se estiver fechada,
não precisa abri-la para consultar. Devolver o estado conhecido da demo/câmera
junto do JSON, sem screenshot. Não entrar em configurações durante tentativa.

Bloco usa -d, exige modelo SM-S731B e um único base.apk do pacote de avaliação.
Caminho de pm path fica privado, com whitelist de caracteres e sem travessia;
run-as/sha256sum lê só esse APK instalado, sem pull, root/chmod ou dados runtime.
Não é inventário dos arquivos clínicos. Estado diferente, mais de um aparelho,
splits, pacote ausente, permissão/erro ou formato desconhecido interrompem com
código fixo. Modelo igual não é identidade única do aparelho; o autor deve manter
somente o Samsung de avaliação conectado. Não consultar serial/identificadores.

```powershell
$aferiAdb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
try { $aferiEstado = @(& $aferiAdb -d get-state 2>&1); $aferiEstadoCode = $LASTEXITCODE }
catch { throw 'device-state-unavailable' }
if ($aferiEstadoCode -ne 0 -or $aferiEstado.Count -ne 1 -or $aferiEstado[0].ToString().Trim() -cne 'device') {
    throw 'device-state-unexpected'
}
try { $aferiModelo = @(& $aferiAdb -d shell getprop ro.product.model 2>&1); $aferiModeloCode = $LASTEXITCODE }
catch { throw 'device-model-unavailable' }
if ($aferiModeloCode -ne 0 -or $aferiModelo.Count -ne 1 -or $aferiModelo[0].ToString().Trim() -cne 'SM-S731B') {
    throw 'device-model-unexpected'
}
try { $aferiInstPaths = @(& $aferiAdb -d shell pm path com.ramonmenz.afericapturetest 2>&1); $aferiPathsCode = $LASTEXITCODE }
catch { throw 'installed-path-unavailable' }
if ($aferiPathsCode -ne 0 -or $aferiInstPaths.Count -ne 1 -or
    $aferiInstPaths[0] -isnot [string] -or
    $aferiInstPaths[0].Trim() -notmatch '^package:(/data/app/[A-Za-z0-9_./=+~\-]+/base\.apk)$') {
    throw 'installed-apk-set-unexpected'
}
$aferiInstBase = $Matches[1]
if ($aferiInstBase -match '/\.\./') { throw 'installed-path-unexpected' }
try {
    $aferiInstHashRaw = @(& $aferiAdb -d shell run-as com.ramonmenz.afericapturetest sha256sum $aferiInstBase 2>&1)
    $aferiInstHashCode = $LASTEXITCODE
} catch { throw 'installed-hash-unavailable' }
if ($aferiInstHashCode -ne 0 -or $aferiInstHashRaw.Count -ne 1 -or
    $aferiInstHashRaw[0] -isnot [string] -or
    $aferiInstHashRaw[0] -notmatch '^([0-9a-fA-F]{64})\s') {
    throw 'installed-hash-unavailable'
}
$aferiInstHash = $Matches[1].ToLowerInvariant()
[pscustomobject]@{
    Tool = 'identidade-instalada-1'
    Modelo = 'SM-S731B'
    Pacote = 'com.ramonmenz.afericapturetest'
    EntradasApkInstaladas = 1
    Sha256BaseInstalado = $aferiInstHash
    CoincideComAnterior = ($aferiInstHash -ceq '69d5a0b31023a9b3647b0036cc2eb3af0683be19a02782a2b8e834635849e09c')
    CoincideComNovo = ($aferiInstHash -ceq 'edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed')
} | ConvertTo-Json
```

Esperado ainda CoincideComAnterior=true/CoincideComNovo=false, mas não presumir:
nenhum hash instalado atual foi recebido neste passo. Se diferente, parar e
investigar sem reinstalar para obter igualdade. Devolver só JSON/código fixo e
estado conhecido da demo/câmera; nunca variáveis intermediárias ou caminho instalado.
Telefone não é alterado por esse bloco. A consulta não congela processos nem
atesta arquivo/estado/versão depois de sua execução.

Após a reconferência, preparar atualização de avaliação separada da abertura e
de novos ensaios, preservando os dois APKs locais e fontes já fixadas. Não usar
uninstall, pm clear, downgrade, troca de assinatura ou permissões de bypass.
Eventual install -r será orientado separadamente após conferir as identidades;
não foi executado nesta etapa. Não implica deploy ou habilitação clínica; observação segura de
UID/destinos, telemetria/ID e demais critérios continuam pendentes.


Consulta de identidade verificada no host com nove fixtures PowerShell:
anterior/novo/outro hash, modelo diferente, splits, travessia, injeção no path,
erro nativo e hash malformado. Alvo USB/pacote/comandos fixos e ausência de paths
na saída conferidos. Sem ADB/dispositivo real; o retorno do Samsung continua
pendente, não inferido pelos testes.
