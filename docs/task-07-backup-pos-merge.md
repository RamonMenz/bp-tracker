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

## Identidade instalada reconfirmada e atualização de avaliação preparada

Retorno identidade-instalada-1: SM-S731B, pacote de avaliação, uma base APK,
hash69d5a0b31023a9b3647b0036cc2eb3af0683be19a02782a2b8e834635849e09c;
CoincideComAnterior=true/CoincideComNovo=false. Autor esclareceu app fechado no
celular e sem aplicação rodando no terminal. Registrar fase não observada/app
fechado; não inferir indicador de câmera ou ausência de processos/serviços apenas
desse relato. Não foi solicitada abertura para observar fase. Data/hora efetivas
não informadas. Resultado estático atual se soma às assinaturas iguais e recursos
conferidos; não prova privacidade em execução ou zero tráfego.

Próximo passo orientado: atualização somente do pacote de avaliação com o APK
localedf860b7…, mantendo APK69d5a0b3…/fontes anteriores intactos. -r solicita
substituição preservando dados do pacote; não promete restauração universal,
ausência de migração ou integridade de todo estado interno SDK/SO. Não executar
backup/restauração de dados privados para esse fim. Nenhuma alteração no produto
clínico, deploy, merge ou habilitação decorre dessa instalação de avaliação.

Conectar somente o Samsung de avaliação por USB, desbloqueado. Manter a demo
fechada e Metro parado. Não pressionar a. O bloco confere hash local, alvo -d e
modelo; instala sem abrir e consulta hash da base instalada. Executar como um
bloco completo & { ... }: throw interrompe a sequência antes de novas ações.
Os caminhos/saídas intermediárias ficam privados em escopo local. Não reexecutar
por tentativa se falhar: erro posterior ao install pode ocorrer mesmo com APK
já atualizado. Não desinstalar, limpar dados, trocar assinatura ou usar -d/-g/-t
como flags de instalação para contornar impedimento. O -d antes de install é
seleção USB; não é a flag de downgrade, que não está presente após install.

```powershell
& {
$ErrorActionPreference = 'Stop'
$aferiApkAtualizacao = 'C:\dev\aferi-task07-backup-build\demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk'
try { $aferiHashLocalAtualizacao = (Get-FileHash -LiteralPath $aferiApkAtualizacao -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant() }
catch { throw 'update-apk-unavailable' }
if ($aferiHashLocalAtualizacao -cne 'edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed') {
    throw 'update-apk-changed'
}
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
try {
    $aferiInstallRaw = @(& $aferiAdb -d install -r $aferiApkAtualizacao 2>&1)
    $aferiInstallCode = $LASTEXITCODE
} catch { throw 'update-command-unavailable' }
if ($aferiInstallCode -ne 0 -or @($aferiInstallRaw | Where-Object { $_.ToString().Trim() -ceq 'Success' }).Count -ne 1) {
    throw 'update-not-confirmed-stop'
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
    Tool = 'atualizacao-avaliacao-1'
    InstalacaoRetornouSucesso = $true
    Modelo = 'SM-S731B'
    Pacote = 'com.ramonmenz.afericapturetest'
    EntradasApkInstaladas = 1
    Sha256BaseInstalado = $aferiInstHash
    CoincideComAnterior = ($aferiInstHash -ceq '69d5a0b31023a9b3647b0036cc2eb3af0683be19a02782a2b8e834635849e09c')
    CoincideComNovo = ($aferiInstHash -ceq 'edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed')
} | ConvertTo-Json
}
```

Esperado InstalacaoRetornouSucesso=true, uma base com hashedf860b7…,
CoincideComNovo=true/CoincideComAnterior=false. Devolver somente JSON ou código
fixo/impedimento e se o app permaneceu fechado, eventual diálogo/comportamento
inesperado e indicador de câmera observado. Se não observado, dizer não observado;
não abrir câmera/dados clínicos para completar campos. Não enviar logs, serial,
path instalado ou screenshot. Se houver erro, parar; não pedir logs completos.

O comando não inicia Activity/Metro/captura. Android/SDK podem executar eventos
próprios de atualização; sem ferramenta qualificada, tráfego desse intervalo não
é medido. Se surgir abertura automática, registrar e não iniciar captura. Se o
SO bloquear a instalação, informar mensagem curta sanitizada; não desativar
proteções por tentativa. O APK é artefato estático de desenvolvimento: sua
transferência/instalação não é arquivo intermediário de imagem capturada.

Após o retorno, identificar o instalado e planejar separadamente abertura com
Metro da fonte062e9b1, sem misturar bundle antigo de cache com código novo.
Não usar resultados antigos como se tivessem sido executados nesse APK/SO.
Os próximos ensaios continuarão sintéticos e dependerão do objetivo/capacidades;
nenhuma captura solicitada pelo bloco de instalação. Habilitação permanece
bloqueada por telemetria/ID/UID/destinos/OEM/cross-platform e demais critérios.


Verificação do roteiro no host: onze cenários simulados PowerShell cobriram
resultado instalado anterior/novo/outro, modelo incorreto, splits, path com
travessia/injeção, erro/hash malformado após atualização, hash local divergente
e falha de install. Assert do comando fixo install -r e nenhuma instalação antes
de guardas de hash/modelo aprovados. Saída sem paths privados conferida. Nenhum
ADB/telefone/instalação real executado pelo Codex. Não é evidência de atualização
concluída pelo autor; esse retorno permanece pendente.

## Retorno da atualização — novo APK instalado, app fechado

Autor devolveu atualizacao-avaliacao-1: InstalacaoRetornouSucesso=true,
SM-S731B/com.ramonmenz.afericapturetest, uma base instalada com SHA-256
edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed,
CoincideComAnterior=false/CoincideComNovo=true. App permaneceu fechado;
indicador de câmera não percebido, nenhum diálogo/comportamento inesperado
observado. Data/hora efetivas não informadas. É confirmação relatada de install
bem sucedido e identidade posterior, não comprovação de ausência de processos,
tráfego, backups ou outros eventos internos. Codex não acessou o Samsung.

Fontes e APKs locais anteriores permanecem referência; não foram apagados pelo
procedimento orientado. Não foi solicitada abertura ou captura durante install.
Staging consultado em9612c64, PR76 ainda aberto; CI do head documentalfaad6ee
aprovado em https://github.com/RamonMenz/bp-tracker/actions/runs/45523348320 .

### T0 — abertura controlada, sem câmera

Objetivo é identificar o JS servido por Metro da fonte062e9b1 com o novo APK,
sem reutilizar por suposição o bundle histórico86017456… ou repetir captura.
O cache JS do Dev Client é artefato estático de desenvolvimento, distinto de
mídia/resultados clínicos; consultar seu hash não revela nem homologa conteúdo
runtime. Nenhum hash novo é previsto/inventado.

