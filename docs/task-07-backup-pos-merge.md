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
