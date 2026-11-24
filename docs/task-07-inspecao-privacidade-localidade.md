# TASK-04/06/07/18 — inspeção de privacidade e localidade Android

Preparado em 24/11/2026 sobre staging
`81af92f4d3763e1e89f910e01c296decf83b5778`, branch
`docs/task-07-inspecao-privacidade`. Diagnóstico **parcial e habilitação clínica
bloqueada**. A inspeção física abaixo ainda não foi executada nesta etapa.
Aplicam-se a [constituição](../constitution.md), a [spec fotografia](../specs/spec-fotografia.md)
(FOT-01/02/07/08/10/16), os gates de [tasks.md](../tasks.md) e os
[resultados anteriores](task-07-resultados-samsung.md). Não repetir a bateria
A–K/R1/R2: esta rodada acrescenta observação de armazenamento/rede por cenário.

## Estado e fontes

PR #74 continua aberto no início desta etapa, head
`812d65b3930833e9b2040882dbc877c20109cdab`; não foi mesclado/cherry-picked.
Sua [auditoria estática de produtores](https://github.com/RamonMenz/bp-tracker/blob/812d65b3930833e9b2040882dbc877c20109cdab/docs/task-07-auditoria-dependencias.md#produtores-de-eventos-e-limites-da-inspeção)
foi consultada como evidência separada. Staging continua 81af92f; work/3f8220f
e a worktree do PR #74 foram preservadas. Sem acesso a outro chat ou Windows.

| Camada / ferramenta | Versão e evidência | Alcance |
|---|---|---|
| Fontes próprias | staging 81af92f; arquivos citados abaixo | Revisão estática; não compila Kotlin/APK |
| Expo / Dev Client / Dev Launcher | 57.0.8 / 57.0.13 / 57.0.13, locks e pacotes locais | O launcher tem rede/caches/logs próprios; não é só OCR |
| RN / Expo Modules Core | 0.86.0 / 57.0.7 | Fontes locais, sem execução Android |
| CameraX | camera2/lifecycle/view 1.5.1 | Declaração Gradle; árvore resolvida histórica separada |
| ML Kit | text-recognition 16.0.1 embarcado; common 18.11.0 e text-common 19.1.0 na auditoria | Inferência local não elimina telemetria/identificador |
| DataTransport | runtime 2.2.6 / backend-cct 2.3.3 na árvore recebida anteriormente | Banco técnico/envio possíveis; conteúdo não inspecionado |
| Samsung histórico | SM-S731B, Android/API 17/37 relatados | Reconfirmar P0; não presumir estado atual |
| APK/bundle históricos | Identidades no [ciclo de vida](task-07-ciclo-vida-samsung.md) | Hash de arquivo não comprova todo runtime nem privacidade |
| Coletor desta etapa | inventario-1, PowerShell 7.5.4/Linux nos checks | Windows PowerShell/ADB/Samsung ainda sem execução |

## Caminho revisado e diagnóstico

| Trecho | Evidência no código | Conclusão limitada |
|---|---|---|
| Entrada isolada | demos/android-capture/index.tsx, app.json e package.json | Câmera por gesto; demo sem writer/Firebase; módulos de auth/crash/push/voz excluídos no autolinking da demo |
| Câmera | [AferiPhotoView.kt](../native-modules/aferi-photo-capture/android/src/main/java/expo/modules/aferiphoto/AferiPhotoView.kt): ImageAnalysis/YUV_420_888, KEEP_ONLY_LATEST, ResolutionSelector | Não usa ImageCapture, OutputFileOptions, MediaStore ou captura em URI no caminho próprio |
| RAM | [FrameBytes.java](../native-modules/aferi-photo-capture/android/src/main/java/expo/modules/aferiphoto/FrameBytes.java): cópia NV21; ImageProxy em finally/close; InputImage.fromByteBuffer | Sem arquivo intermediário no código revisado; não demonstra internos de CameraX/SDK/SO |
| Reconhecimento | TextRecognition.getClient(DEFAULT_OPTIONS), variante embarcada 16.0.1 | Nenhuma API própria de upload/fallback remoto; rede interna do SDK ainda aberta |
| Limpeza | lease global, generation/active, stopCamera, recognizer.close, ownedBytes=null após complete | Evita reutilizar buffer durante leitura; cleanup falho bloqueia. Não promete cancelamento instantâneo do ML Kit ou sobrescrita física da RAM |
| Ponte/interpretação | [android-photo-session.ts](../src/services/recognition/android-photo-session.ts) → [parseOcr/interpretPhoto](../src/domain/interpret-photo.ts) → CandidateSet | Texto/caixas transitórios em RAM; revisão só depois do ACK; contrato inválido vira erro fixo |
| Revisão | [useAndroidPhotoReview](../src/features/assisted-entry/useAndroidPhotoReview.ts)/[useCandidateReview](../src/features/assisted-entry/useCandidateReview.ts), previewOnly | Sem writer/fila; cancelar/background/recapturar invalidam candidatos e respostas tardias. Confirmação da demo só em memória; não confirmar nesta inspeção |
| Logs próprios | Captura, coordenador, adaptador, interpretação e revisão examinados | Sem logger/console clínico nesse percurso; erros projetados em códigos. Diagnósticos fixos em memória; não homologam logs internos/coletores do SO |
| Dependências | [árvore e auditoria](task-07-auditoria-dependencias.md) e auditoria do #74 acima | ID persistente tem rota de serialização/transporte; há também TelemetryLoggingClient.log. Nenhuma anonimização integral ou desativação pública suportada comprovada |

Busca estática incluiu File/URI/fromFilePath/MediaStore/ContentResolver,
cache/filesDir/external, Log/console/logger/crash, HTTP/fetch/upload/Storage e
ImageCapture. Ausência na busca não é prova de ausência em binários transitivos.
No Dev Launcher local há `Log.w("DevLauncher", e)` em tratamento de aparência;
não se afirma ausência de todos os logs só porque os adaptadores são silenciosos.

**Manifesto:** o módulo declara CAMERA e câmera opcional. A demo bloqueia áudio
e permissões de mídia/storage listadas em app.json. Isso não impede escrita no
sandbox privado, que dispensa essas permissões. O template Expo 57.0.8 consultado
em expo/template.tgz declara INTERNET; debug permite cleartext para ferramentas
de desenvolvimento. O manifesto do Dev Launcher inclui barcode_ui: scanners do
launcher podem compartilhar dependências/tráfego com OCR. Template/configuração
não são o manifesto final mesclado nem o APK instalado. Não remover INTERNET,
alterar backup ou dependências por tentativa para obter um teste sem tráfego.
O manifesto efetivo e comportamento de backup/SDK permanecem condições de aceite.

**Arquivos:** bundle JS do Dev Launcher, assets/modelos estáticos, code_cache e
metadados de instalação não são automaticamente captura clínica. Nomes técnicos
são apenas pistas: banco DataTransport/prefs ML Kit podem ser eventos/ID; não
ler/exportar seu conteúdo. Arquivo novo, tamanho/mtime alterados ou hash igual
não determinam conteúdo ou causa. Não chamar cache desconhecido de seguro.

## P0 — condução inicial, sem captura

Executar somente P0 primeiro e devolver o resumo. As demais seções são o plano
preparado; avançar em pequenos grupos após analisar versão, capacidades e falhas.
Não há nova captura liberada implicitamente por listar todos os cenários.

1. Na cópia que alimenta Metro, `git rev-parse HEAD` e `git status --short`.
   Informar HEAD/nomes de alterações, reinstalação desde a última coleta, estado
   de Metro/demo, Fast Refresh e marcadores visíveis. Não trocar código/APK.
2. No segundo PowerShell, usar o SDK existente e um único dispositivo USB:

```powershell
$aferiAdb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
Test-Path -LiteralPath $aferiAdb -PathType Leaf
& $aferiAdb -d version
& $aferiAdb -d shell getprop ro.product.model
& $aferiAdb -d shell getprop ro.build.version.release
& $aferiAdb -d shell getprop ro.build.version.sdk
& $aferiAdb -d shell pm list packages -U com.ramonmenz.afericapturetest
```

Devolver somente versão do ADB (sem Installed as/caminho/host), modelo/Android/API
e linha exata do pacote alvo/UID; UID histórico 10033 não é pressuposto. Se SDK
for diferente, ajustar apenas aferiAdb para o executável existente; não instalar.
`-d` falha se houver mais de um alvo USB: não compartilhar serial/lista de apps.
Se pacote ausente/ambíguo, dispositivo indisponível ou cópia alterada, parar aí.

3. Informar se já existe ferramenta capaz de mostrar **apenas metadados** por
   aplicativo/UID e destino. Nome/versão/capacidade, sem iniciar gravação/instalar.
   `cmd netstats help` já retornou No shell command implementation; não repetir
   por rotina. Nenhum contador/destino foi recebido para esta rodada.

A identidade do bundle pode ser obtida, com câmera desligada, se a demo já foi
carregada; se ausente, registrar pendente, sem reload para fabricar coincidência:

```powershell
& $aferiAdb -d shell run-as com.ramonmenz.afericapturetest sha256sum files/DevLauncherApp-BridgelessReactNativeDevBundle.js
```

### M0 — manifesto efetivo, sem exportar APK

Se o autor ainda possui o APK local do build já instalado, e seu hash foi
vinculado ao base.apk pelo procedimento histórico, inspecionar esse artefato
**local** no APK Analyzer do Android Studio existente. Sem pull do telefone,
novo build, instalação de ferramentas ou envio do binário. Registrar versão do
Android Studio/Analyzer e transcrever somente presença/ausência de CAMERA,
INTERNET, RECORD_AUDIO e permissões de storage/mídia; atributos allowBackup,
usesCleartextTraffic e referências a regras de backup, se presentes. Não enviar
manifesto completo, certificados, paths pessoais ou conteúdo de regras/arquivos.

Se houver apenas fonte/template ou o hash não corresponder, M0 fica NE para o
instalado. Não chamar permissões desejadas em app.json de permissões verificadas
no APK. M0 pode ficar pendente enquanto se realiza inventário, mas o gate de
habilitação precisa de sua evidência e da revisão de backup/regras aplicáveis.

## Coletor de inventários — preparação após P0

[Coletor](../tools/task07/AferiPrivacyMetadata.psm1) e
[checks sintéticos](../tools/task07/AferiPrivacyMetadata.check.ps1). Usar cópia
separada desta branch só para ferramentas, preservando todas as cópias anteriores.
Não abrir Metro, prebuild ou instalar APK a partir dessa nova pasta.
Em pasta Git existente, com destino novo e inexistente:

```powershell
git fetch origin docs/task-07-inspecao-privacidade
git worktree add --detach C:\dev\aferi-task07-privacidade FETCH_HEAD
cd C:\dev\aferi-task07-privacidade
git rev-parse HEAD
git status --short
$PSVersionTable.PSVersion.ToString()
Import-Module .\tools\task07\AferiPrivacyMetadata.psm1 -Force
$aferiI0 = New-AferiInventory -AdbPath $aferiAdb
$aferiI0 | ConvertTo-Json -Depth 4
```

Esperado: Tool inventario-1, Id, quantidade de arquivos e categorias fixas.
Erro de política de execução, stat/run-as/ADB, saída inválida ou inventário
parcial: registrar só código sanitizado e parar; não mudar política, usar root,
cat, pull, banco, imagem ou logcat como alternativa. PowerShell 5.1/Windows e
Android toybox ainda precisam da prova de capacidade: checks Linux não a substituem.

O comando fixo executado é `run-as com.ramonmenz.afericapturetest find . -type f
-exec stat -c %s:%Y:%n {} \;`. Coleta tamanho/mtime/caminho relativo, sem conteúdo,
UID de outro app, hash de mídia ou rede. Caminhos ficam privados no módulo;
relatórios mostram somente categorias e quantidades, inclusive adicionados,
removidos e tamanho/mtime alterados. Não redirecionar saída para arquivo,
transcript ou clipboard; não inspecionar/exportar variáveis internas do módulo.
O módulo não chama APIs de escrita no telefone nem lê conteúdo de arquivos.
Find/stat percorrem entradas para obter metadados; atime/efeitos do filesystem
não são medidos nem se promete observação sem qualquer efeito do SO.

Capturar antes/depois de cada cenário, pelo PC, sem sair da demo:

```powershell
$aferiAntes = New-AferiInventory -AdbPath $aferiAdb
# Executar apenas o cenário combinado; terminar com câmera liberada.
$aferiDepois = New-AferiInventory -AdbPath $aferiAdb
Compare-AferiInventory -Before $aferiAntes.Id -After $aferiDepois.Id | ConvertTo-Json -Depth 5
```

São snapshots não atômicos de arquivos regulares sob o diretório inicial de
run-as, sem seguir symlinks. Não cobrem arquivos transitórios entre consultas,
conteúdo alterado com mesmo tamanho/mtime, diretórios, armazenamento externo,
área device-protected, MediaStore, backup, outros processos ou todo SDK/SO.
Mudança durante stat pode tornar a leitura inconclusiva; repetir só a coleta de
metadados depois de estabilizar, sem repetir captura até obter resultado favorável.
Ao encerrar: `Clear-AferiInventories`; `Remove-Module AferiPrivacyMetadata`.
Isso limpa metadados do host, não arquivos do telefone nem garante sobrescrita RAM.

## Cenários dirigidos de armazenamento e recursos

Condição comum: cartão sintético 120/80/72, sem dados pessoais ao redor, Fast
Refresh desligado, fonte identificada e apenas cliente de avaliação. Não confirmar.
Registrar o intervalo efetivamente observado (aproximado se não medido), sem
inventar duração/horário. Mesmo intervalo entre controles quando possível.

| Grupo | Ação e par de inventários | Esperado / limites |
|---|---|---|
| I — controle sem modalidade | I0, demo idle sem Iniciar; aguardar intervalo anotado; I1 | Não abrir câmera. Estima ruído de bundle/caches; não subtrair cegamente do cenário OCR |
| S — sucesso | S0, um Iniciar e uma captura sintética; revisão e câmera encerradas; S1 antes de cancelar | Correspondência com cartão sim/não, sem texto OCR; sem arquivo clínico identificável. Mudanças desconhecidas ficam inconclusivas, não seguras por nome |
| B — background da revisão | Reutilizar a revisão de S, B0=S1; Home e retorno sem Iniciar; B1 | Campos/diagnóstico descartados, câmera sem uso ativo, sem retomada. Aproveita S sem captura extra |
| C — cancelamento no preview | C0, um Iniciar até ready, Cancelar sem Capturar; C1 | Cancelled, preview/câmera encerrados, sem revisão tardia. Não comprova cancelamento durante OCR |
| E — erro seguro de permissão | Com câmera desligada, negar câmera **só da demo** nas Configurações; retornar/reidentificar processo/bundle, E0; um Iniciar e negar se houver diálogo; E1 | Negado/cancelado sem câmera, OCR ou retry. Modal/background podem cancelar: informar fase/código; não chamar de erro do motor. Falha de frame/engine não induzida permanece NE |
| R — reinício controlado | Após fluxo normalmente encerrado e rede/Metro restaurados, R0; force-stop só da demo; abrir seu ícone uma vez, sem Iniciar; R1 | Nenhum candidato/câmera antigos, carregamento separado do OCR. Falha de retorno é impedimento, sem insistir/reinstalar |

O comando de R, somente depois de confirmar câmera desligada e fluxo saudável:

```powershell
& $aferiAdb -d shell am force-stop com.ramonmenz.afericapturetest
```

Não limpar dados/cache, não reiniciar telefone, não abrir produção. Se erro ou
permissão reiniciar processo, nova baseline; não comparar como se nada mudou.
A restauração de permissão ocorre por escolha usual do SO, entre grupos e com
câmera desligada; não conceder para retomar tentativa cancelada automaticamente.

**Parada obrigatória:** câmera em uso após saída/cancelamento, resultado antigo,
concorrência, resource-busy inesperado, blocked ou cleanup-failed: parar novos
ensaios, cancelar/sair e registrar fase/código. Se uso ativo persistir, encerrar
somente a demo pelas Configurações, sem apagar dados nem reiniciar ensaios para
contornar. Não forçar ACK, falha de cleanup ou disputa de câmera. Indicador verde
pode significar uso recente; distinguir atual/recente e observar preview. UI/ACK
não comprovam liberação física da RAM ou de todos os recursos internos.

## Localidade, Metro, UID/destino e reconexão

### Capacidade de rede — antes de capturar

Não há interface por UID/destino validada neste Samsung. `dumpsys netstats --uid`
não seleciona necessariamente um UID; opções desconhecidas podem gerar dump
global. Não usar netstats global, /proc/net ou /proc/PID/net (tabelas podem ser
compartilhadas), tcpdump, PCAP, MITM, proxy TLS, Network Inspector com payloads,
heap dump ou logcat completo. Não instalar VPN/monitor por tentativa.

Uma ferramenta **já disponível** só entra no protocolo após conferir que sua
coleta pode se limitar ao pacote/UID certo e a: destino IP/host, porta, protocolo,
contagens/bytes e intervalo. Desabilitar captura/exportação de corpos, headers,
URLs/caminhos/query strings, pacotes, DNS bruto, chaves e dados de outros apps.
Se a ferramenta coleta esses conteúdos automaticamente e apenas oculta a tela,
não serve a este protocolo. Registrar ferramenta/versão/filtro e limitações.
Se ela não identifica UID, não relatar UID por inferência; se não identifica
destino, deixar destino NE. Sem ferramenta compatível, essa parte fica bloqueada,
enquanto inventários/recursos podem prosseguir após P0. Isso bloqueia habilitação.

Contadores da tela de dados **só do app** são complemento opcional, sem destinos
ou precisão garantidos. Registrar interface/período/unidades/arredondamento;
nenhuma screenshot de listas de apps. Abrir Configurações causa background:
consultar apenas antes/depois de cenário encerrado, nunca em vez de monitorar
OCR ativo. Igualdade exibida não é zero bytes; aumento não identifica payload.

### Separar desenvolvimento e reconhecimento

- Com USB reverse tcp:8097, acesso a loopback:8097 é encaminhado ao Metro no PC.
  Aliases de evidência: `Metro:8097`/`loopback:8097`; omitir IP privado/serial.
  Bundle, assets, WebSocket e controle podem trafegar sem Capturar. Fast Refresh
  desligado não desliga toda a rede do Dev Client. Tráfego do host tem identidade
  do processo no host, não prova UID de origem do telefone.
- UID da demo inclui launcher e SDKs. Destino externo durante OCR não comprova
  reconhecimento remoto; pode ser telemetria, scanner ou outro componente.
  Destino Google não identifica sozinho o produtor. Também não chamar todo
  tráfego externo de Metro. Observar I, abertura do preview e S separadamente:
  criar reconhecedor já pode produzir evento antes da inferência.
- Para cada janela já combinada, registrar início/fim/intervalo reais, rede,
  fase, UID/filtro, aliases de destinos, portas, bytes/contagens se disponíveis,
  recarga/reinício e lacunas. Nada de payload ou amostras do produto.

### O — ensaio sem conectividade externa e sem canal Metro

Depois de carregar o JS necessário e com câmera desligada, registrar o estado
inicial das conexões e do reverse. Não modificar rotas preexistentes desconhecidas.
Para conferir somente mapeamentos 8097 no host, sem imprimir o serial:

```powershell
$aferiReverse = @(& $aferiAdb -d reverse --list)
if ($LASTEXITCODE -ne 0) { throw 'reverse-unavailable' }
$aferi8097 = @($aferiReverse | Where-Object { $_ -match '\stcp:8097\s+tcp:8097\s*$' })
if ($aferiReverse.Count -gt 0 -and $aferi8097.Count -ne 1) { throw 'reverse-8097-ambiguous' }
'Reverse 8097 conhecido: ' + ($aferi8097.Count -eq 1)
```

Saída é apenas boolean. Mapeamento inexistente não autoriza criá-lo por rotina;
registrar o caminho de carregamento LAN/USB. Se houver saída não compreendida,
parar alteração do reverse. Não devolver aferiReverse bruto.

1. Fora de qualquer captura, desligar Wi-Fi/dados móveis pelas configurações
   usuais. Conferir que não há tethering USB/Bluetooth/Ethernet/VPN fornecendo
   caminho externo; registrar a condição sem SSID, conta, IP ou dados de operadora.
   A ida às Configurações pode cancelar/recriar a demo: retornar e identificar
   isso antes de medir. Não enfraquecer cancelamento para manter o teste vivo.
2. Se houver exatamente o reverse 8097 conhecido, removê-lo temporariamente com
   `& $aferiAdb -d reverse --remove tcp:8097`, anotando sucesso/erro; manter Metro
   aberto no PC e JS carregado. Isso retira esse canal, não toda capacidade USB/SO.
   Sem comprovação das conexões, nomear o resultado como condição relatada,
   nunca isolamento absoluto de rede.
3. O0, então uma captura sintética por novo gesto, sem reload. Esperado: revisão
   funcional, câmera encerrada, sem pedido de rede/fallback; O1 e cancelar.
   Se perder bundle/ficar no launcher, não executar captura nem chamá-la de falha
   OCR. Registrar indisponível; não recompilar/instalar para contornar nesta rodada.
4. Após cancelar e conferir câmera desligada, antes de reconectar, Q0. Restaurar
   apenas redes originais e o reverse 8097 **somente se removido no passo 2**:
   `& $aferiAdb -d reverse tcp:8097 tcp:8097`. Retornar à demo, sem novo Iniciar;
   observar a janela combinada e registrar tempo real. Q1; sem captura extra.
5. Se houver ferramenta qualificada, observar UID/destinos no intervalo offline
   e na reconexão. Evento pode ser enfileirado/adiado; ausência numa janela finita
   não exclui envio posterior. Reconectar Metro gera tráfego de controle: separar
   alias local de destinos externos. Sem ferramenta, marcar rede/destinos NE.

O sem reverse complementa o R1 histórico, que manteve USB/localhost possível.
Não repeti-lo sem P0/capacidades e objetivo atual fechados. Reconhecimento nessa
condição sustenta inferência local no percurso observado; não homologa arquivos,
telemetria, todos os logs ou requisitos completos de privacidade.

## Registro sanitizado e condições de habilitação

Uma devolução por grupo, sem imagens/áudios, OCR bruto, dumps ou relatório completo
de ferramentas. Formato, preenchendo ausências com NE/inconclusivo e motivo:

```text
Grupo/cenario; HEAD/status da fonte e da ferramenta; Tool inventario-1;
ADB/PowerShell/Android/modelo; pacote/UID; bundle/APK se consultados, reinstalacao;
conexoes/Metro/reverse; fase antes/acao/fase depois; intervalo real/aproximado;
resumo BeforeFiles/AfterFiles/ChangedEntries/Changes;
camera atual/recente/preview; revisao descartada?; retomada ou erro fixo?;
ferramenta de rede/versao/filtro; destinos por alias/porta/contagens ou NE;
reconexao e recarga/reinicio; observacao e alcance; impedimento/proxima analise.
```

Estado inicial desta etapa: revisão de código e dependências realizada; coletor
validado com fixtures; P0 solicitado e ainda sem retorno registrado. Inventários,
O/Q e UID/destinos novos **não executados**, sem datas/horários ou resultados
atribuídos ao Samsung. Observações históricas continuam com suas fontes e limites.

Habilitar exige evidência aplicável, sem afirmar garantias universais:

- Memória/descartes no caminho próprio e SDK: nenhuma gravação/envio de mídia,
  texto ou valores clínicos; revisar internos, erros/logs/cache/backup e manifesto
  efetivo. Snapshot vazio não satisfaz sozinho o critério.
- Compatibilidade da telemetria com anonimização/agregação exigidas: resolver a
  rota do ID persistente e ambas as interfaces de transporte. Sem configuração
  pública comprovada ou evidência suficiente, manter bloqueado, sem reflexão,
  remoção de dependências ou troca de motor.
- Cleanup/fases/tentativas e respostas tardias corretos; invariantes de conta,
  consentimento, confirmação anterior a escrita/fila, legado e rules em
  homologação identificada antes de qualquer integração clínica.
- TASK-04/06: localidade/compatibilidade e parâmetros medidos/limites registrados;
  TASK-07: captura segura; TASK-18: logs/disco/rede/contas/legado. A inspeção desta
  demo não conclui essas tarefas nem demonstra acurácia/corpus de medidores reais.

Defeito confirmado no caminho próprio será corrigido com regressão antes de
nova rodada. Persistência/envio clínico observado reprova; privacidade não
verificável mantém o gate fechado. Não houve evidência nesta revisão que
justifique alterar o fluxo de produção ou substituir ML Kit/Tesseract.


## Verificações executadas pelo Codex nesta entrega

| Ferramenta / cenário | Observação | Alcance |
|---|---|---|
| PowerShell 7.5.4/Linux, checks do coletor | Aprovados: comparação, acréscimo/remoção/mtime, nomes privados, entradas inválidas/duplicadas, case-sensitive, descarte/IDs e fronteira ADB simulada | Não executa Windows/ADB/Samsung; fixtures temporárias só no host, descartadas |
| Lint e TypeScript raiz/demo | Aprovados | Sem alteração de código funcional do app |
| Jest --ci --runInBand | 742 testes/67 suítes aprovados; avisos preexistentes de act | SDK/câmera/contas simulados; não são inspeção de privacidade física |
| Java/JDK 21.0.12.1, FrameBytesTest | 8 checks de buffers e 11 de dimensões aprovados | Bytes sintéticos, sem CameraX/ML Kit/SO |
| Expo autolinking Android, raiz/demo; react-native-config da demo | Captura presente só na demo; voz ausente; Firebase/Google/push excluídos na configuração RN da demo | Resolução de fontes; não manifesto final ou APK |
| Manifestos/template/locks e caminho próprio | Revisão estática registrada acima | Não inspeciona o manifesto mesclado/instalado |

Os checks do coletor também integram o job App do CI (pwsh do runner Ubuntu),
sem dispositivo ou instalação no Samsung. Functions/rules não alteradas; sem nova tentativa local de Rules nesta etapa:
o download do JAR 1.21.0 já falhou no mesmo ambiente na entrega #74. O CI verde
da #74 é evidência daquela entrega, não desta. Checks remotos deste novo PR
serão conferidos separadamente. Sem horas/despesas/saldos informados, produção,
compilação Kotlin/APK, merge, deploy ou habilitação clínica.