Somente Samsung de avaliação conectado ao ADB; se houver outro aparelho ou
emulador, parar e informar, preservando seu trabalho. Expo CLI ao abrir Android
configura reverse da porta do Metro nos dispositivos ADB conectados e registra
cleanup na saída; isso foi conferido no código instalado da CLI. Não usar tunnel,
limpar cache/dados ou abrir a cópia TalkBack. Metro anterior deve permanecer
parado. Se8097 estiver ocupada, não aceitar troca automática de porta nem matar
processo desconhecido: informar impedimento. Manter conexões originais; este
passo não é ensaio offline ou observação de tráfego de reconhecimento.

Terminal A, em bloco único; conferir HEAD/status antes de iniciar:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    Set-Location -LiteralPath 'C:\dev\aferi-task07-backup-build'
    $aferiMetroHead = (git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or $aferiMetroHead -cne '062e9b188c7af6cf9539b0ba1faed63dd26460e8') {
        throw 'metro-source-unexpected'
    }
    $aferiMetroChanges = @(git status --porcelain)
    if ($LASTEXITCODE -ne 0 -or $aferiMetroChanges.Count -ne 0) { throw 'metro-source-not-clean-preserve' }
    $aferiMetroSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
    if (-not (Test-Path -LiteralPath $aferiMetroSdk -PathType Container)) { throw 'metro-sdk-unavailable' }
    $env:ANDROID_HOME = $aferiMetroSdk
    $env:EXPO_NO_TELEMETRY = '1'
    Set-Location -LiteralPath .\demos\android-capture
    node --dns-result-order=ipv4first ..\..\node_modules\expo\bin\cli start --dev-client --localhost --port 8097
}
```

Aguardar servidor pronto; pressionar a **uma única vez** nesse terminal para
abrir o app instalado. Não é expo run:android; se pedir novo build/instalação,
Expo Go, login ou tunnel, parar e informar. Não aceitar abrir projeto diferente.
O URL/QR/nomes/identificadores do terminal não devem ser enviados.

Conferir Fast Refresh pelo menu de desenvolvimento (m no Metro). Se a ação for
Enable/Ativar Fast Refresh, já está desligado; não ativar. Se for Disable/
Desativar, desativar. Fechar o menu, fazer uma única recarga manual r no Metro
com câmera desligada e aguardar carregamento terminar. Reload aqui é preparação
entre cenários, não retomada automática ou resultado de teste de captura.
Não pressionar r/a novamente durante ensaio. Não tocar Iniciar câmera Android,
Capturar e reconhecer ou campos de revisão nesta etapa.

Esperado após carregar: captura-5, Associação: associacao-1 visível, App:active,
Fase:idle/Nativo:nao-carregado, sem preview/revisão antiga e sem indicador de
câmera percebido. Nativo não carregado é coerente com binding carregado só por
gesto Iniciar; não iniciar câmera apenas para fazê-lo virar preview-1. Marca
associacao-1 é evidência visível adicional de código atual; não prova integral
da fonte/binário. Divergência/retomada/revisão antiga exige parar e analisar.

Terminal B (novo PowerShell), com Metro A mantido aberto, após carregar/recarregar:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    $aferiAdbBundle = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
    try {
        $aferiBundleRaw = @(& $aferiAdbBundle -d shell run-as com.ramonmenz.afericapturetest sha256sum files/DevLauncherApp-BridgelessReactNativeDevBundle.js 2>&1)
        $aferiBundleCode = $LASTEXITCODE
    } catch { throw 'bundle-hash-unavailable' }
    if ($aferiBundleCode -ne 0 -or $aferiBundleRaw.Count -ne 1 -or
        $aferiBundleRaw[0] -isnot [string] -or $aferiBundleRaw[0] -notmatch '^([0-9a-fA-F]{64})\s') {
        throw 'bundle-hash-unavailable'
    }
    [pscustomobject]@{ Tool = 'bundle-abertura-1'; Sha256Bundle = $Matches[1].ToLowerInvariant() } | ConvertTo-Json
    git -C 'C:\dev\aferi-task07-backup-build' rev-parse HEAD
    git -C 'C:\dev\aferi-task07-backup-build' status --short
}
```

Devolver JSON/HEAD/status e transcrição dos indicadores acima, Fast Refresh,
se houve uma recarga manual, tela branca/erro/diálogo/impedimento e se câmera
permaneceu desligada. Se não observou indicador, registrar não observado sem
inferir câmera desligada só por app em idle. Não enviar screenshot/logcat,
dados de rede/conta, árvore JS ou bundle. Não abrir câmera ou repetir instalação
para resolver ausência do hash/diagnóstico; retornar código fixo e estado observado.

Nova rodada de recursos/arquivos/offline só será definida após T0. Telemetria/ID,
qualificação por UID/destinos, OEM/cross-platform e critérios clínicos continuam
pendentes. T0 não conclui TASK-04/06/07/18 nem atesta zero tráfego no Dev Client.

## T0 interrompido — EOF HTTP no carregamento do Dev Client

Autor relatou, ao pressionar a após iniciar Metro, IOException unexpected end of
stream em http://127.0.0.1:8097 e EOFException ao ler headers. Caminho/query da
URL foram omitidos; não arquivar stack/log inteiro. Terminal A continuou com
Metro rodando, confirmado pelo autor. Sem retorno de tela/JS carregado, Fast
Refresh ou hash novo nesta tentativa. Não concluir T0, inferência/OCR ou captura.
Data/hora efetivas não informadas. Novo APK instalado continua identificado pelo
retorno anterior, sem reinstalação solicitada para corrigir conexão.

No código instalado da CLI, Metro recebe host localhost, mas UrlCreator converte
localhost em127.0.0.1 na URL anunciada. Resolução/bind IPv6 versus IPv4 é hipótese
concreta, não causa confirmada. Outras possibilidades incluem reverse, resposta
interrompida e erro de preparação/bundle. Preservar o Metro em execução: não
pressionar a/r de novo, não reinstalar/limpar cache/dados, não trocar para tunnel,
abrir firewall global ou desativar proteção por tentativa.

### Diagnóstico metro-link-1 — loopback e reverse, só metadados

[Test-AferiMetroConnection.ps1](../tools/task07/Test-AferiMetroConnection.ps1)
consulta exclusivamente /status em127.0.0.1:8097 e [::1]:8097, timeout3s por etapa,
sem proxy e sem seguir redirects. Retorna família, HTTPstatus, igualdade booleana
do header de raiz ao projeto esperado, flag do status estático e categoria de
falha. Caminho do header fica privado; só lê até64 caracteres da resposta quando
a raiz corresponde à demo, reconhecendo o texto estático packager-status:running.
Não consulta URL completa do erro, corpo do bundle, headers clínicos ou outro
servidor de propósito; se a raiz não corresponde, não lê seu corpo.

Também executa só adb -d reverse --list, retendo identificadores privados e
retornando disponibilidade/contagens/conflito8097. Não altera reverse, redes,
permissões, app ou servidor. Indisponibilidade gera contagens null, não zero
tráfego. Não mede UID/destinos/bytes de reconhecimento e não qualifica inspector
que registre payloads. Manter app na tela de erro ou fechado; sem câmera.

Atualizar somente worktree backup-tools limpa ao commit publicado desta etapa;
fonte backup-build062e9b1, Metro A e APKedf860b7… permanecem preservados. Executar
no terminal B, com Metro A ainda rodando:

```powershell
& .\tools\task07\Test-AferiMetroConnection.ps1
```

Devolver só JSON e se Metro segue rodando. Sem logs completos, URL/query,
screenshot, serial, IP de LAN ou nomes de rede. Se a pasta de ferramentas tiver
alterações, parar e preservar. Não reiniciar para obter resultado diferente antes
da leitura; nenhuma abertura/captura extra necessária.

Interpretação depende do retorno: IPv6 pronto/IPv4 indisponível sustenta hipótese
de bind/resolução; nenhuma resposta pede verificar servidor/porta/preparação;
ambos prontos com reverse ausente/divergente pede analisar encaminhamento;
ambos prontos e reverse conhecido não excluem falha no manifesto/bundle ou SDK.
Nenhuma dessas condições prova falha no OCR ou tráfego de reconhecimento remoto.
Correção de DNS/servidor, se justificada, será entre cenários e sem troca de motor.

### Superfície adicional de privacidade — inspector do Dev Client

Stack citado contém ExpoNetworkInspectOkHttpNetworkInterceptor/AppInterceptor.
São interceptadores de desenvolvimento; sua presença não demonstra que causaram
o EOF ou enviaram conteúdo. No código local expo-modules-core, o interceptor
pode examinar corpo de resposta e encaminhar evento CDP após chain.proceed;
há Log.e de falha do evento. Nesse erro chain.proceed não entregou headers;
não inferir corpo clínico coletado ou upload a partir da stack.

O projeto Android gerado do código062e9b1 define
EX_DEV_CLIENT_NETWORK_INSPECTOR=true. DevLauncherPlugin lê essa propriedade e,
quando ausente/true, registra instrumentação de OkHttp nos variants de debug.
[Plugin só da demo](../demos/android-capture/plugins/with-disabled-network-inspector.js)
agora força a propriedade false no prebuild, sem nova dependência, reflexão,
remoção de engine ou alteração no produto clínico. Preserva outras propriedades
e recusa outro pacote. Flag falsa pula a instrumentação desse plugin no código
revisado; não promete eliminar outros coletores/logs/transportes do SDK/SO.

**Correção para build futuro:** APKedf860b7… instalado e fonte de seu Metro062e9b1
continuam inalterados. Não fazer rebuild/instalação nesta investigação do EOF.
A flag requer novo prebuild/build e validação de artefato antes de alegar aplicada
a outro APK; o modo atual permanece restrito a dados sintéticos/diagnóstico.
Não abrir inspector/DevTools para capturar requisições como teste de privacidade.
Telemetria ML Kit/ID persistente e ferramentas UID/destino continuam sem resolução.

Verificações: check do mod real Expo cobre defaults/duplicatas/idempotência e
preservação de propriedades; novo check PowerShell cobre saída privada do resumo
reverse. Integração real de saúde HTTP em fixture local loopback do host passou
para IPv4 com status estático/raiz esperada e IPv6 com raiz diferente, sem exibir
header/corpo privado e sem ADB real. Prebuild isolado com o plugin novo gerou
EX_DEV_CLIENT_NETWORK_INSPECTOR=false. Não é build APK/instrumentação Android,
execução Windows ou diagnóstico do PC do autor. CI inclui os novos checks.

## Retorno metro-link-1 — IPv6 pronto, IPv4 indisponível e reverse ausente

Autor retornou metro-link-1 com Metro ainda rodando: IPv4 HTTPnull,
FonteEsperada=false/MetroPronto=false/ConnectFailure; IPv6 HTTP200,
FonteEsperada=true/MetroPronto=true/none. Reverse Disponivel=true,
Reverse8097Conhecido=0/OutrasLinhas=0/Conflito8097=false. Data/hora efetivas não
informadas. É evidência da saúde nas duas rotas e ausência de mapeamento na
consulta, não prova do estado no instante exato do EOF ou de toda a causa.
FonteEsperada=false com falha IPv4 não identifica um servidor errado: não houve
resposta/header nesse caminho. No IPv6, a raiz esperada e status foram reconhecidos.

Corrigir somente sessão de desenvolvimento: Ctrl+C **no Metro A conhecido**,
aguardar retornar ao PowerShell. Não encerrar Node por nome/PID global, matar
ADB, desligar firewall, mudar rede do telefone, limpar cache/dados ou reinstalar.
O cleanup da CLI pode retirar o reverse conhecido ao sair; configurar depois do
novo Metro pronto. Não manter duas sessões em8097 nem aceitar outra porta.

O comando recomendado de T0 foi atualizado com --dns-result-order=ipv4first,
flag **do processo Node**, antes do caminho da CLI. Não muda DNS/IPv6 do SO,
NODE_OPTIONS global, dependências, APK ou engine. Teste no host Node24.19.0 com
lookup e HTTPserver.bind localhost em porta efêmera retornou IPv4/127.0.0.1;
não é medição Windows24.22.0 ou garantia sobre a próxima sessão do autor.

Terminal A, após Ctrl+C: executar novamente o bloco T0 da fonte062e9b1,
agora com a flag ipv4first. Aguardar Metro pronto; ainda não pressionar a.
Terminal B, mantendo só Samsung de avaliação conectado, verificar conflitos e
criar somente reverse8097, sem remover outros mapeamentos:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    Set-Location -LiteralPath 'C:\dev\aferi-task07-backup-tools'
    $aferiAdbReverse = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
    try {
        $aferiReverseAntes = @(& $aferiAdbReverse -d reverse --list 2>&1)
        $aferiReverseCode = $LASTEXITCODE
    } catch { throw 'reverse-query-unavailable' }
    if ($aferiReverseCode -ne 0) { throw 'reverse-query-unavailable' }
    $aferiReverseLinhas = @($aferiReverseAntes | Where-Object { $_.ToString().Trim().Length -gt 0 })
    if (@($aferiReverseLinhas | Where-Object { $_ -isnot [string] -or $_ -notmatch '^\S+\s+\S+\s+\S+\s*$' }).Count -ne 0) {
        throw 'reverse-output-unexpected'
    }
    $aferiReverseConflitos = @($aferiReverseLinhas | Where-Object {
        $_ -match '^\S+\s+tcp:8097\s+' -and $_ -notmatch '^\S+\s+tcp:8097\s+tcp:8097\s*$'
    })
    if ($aferiReverseConflitos.Count -ne 0) { throw 'reverse-conflict-preserve' }
    try {
        $aferiReverseCriado = @(& $aferiAdbReverse -d reverse tcp:8097 tcp:8097 2>&1)
        $aferiReverseCreateCode = $LASTEXITCODE
    } catch { throw 'reverse-create-unavailable' }
    if ($aferiReverseCreateCode -ne 0) { throw 'reverse-create-unavailable' }
    & .\tools\task07\Test-AferiMetroConnection.ps1
}
```

As ferramentasca786ed já contêm Test-AferiMetroConnection; nenhum checkout/novo
build é necessário no Windows para esta correção. Esperado IPv4 HTTP200,
FonteEsperada=true/MetroPronto=true e Reverse8097Conhecido=1 sem conflito.
IPv6 pode deixar de responder nessa sessão; não é regressão desse percurso.
Se IPv4 não ficar pronto ou reverse divergir, parar e devolver só JSON/impedimento.
Não inferir causa resolvida antes da consulta e carregamento real.

**Somente se esses critérios aparecerem**, retornar ao terminal A e pressionar a
uma vez. Se carregar, conferir Fast Refresh desligado no menu m, fechar menu e
fazer uma recarga manual r, sem câmera; observar captura-5/associacao-1/active/
idle/nao-carregado, preview/revisão ausentes e indicador de câmera percebido ou
não observado. Devolver JSON de saúde e resumo desses indicadores; não pedir
hash novo do bundle se a tela ainda não carregou. Se persistir erro, não repetir
abertura: informar apenas tipo/mensagem curta sanitizada, sem URL completa ou log.

A nova flag de desativação do inspector continua exclusivamente fonte futura;
APKedf860b7…/Metro062e9b1 preservados. Reverse é canal do Metro, não rede de
reconhecimento; sua presença não prova tráfego clínico ou processamento remoto.
T0/telemetria/UID/destinos/OEM e habilitação continuam pendentes até evidência.


Reparo de reverse conferido no host com sete cenários simulados: vazio, mapeamento
conhecido, outro mapeamento preservado, conflito8097, formato inválido, consulta
indisponível e falha na criação. Nenhum reverse-remove/ADB real executado.
Se o Dev Client carregar sozinho ao restabelecer Metro/reverse, não pressionar a
novamente; registrar carregamento de desenvolvimento e conferir os mesmos
indicadores. Isso não deve ser rotulado como retomada de captura sem observação
de câmera/tentativa, pois não há tentativa clínica iniciada nessa preparação.

## T0 recebido — abertura funcionou após ajuste de conectividade

Autor retornou tela carregada por gesto a; captura-5, associacao-1 visível,
App:active/Fase:idle/Nativo:nao-carregado; Fast Refresh desligado, sem preview ou
revisão antiga, indicador de câmera não percebido e nenhum erro/impedimento
percebido. Recarga manual r não foi confirmada explicitamente nesse retorno;
registrar como não informada, sem exigir repetição para preencher o histórico.
Data/hora efetivas da execução não informadas.

Metro-link-1: IPv4 HTTP200/FonteEsperada=true/MetroPronto=true/none;
IPv6 HTTPnull/FonteEsperada=false/MetroPronto=false/ConnectFailure;
reverse disponível, conhecido8097=1/outras linhas=0/conflito=false.
É evidência de conectividade corrigida e tela inicial nessa rodada, após ajustes
conjuntos de resolução/bind e reverse; não isola contribuição causal de cada
mudança nem garante todos os endpoints/SDK/SO. IPv6 indisponível é compatível
com essa sessão IPv4, não desativação global de IPv6 ou falha do OCR.
Não houve câmera/reconhecimento/revisão clínica ensaiados neste retorno.

Nativo não carregado é esperado: o binding só é solicitado pelo gesto Iniciar.
Não pedir ativação para transformar o indicador em preview-1. O hash do bundle
novo ainda está pendente; não reutilizar86017456… como se tivesse sido consultado
após a atualização. Staging continua9612c64/PR76 aberto conforme última consulta;
CI3e64b82 aprovado em https://github.com/RamonMenz/bp-tracker/actions/runs/45527049550 .

### Próximo controle — bundle e idle no APK atualizado

Manter Metro A aberto, Fast Refresh desligado, redes/reverse como estão, app
active/idle e câmera sem uso. Não pressionar a/r/m nem entrar em configurações
durante a janela. Nenhum novo build, instalação, limpeza de dados/cache ou
captura. Se bloquear tela/ocorrer background, popup, recarga ou outra interrupção,
registrar o que aconteceu e não repetir automaticamente. Não alterar timeout
ou outras opções globais no meio da medição.

No terminal B, consultar hash do cache JS estático; importar coletor sem Force
para preservar snapshots residentes; usar novos handles sem compará-los com IDs
da rodada anterior. Um snapshot, espera programada30s, segundo snapshot e
comparação só desse par. Janela total inclui comandos e não tem duração exata
30s comprovada. Nenhum número de arquivos ou delta é previsto/obrigatório.
Não repetir para obter delta zero.

```powershell
& {
    $ErrorActionPreference = 'Stop'
    Set-Location -LiteralPath 'C:\dev\aferi-task07-backup-tools'
    $aferiAdbIdleNovo = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
    try {
        $aferiBundleIdleRaw = @(& $aferiAdbIdleNovo -d shell run-as com.ramonmenz.afericapturetest sha256sum files/DevLauncherApp-BridgelessReactNativeDevBundle.js 2>&1)
        $aferiBundleIdleCode = $LASTEXITCODE
    } catch { throw 'bundle-hash-unavailable' }
    if ($aferiBundleIdleCode -ne 0 -or $aferiBundleIdleRaw.Count -ne 1 -or
        $aferiBundleIdleRaw[0] -isnot [string] -or
        $aferiBundleIdleRaw[0] -notmatch '^([0-9a-fA-F]{64})\s') {
        throw 'bundle-hash-unavailable'
    }
    $aferiBundleIdleHash = $Matches[1].ToLowerInvariant()
    Import-Module .\tools\task07\AferiPrivacyMetadata.psm1 -ErrorAction Stop
    $aferiNovoIdle0 = New-AferiInventory -AdbPath $aferiAdbIdleNovo
    Start-Sleep -Seconds 30
    $aferiNovoIdle1 = New-AferiInventory -AdbPath $aferiAdbIdleNovo
    $aferiNovoIdleDelta = Compare-AferiInventory -Before $aferiNovoIdle0.Id -After $aferiNovoIdle1.Id
    [pscustomobject]@{
        Cenario = 'idle-pos-atualizacao'
        Bundle = [pscustomobject]@{ Tool = 'bundle-abertura-1'; Sha256Bundle = $aferiBundleIdleHash }
        Antes = $aferiNovoIdle0
        Depois = $aferiNovoIdle1
        Comparacao = $aferiNovoIdleDelta
    } | ConvertTo-Json -Depth 6
}
```

Devolver apenas JSON final ou código fixo/impedimento e: espera programada
concluída/pausas extras; App/Fase/Nativo no fim; preview/revisão/indicador de câmera;
recarga/background/bloqueio/erro; se na abertura anterior houve r (sim/não/não
lembro, sem fazê-lo agora). Não enviar caminhos/nomes privados, imagens, OCR,
logcat completo ou arquivos de transporte. Dados internos ficam só em memória
do módulo e relatórios mostram categorias/contagens; sem novo relatório em disco.

Esse par informa mudanças de tamanho/mtime/presença dos arquivos regulares
visíveis no sandbox, não seu conteúdo, temporários entre snapshots, logs ou rede.
Identidade de entradas entre categorias/cenários não deve ser inferida. Alteração
DataTransport ou outra categoria não prova fila/envio/valores clínicos; ausência
de delta não prova privacidade universal. Telemetria/ID, ferramenta UID/destino,
OEM/cross-platform e futura aplicação da flag de inspector false seguem pendentes.
APKedf860b7…/fonte062e9b1 continuam com configuração de inspector anterior;
esta medição não substitui validação do próximo artefato ou libera uso clínico.

## Idle pós-atualização recebido — baseline nova estável no alcance observado

Autor confirmou espera programada30s concluída sem pausa adicional, active/idle/
nao-carregado ao final, sem preview/revisão/indicador de câmera percebido, bloqueio,
background, recarga ou erro. Esclareceu r feito na abertura anterior e nenhum r
durante a espera; a lacuna histórica dessa ação fica resolvida, sem repetição.
Data/hora efetivas não informadas; janela entre snapshots inclui comandos.

Bundle-abertura-1: SHA-256
**23e7dd6f19c60e35aa0ba64fe3649bfebb35a9d17f1e077029f62bc785389e25**.
É a identidade atual consultada do cache JS do Dev Client, diferente do antigo
86017456…; não é hash de mídia nem prova única de todo código executado em RAM.
Fonte/APK de referência permanecem062e9b1/edf860b7… conforme verificações anteriores.

Inventario-1: AntesId1/DepoisId2, ambos16 arquivos regulares visíveis: um bundle,
dois nomes DataTransport, doze não classificados e uma preferência nomeada MLKit.
ChangedEntries=0, Changes vazio. Confirma estabilidade dos metadados coletados
nesse par/condição, não conteúdo ou eventos entre amostras. As contagens iguais
às da rodada anterior não identificam os mesmos arquivos/bytes ou demonstram
estabilidade entre as duas rodadas. Não pedir repetição nem delta zero futuro.

### Diagnóstico atualizado e condição para próxima captura

| Aspecto | Evidência atual | Limite/estado |
|---|---|---|
| Manifesto/backup/assinaturas | Novo APK instaladoedf860b7…, refs/XML/9 domínios/assinaturas conferidos | Verificação estática, sem teste universal de transferência OEM |
| Abertura após ajuste | IPv4/reverse/tela e bundle23e7dd6f… identificados | Uma rodada de abertura; não mede rede de reconhecimento |
| Idle novo APK | UI e metadados estáveis no par recebido | Sem câmera/inferência; não comprova logs/rede/temporários |
| Inspector de desenvolvimento | Fonteca786ed força false; prebuild isolado passou | APK atualEDF ainda usa configuração anterior; novo artefato pendente |
| Telemetria/ID MLKit | Revisão de produtores/encoders e lacunas registradas | Sem resolução de anonimização/ID/transportes; gate fechado |
| UID/destinos/reconexão | Ferramenta qualificada ainda indisponível | Saúde Metro/reverse não substitui essa inspeção |
| Clínica/contas/legado | Não integrados por esta demo | Critérios aplicáveis ainda exigem evidência; nenhuma tarefa concluída |

Não iniciar nova captura neste artefato apenas porque o idle passou. Próximo
passo independente é materializar a correção do inspector em outro APK local,
sem instalar. A flag é de prebuild/Gradle, não JS; Metro/reload não a aplicam.
Não é preciso repetir build EDF nem seus checks para obter o mesmo resultado.

### Build sem inspector — uma devolução estática, sem instalação

[Build-AferiInspectorEvaluation.ps1](../tools/task07/Build-AferiInspectorEvaluation.ps1)
fixa fonte funcional **ca786ed743bac6132216e554e47a41b5e7372813** em nova worktree
C:\dev\aferi-task07-inspector-build. O destino deve não existir; se já existir,
parar e preservar. Não remove worktrees/arquivos nem reaproveita node_modules ou
android da cópia EDF. Não requer merge do PR, credenciais do produto ou ADB.
Não altera a fonte servida pelo Metro existente; não inicia outro Metro/app.

O script executa npm ci pelo lock raiz, checks dos mods, prebuild somente Android,
exige exatamente uma propriedade EX_DEV_CLIENT_NETWORK_INSPECTOR=false no arquivo
gerado e compila assembleDebug arm64 também com
-PEX_DEV_CLIENT_NETWORK_INSPECTOR=false. Preserva/restaura ANDROID_HOME e
EXPO_NO_TELEMETRY da sessão, sem modificar JAVA_HOME/PATH global. Código do
DevLauncherPlugin consome essa propriedade antes de registrar a instrumentação;
isso é rastreabilidade de configuração/invocação, não inspeção do bytecode ou
prova de ausência de outros clientes/logs/transporte no SDK/SO.

Depois calcula hash, roda manifesto-1/backup-1, compara assinaturas com o APK
EDF local de hash esperado e confere HEAD/status/hash ao final. A comparação
assinatura-1 agora aceita par explícito e hashes obrigatoriamente válidos quando
fornecidos; defaults69d5a0b3…/edf860b7… e formato de saída foram preservados.
Continua sem imprimir certificados, chaves ou logs brutos do apksigner.

Atualizar só backup-tools limpa ao commit publicado com o script; preservar as
outras worktrees, snapshots e APKs. Executar com &, sem dot-sourcing:

```powershell
& .\tools\task07\Build-AferiInspectorEvaluation.ps1
```

Logs locais normais de npm/prebuild/Gradle aparecem no terminal, sem relatório em
arquivo. **Devolver só o JSON final** (Tool build-inspector-1) ou código de etapa/
mensagem curta sanitizada. Se falhar, pasta parcial é preservada: não apagar,
reexecutar por tentativa, atualizar dependências ou enviar terminal completo.
Não desativar proteções ou licenças por tentativa; informar impedimento.

Esperado Fonteca786ed/FonteLimpa=true, hash calculado (não previsto),
InspectorFalseNoGradleProperties=true/FlagFalsePassadaAoGradle=true,
BytecodeInspecionado=false, manifesto/backup coerentes e assinaturas verificadas.
Certificados iguais ainda depende do artefato real; false exige análise sem
reassinar/desinstalar. Nenhuma tarefa install/adb/abertura é chamada. Não instalar
o candidato nem trocar o Metro para a pasta nova após o build.

Verificações do preparador: sintaxe, aceitação exclusiva da propriedade false,
rejeição de ausência/true/duplicata, tratamento de exit code versus warning nativo
e regressão do comparador de assinaturas. O prebuild real do código funcional
já foi conferido no host. **Não executamos esse build completo no Windows ou no
host; resultado e hash dependem do autor.** CI inclui checks dos helpers, não
compilação Android ou inspeção bytecode. Habilitação permanece bloqueada após
qualquer sucesso desse script até os critérios de privacidade aplicáveis.

## Candidato de inspector recebido — build e metadados agregados aprovados

Autor devolveu JSON integral por texto após falha da ferramenta de anexo; não
executou novo build por causa dessa falha. O anexo inicial não pôde ser baixado
pelo Codex (diretório temporário em filesystem somente leitura); nenhuma evidência
foi inferida de seu preview. O retorno agora legível é build-inspector-1:

| Campo | Evidência recebida |
|---|---|
| Fonte / estado | ca786ed743bac6132216e554e47a41b5e7372813 / FonteLimpa=true |
| SHA-256 candidato | 25990bb47cc706f60babf1fc75a215fcc5f5266b0c85332f01a3b58bf2086e1c |
| InspectorFalseNoGradleProperties / FlagFalsePassadaAoGradle | true / true |
| BytecodeInspecionado | false |
| Manifesto, aapt2 2.20-13193326 | Mesmo hash, pacote de avaliação, min24/target36, allowBackup=false, refs de backup presentes; cleartext/debuggable=true, networkSecurityConfig não declarado |
| Permissões selecionadas | CAMERA/INTERNET uses-permission sem maxSdk; áudio/storage/mídia selecionadas não declaradas |
| backup-1 | Mesmo hash, AllowBackup=false/ReferenciasConferidas=true; nove domínios e SomenteExclusoesRaiz=true em legado/cloud/D2D |
| assinatura-1, apksigner0.9 | EDF→25990bb4…, ambas assinaturas verificadas e certificados iguais |

Data/hora efetivas não informadas. Confirma artefato local com configuração e
invocação declaradas, regras estáticas e assinatura coerentes. Não comprova
instalação, ausência de classes/chamadas no bytecode, ausência universal de
inspector/logs/telemetria ou obediência de todo SO/OEM. Não rotular a flag como
prova de ausência de payloads em todas as bibliotecas. A última base instalada
confirmada continua EDF; nenhum retorno do candidato instalado foi recebido.

### Atualização restrita do candidato, sem abertura

[Update-AferiInspectorEvaluation.ps1](../tools/task07/Update-AferiInspectorEvaluation.ps1)
fixa pacote de avaliação e os hashes EDF/25990bb4…. Antes: parar somente Metro A
conhecido com Ctrl+C e fechar a demo pelo Recentes, sem iniciar câmera. Manter
somente Samsung de avaliação conectado por USB e desbloqueado. Não limpar dados,
reinstalar dependências ou fazer outro build. Não tocar no app clínico do produto.

O script confere hash do candidato local, get-state/modelo, uma única base APK
instalada via pm path e run-as/sha256sum. Caminho é privado, limitado a /data/app/
com whitelist/sem travessia. Só atualiza se o instalado coincide com EDF; se já
coincide com25990bb4…, não instala novamente e reporta o fato. Outra base ou erro
interrompem sem sobrepor trabalho desconhecido. Não altera reverse/redes, não
chama am start, clear, uninstall, downgrade ou permissões automáticas.

Somente install -r solicita substituição preservando dados. Não garante toda
migração/estado SDK/SO nem restauração universal. Ao final consulta hash instalado
e retorna somente metadata; o script não extrai arquivo ou copia dados runtime.
Se der erro após install, pode já ter atualizado: não repetir por tentativa nem
presumir rollback. Candidato já instalado gera InstalacaoExecutada=false e
InstalacaoRetornouSucesso=null, não falso resultado de nova instalação.

Atualizar somente worktree backup-tools limpa ao commit publicado com o script,
preservando todas as fontes/APKs e o candidato. Executar com &, sem dot-sourcing:

```powershell
& .\tools\task07\Update-AferiInspectorEvaluation.ps1
```

Devolver só JSON/código fixo e se app permaneceu fechado, indicador de câmera
percebido (ou não observado), diálogo/comportamento inesperado. Esperado primeira
atualização: antesEDF/depois25990bb4…, instalação sucesso e CoincideComCandidato=true.
Não abrir app, Metro, câmera ou repetir captura depois do script. Se conflito,
erro ou hash divergente, parar sem limpar dados/desinstalar/reassinar/bypass.
Nenhuma dessas ações representa deploy ou habilitação clínica.

### Preparação do diagnóstico para a próxima fonte

O helper metro-link-1 agora aceita -Project backup (default anterior preservado)
ou -Project inspector, ambos de enum fixo. Só muda a comparação privada do header
para a pasta de referência correspondente; endpoints continuam os mesmos dois
loopbacks/status. Campo Projeto informa a escolha. Parâmetro inválido falha antes
de qualquer consulta. Não iniciar Metro novo nesta etapa: futura abertura do
candidato usará fonteca786ed/inspector-build e flag Node ipv4first, com novo bundle
consultado, sem assumir que23e7dd6f… seja a identidade desse carregamento.

Verificações do atualizador: onze cenários simulados, incluindo candidato já
instalado sem mutação, baseline desconhecida, hash local diferente, falha de
install, hash posterior divergente, split/path injetado/travessia/modelo/formatos.
Nenhum ADB ou telefone real chamado. Helper HTTP conferido em fixture local de
duas famílias/raízes com header codificado: enum de projeto reconhece só sua
fonte, sem imprimir caminho/corpo. Checks do atualizador entram no CI.
Execução Windows da atualização e nova abertura ainda dependem do autor.
Telemetria/ID, UID/destinos, bytecode/OEM/cross-platform e critérios clínicos
continuam pendentes; nenhuma das TASK-04/06/07/18 concluída.

## Retomada após desligar o PC — falha de ADB não identifica o instalado

Autor relatou novo dia/PC desligado e terminais sem variáveis anteriores.
Worktree de ferramentas foi atualizada a4999d87 limpa conforme guarda do bloco;
script lançou inspector-update-adb-unavailable no helper nativo. Não houve JSON
final. A mensagem genérica pode vir de qualquer chamada ADB; não permite afirmar
que instalou, que não instalou, que perdeu dados ou que falhou o APK. Não assumir
reinício/atualização do telefone ou novo firmware só porque o PC foi desligado.
Não refazer build, limpar dados, reinstalar SDK ou repetir install para resolver.

**Fragilidade encontrada e corrigida:** o helper anterior usava redirecionamento
2>&1 sob ErrorActionPreference=Stop. No PowerShell5.1, stderr nativo pode virar
exceção, inclusive mensagens normais ao iniciar daemon. Isso é compatível com a
falha após boot, não causa confirmada no PC do autor. Agora Diagnostics.Process
sem shell captura stdout/stderr separadamente e usa ExitCode real; stderr fica
privado, não misturado a linhas esperadas de get-state/modelo/hash. Ausência do
executável tem código próprio. Consultas têm espera limitada; não matar uma
instalação automaticamente por timeout. Nunca chama kill-server ou reset de ADB.

Servidor ADB é iniciado explicitamente no PC com start-server, sem depender de
estado/variáveis de outro terminal. Comandos de telefone mantêm -d. Mensagens
privadas de startup/erro não saem no JSON. Parâmetro -Server interno só permite
start-server, sem alvo global arbitrário. Falhas com ExitCode não zero continuam
reprovadas; não tratar toda mensagem stderr como prova de erro nem ignorar code.

### Consulta -ReadOnly antes de continuar

Novo switch -ReadOnly inicia o servidor no PC e faz só consultas no telefone.
Não exige acesso ao arquivo candidato e não entra no ramo install. Retorna
inspector-session-1/Modo=consulta/PacoteAlvo fixo e categorias device/unauthorized/
offline/no-usb/multiple-usb/adb-error. Se não há dispositivo disponível, hash e
modelo ficam null (não false/zero); não consulta outro aparelho por fallback.
Com device e modelo esperado, lê só o hash da única base do pacote de avaliação.
InstalacaoExecutada=false diz respeito a **essa consulta**, não ao script falho
anterior. AvisosServidorStderr registra só presença de stderr atual no startup;
false não exclui que tenha ocorrido na chamada anterior que falhou.

Conectar somente Samsung de avaliação por USB, desbloqueado; autorizar apenas o
próprio PC se aparecer pedido de depuração. Não iniciar Metro/app/câmera. Atualizar
só worktree backup-tools limpa ao commit publicado da correção; APKs e fontes
continuam preservados. O bloco da entrega confere que o script tem ReadOnly em
sua interface antes de executá-lo, evitando que uma cópia antiga sem esse switch
ignore o argumento e entre na atualização por engano.

```powershell
$aferiConsultaScript = Get-Command .\tools\task07\Update-AferiInspectorEvaluation.ps1 -ErrorAction Stop
if ($null -eq $aferiConsultaScript.Parameters -or -not $aferiConsultaScript.Parameters.ContainsKey('ReadOnly')) {
    throw 'readonly-interface-unavailable'
}
& $aferiConsultaScript.Path -ReadOnly
```

Devolver só JSON ou código de impedimento. Não mostrar Errors/Lines/stdout/stderr,
serial, caminho instalado ou logcat. Se unauthorized/offline/no-usb etc., parar
sem instalar e analisar essa categoria; não trocar driver, permissões, redes ou
matar processos por tentativa. O script não abre a demo nem grava relatório.
Start-server pode criar/usar arquivos internos do ADB no PC; não é captura de
mídia ou escrita clínica do produto, nem prova universal de comportamento do SO.

Se a consulta retornar device/ModeloConfere=true e CoincideComAnterior=true,
a instalação pode prosseguir **separadamente** com o mesmo script sem -ReadOnly,
que repete as guardas de identidade e só aceita EDF→25990bb4…. Se
CoincideComCandidato=true, não reinstalar: candidato já identificado. Se nenhum
hash coincide, preservar e analisar. Não misturar a saída de consulta com retorno
de instalação ou declarar sucesso antes da verificação posterior.

Verificações: regressões anteriores do atualizador preservadas; consultas simuladas
para EDF/candidato/base desconhecida/não autorizado e ausência de candidato local
não executam install. Categorias de falha foram conferidas sem emitir mensagens
privadas. Processo executável fictício no Linux reproduziu startup em stderr,
stdout device e falha por autorização, além de argumento com espaços: streams,
ExitCode e quoting preservados sob preferência Stop. Não é reprodução real do
PowerShell5.1/ADB/Windows do autor. A execução de retomada ainda depende do retorno.
Habilitação clínica, bytecode, telemetria/ID/UID/destinos/OEM continuam pendentes.


Retomada não exige reabrir o app nem novo build. A sessão anterior de inventário
ficava em RAM do PowerShell e não deve ter IDs reutilizados após desligar o PC;
as devoluções/documentos já recebidos continuam evidência histórica. ADB/reverse/
Metro/variáveis anteriores não são presumidos ativos. Não executar health Metro
nem iniciar servidor JS até recuperar identidade/estado USB.

Depois da consulta, os próximos comandos são condicionais à evidência local:
se device/ModeloConfere=true/CoincideComAnterior=true, pode executar o atualizador
sem ReadOnly, mantendo a demo fechada (cancelar uma tentativa já ativa antes de
fechá-la, sem iniciar outra). Se CoincideComCandidato=true, pular instalação e
retornar esse JSON. Em qualquer outra condição/erro, parar. O comando sem switch
repete as guardas, não depende dos valores de variáveis do terminal anterior e
não abre a aplicação. Devolver JSON de consulta e, se executado, o de atualização;
não interpretar InstalacaoExecutada=false da consulta como resultado do dia anterior.


A interface agora rejeita nomes de parâmetros desconhecidos antes de executar o
script (CmdletBinding), com regressão de erro de digitação do switch ReadOnly.
A guarda de Get-Command da entrega continua necessária para recusar uma cópia
antiga sem esse parâmetro. Só o modo explicitamente escolhido deve ser executado;
consulta e atualização têm JSONs distintos e não devem ser confundidos.

## Retomada e instalação do candidato confirmadas pelo autor

Consulta inspector-session-1 recebida: Modo=consulta, pacote alvo de avaliação,
EstadoAdb=device, AvisosServidorStderr=true, ModeloConfere=true, hash instalado
EDF, CoincideComAnterior=true/CoincideComCandidato=false e InstalacaoExecutada=false.
A consulta funcionou mesmo com stderr de startup, sem expor seu conteúdo. Isso
corrobora a robustez do transporte corrigido, sem identificar sozinho a causa
exata da exceção anterior. Não pedir reprodução do erro ou mensagens brutas.

Depois, retorno inspector-update-1: SM-S731B/pacote esperado,
InstalacaoExecutada=true/InstalacaoRetornouSucesso=true,
CandidatoJaEstavaInstalado=false, antes
edf860b77c745b9e44ccfc69ab42cd1a4296549e78f7dfa5a837409f46aed2ed,
depois **25990bb47cc706f60babf1fc75a215fcc5f5266b0c85332f01a3b58bf2086e1c**,
CoincideComCandidato=true. Data/hora efetivas não informadas. A identidade instalada
foi reconfirmada após a troca; não extrapolar para ausência universal de classes,
logs/telemetria ou preservação de todo estado SDK/SO. Bytecode continua não
inspecionado. Estado visual/indicador de câmera após essa atualização não foi
informado neste retorno; não inferir app fechado só pelo script não chamar start.

### Abertura do candidato — fonte inspector-build, sem câmera

Não reinstalar/recompilar nem usar backup-build062e9b1 como Metro desta rodada.
As fontes/APKs anteriores e o bundle23e7dd6f… continuam referência daquela rodada.
Candidato instalado é25990bb4… da fonteca786ed. Se a demo já estiver aberta,
fechar sem iniciar câmera; cancelar apenas uma tentativa que já esteja ativa.
Somente Samsung conectado ao ADB; sem outros aparelhos/emuladores na abertura
pela CLI. Não interromper processos desconhecidos ou aceitar porta alternativa.

Terminal A, um PowerShell novo; manter aberto depois de iniciar:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    Set-Location -LiteralPath 'C:\dev\aferi-task07-inspector-build'
    $aferiInspectorHead = (git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or $aferiInspectorHead -cne 'ca786ed743bac6132216e554e47a41b5e7372813') {
        throw 'inspector-metro-source-unexpected'
    }
    $aferiInspectorChanges = @(git status --porcelain)
    if ($LASTEXITCODE -ne 0 -or $aferiInspectorChanges.Count -ne 0) { throw 'inspector-metro-source-not-clean-preserve' }
    $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
    $env:EXPO_NO_TELEMETRY = '1'
    Set-Location -LiteralPath .\demos\android-capture
    node --dns-result-order=ipv4first ..\..\node_modules\expo\bin\cli start --dev-client --localhost --port 8097
}
```

Aguardar Metro pronto, ainda sem a. Terminal B, usando ferramentas atualizadas
no commit publicado desta entrega: novo modo -PrepareMetro é separado de
-ReadOnly e de atualização. Não aceita os dois switches juntos; não faz install,
não exige APK local e recusa candidato instalado diferente de25990bb4…. Reutiliza
Process/stdout/stderr separados, consulta reverse e só configura8097 se não houver
conflito; deixa outros mapeamentos intactos e retorna metadados sem serial/path.

```powershell
& {
    $ErrorActionPreference = 'Stop'
    Set-Location -LiteralPath 'C:\dev\aferi-task07-backup-tools'
    & .\tools\task07\Update-AferiInspectorEvaluation.ps1 -PrepareMetro
    & .\tools\task07\Test-AferiMetroConnection.ps1 -Project inspector
}
```

Esperado preparo sem instalação, reverse8097 configurado e health com
Projeto=inspector, IPv4HTTP200/FonteEsperada=true/MetroPronto=true,
Reverse8097Conhecido=1/Conflito8097=false. IPv6 pode falhar. Se não corresponder,
parar e devolver JSON/código, sem abrir app/câmera, recriar SDK ou refazer APK.
Não copiar código antigo de reverse com captura stderr no pipeline sob Stop.

Somente com esses critérios: no terminal A pressionar a uma vez. Se carregar
sozinho antes, não pressionar novamente e registrar o fato. Esperados captura-5,
associacao-1, active/idle/nao-carregado, sem preview/revisão antiga/indicador de
câmera percebido. Conferir Fast Refresh desligado no menu m, fechar menu e fazer
uma recarga manual r entre cenários, aguardando terminar. Não iniciar câmera,
reconhecer, editar revisão ou confirmar valores nesta etapa. Divergência/erro
interrompe; sem logs completos, screenshots ou URLs com query.

### Bundle e idle do candidato, somente se a abertura corresponder

Depois de carregar/recarregar, no terminal B, com Metro A aberto e app idle;
mesma API já disponível, sem apagar snapshots ou importar com Force:

```powershell
& .\tools\task07\Collect-AferiInspectorIdle.ps1
```

Devolver health e JSON compacto do idle, além de origem da abertura, indicadores
antes/depois, Fast Refresh, r manual concluído, espera programada30s/pausas e
interrupções. Não tocar app/a/r/m/configurações durante a espera; se bloquear,
background/recarregar/erro, registrar sem repetir automaticamente. Não exigir
16 arquivos/delta0 nem hash diferente/igual a23e7dd6f…: consultar e analisar os
valores reais. Igualdade do JS pode ocorrer em caminhos com código de negócio
igual; diferença também não prova todo código em RAM. Não comparar IDs antigos
ou atribuir conteúdo/causa/envio aos deltas por categoria.

Esse controle novo se justifica pela troca do artefato nativo/configuração e
sessão do Metro. Não representa confirmação de privacidade universal nem de
bytecode; não libera uso clínico ou conclui tarefas. Tráfego UID/destinos, SDK/ID,
OEM/transferência/contas e demais critérios continuam pendentes antes de captura
clínica. Nenhuma nova captura física é solicitada nesta abertura/idle.


O controle final foi reunido em Collect-AferiInspectorIdle.ps1: primeiro faz a
consulta ReadOnly e exige pacote/modelo/candidato corretos; depois lê hash do
bundle, coleta par30s e retorna JSON compacto, sem arquivo de relatório ou
Force no módulo de inventário. Não inicia app/câmera ou modifica reverse.
Transporte Process sem shell foi extraído sem alteração de contrato para
AferiEvaluationAdb.psm1 e reutilizado por atualização/preparo e hash do bundle;
assim o novo coletor não depende de redirecionamento stderr no pipeline.
Coletor de arquivos existente permanece com seus guards/escopo anteriores.

Regressões do atualizador/preparo cobrem conflitos de modo, outros mapeamentos,
formato/consulta/criação inválidos e candidato errado sem install/reverse-set.
Native dummy-process validou a extração do transporte; guardas de sessão do novo
idle testadas sem consulta/espera real. Nova abertura/idle Windows ainda pendentes.
