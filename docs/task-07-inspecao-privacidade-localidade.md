# TASK-04/06/07/18 — inspeção de privacidade e localidade Android

Preparado em 24/11/2026 sobre staging
`81af92f4d3763e1e89f910e01c296decf83b5778`, branch
`docs/task-07-inspecao-privacidade`. Diagnóstico **parcial e habilitação clínica
bloqueada**. Rodada I/S/B/C/R/E/O/Q executada e relatada pelo autor, com
evidências e limites abaixo; sem inspeção direta do Samsung pelo Codex.
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
| Coletor desta etapa | inventario-1, PowerShell 7.5.4/Linux nos checks | Windows PowerShell 5.1/ADB/Samsung executados pelo autor no grupo I; ver retorno |

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

## Retorno P0 — identidade e estado inicial recebidos

Registro em 24/11/2026, com base no relato e terminal do autor. Data/hora da
execução não informadas; sem acesso direto ao Windows/Samsung. Omitidos caminho
pessoal do ADB/perfil e qualquer dado além dos metadados necessários.

| Item | Evidência recebida | Alcance |
|---|---|---|
| Cópia que alimenta Metro | aferi-task07-talkback; HEAD f057283876ea2126b485abd762e2886012b4c7ca; status sem saída | Limpa no momento da consulta; branch sem saída é compatível com HEAD destacado, não erro |
| ADB/USB | 1.0.41; pacote 37.0.1-15733141; get-state device | Executável localizado e comunicação com alvo USB disponível |
| Aparelho | SM-S731B; Android 17; API 37 | Reconferidos por getprop nesta devolução |
| Pacote/UID | com.ramonmenz.afericapturetest; 10033 | Pacote e UID reconfirmados; não são observação de tráfego |
| Bundle no sandbox | SHA-256 860174567097a3b5501ecf158c8aef2a32edeb44b112ac2b3f94e68e0ca81388 | Coincide com histórico TalkBack; não prova sozinho código em execução nem identidade do APK |
| Metro/demo | Metro aberto; demo estava fechada e foi aberta para consultar marcadores | Estado relatado; não houve nova captura informada |
| UI | captura-5; Nativo nao-carregado; idle; associacao-1 ausente | Compatível com fonte f057283 e módulo ainda não carregado por gesto; não iniciar só para mudar marcador |
| Descarte/câmera | Sem revisão antiga; câmera desligada; Fast Refresh desligado; sem impedimento percebido | Estado inicial relatado, sem inspeção de RAM/SDK/SO |
| Reinstalação | Autor não sabe se houve reinstalação desde a última rodada | Identidade atual do APK não reconfirmada; não assumir a do APK histórico |
| Ferramenta de rede | Autor não sabe se existe ferramenta compatível | UID/destinos seguem NE; não instalar monitor nem ampliar dumps por tentativa |

**Análise:** P0 suficiente para iniciar prova de capacidade do coletor e controle
idle, sem câmera/OCR, mudança de JS/APK ou ajuste de rede. Não aprova privacidade,
localidade, manifesto instalado ou habilitação. M0, identidade atual do APK e
observação por UID/destinos continuam pendentes. Não repetir P0 inteiro por rotina.

Conferência estática f057283 → staging 81af92f: sem diferenças no módulo nativo
foto, useCandidateReview.ts e photo-android.native.ts. Hook, coordenador e tela
têm diferenças do diagnóstico associacao-1; não tratar os dois JS como idênticos.
O primeiro controle não inicia modalidade e não exige esse diagnóstico.

### Procedimento do grupo I — executado, retorno abaixo

Preservar Metro e fonte f057283. Usar o PowerShell de comandos, não o terminal
ocupado pelo Metro. Preparar a worktree **só de ferramentas** conforme seção
seguinte, fixando `583f61fa4a444d944e31178829706313b1b86795` (inventario-1 já
validado no CI do PR #75). O novo commit documental do retorno não muda o coletor.
Se destino existir, parar e informar; não apagar/reutilizar sem verificar.

1. Conferir HEAD/status da worktree de ferramentas e versão do PowerShell;
   importar o módulo sem alterar política de execução. Nenhum npm/prebuild/APK.
2. Manter demo aberta em idle, sem câmera/revisão, e Metro aberto. Executar I0
   com New-AferiInventory. Se falhar, devolver só código/erro sanitizado e parar,
   sem executar find/stat manualmente, mudar permissões ou instalar ferramentas.
3. Se I0 funcionar, não tocar no celular/código, abrir Configurações, iniciar
   câmera, recarregar ou mudar rede. Aguardar cerca de 30 s e executar I1 e a
   comparação no mesmo PowerShell/módulo. Informar intervalo real ou aproximado.
4. Devolver HEAD/status da ferramenta, versão PowerShell, JSON de I0/I1/comparação,
   fases/marcadores, câmera/revisão/retomada, recarga/reinício/erro percebidos.
   Relatórios têm só categorias/contagens, sem paths ou conteúdo de arquivos.

Esperado: Tool inventario-1 nas saídas; nenhuma abertura de câmera, revisão ou
retomada. **Não existe quantidade esperada de arquivos nem delta zero obrigatório.**
Mudança de cache/bundle/eventos pode ocorrer sem OCR: registrar e analisar, sem
chamá-la de vazamento ou arquivo seguro por nome. Igualdade de tamanho/mtime não
prova igualdade de conteúdo nem ausência de temporários. O retorno deste grupo
está registrado abaixo; não repetir por rotina.

## Retorno I — coletor no Windows e controle idle

Registro em 24/11/2026; fonte: saídas do terminal e complemento do autor.
Data/hora da execução não informadas, sem inspeção direta pelo Codex. Caminhos
pessoais e progresso de download não foram arquivados como evidência de teste.

| Item | Resultado recebido | Alcance |
|---|---|---|
| Ferramentas | Worktree nova em 583f61fa4a444d944e31178829706313b1b86795; status sem saída | Fonte do coletor fixada, sem modificar cópia TalkBack do Metro |
| PowerShell | 5.1.26100.9818 | Importação e chamadas New/Compare bem-sucedidas no ambiente do autor |
| I0 | inventario-1, Id 1, Files 16 | Snapshot de arquivos regulares no escopo definido; sem leitura de conteúdo |
| I1 | inventario-1, Id 2, Files 16 | Mesmo total e mesmas categorias de I0 |
| Categorias em cada snapshot | bundle-dev-client-nome: 1; datatransport-nome: 2; outro-nao-classificado: 12; preferencia-mlkit-nome: 1 | Classificação por nome, sem determinar conteúdo, produtor ou causa |
| Comparação | BeforeFiles 16; AfterFiles 16; ChangedEntries 0; Changes vazio | Sem adição/remoção ou mudança de tamanho/mtime detectadas nas entradas comparadas |
| Espera | Start-Sleep -Seconds 30 concluído; autor informou sem pausa adicional | Espera programada, sem cronometragem integral entre snapshots; não atribuir exatamente 30 s a toda janela |
| UI e recursos | Demo permaneceu idle; câmera desligada; sem revisão/retomada automática, recarga, reinício ou erro | Complemento explícito do autor; não inferido dos JSONs |

**Grupo I positivo nesse alcance:** capacidade do coletor demonstrada em Windows
PowerShell 5.1/ADB/Samsung e estabilidade dos metadados entre snapshots sem
modalidade ativa. Não valida o coletor em todo Windows/firmware, captura/OCR,
liberação física de RAM, conteúdo dos 12 arquivos não classificados, anonimização,
logs, rede ou ausência de temporários entre consultas.

As duas entradas DataTransport não significam necessariamente dois bancos;
podem corresponder aos nomes de banco/auxiliares aceitos pela whitelist. Não
foram retornados caminhos individuais, lidos bancos/prefs nem capturados eventos.
Nenhum arquivo foi demonstrado seguro ou clínico por essa classificação. A
preferência com nome ML Kit e o bundle já estavam presentes em I0; o controle
não determina quando ou por que foram criados. Hash de mídia não foi solicitado.

### Procedimento S/B — executado, retorno abaixo

Sem atualização de código/APK, npm, reload, rede, reverse ou opções de segurança.
Usar fonte TalkBack f057283/Metro existentes e coletor inventario-1 em 583f61f.
Se algo mudou desde P0/I, informar antes da captura; APK atual segue sem identidade
reconfirmada e rede por UID/destino sem ferramenta qualificada. Habilitação
clínica permanece bloqueada. Este ensaio usa só o cartão sintético arquivado.

1. Conferir demo ativa, idle, sem revisão/câmera, captura-5 e Fast Refresh
   desligado. Não exigir associacao-1. No PowerShell das ferramentas, executar
   S0 e imprimir seu JSON. Se coletor falhar, parar antes de iniciar a câmera.
2. Iniciar câmera **uma vez**. Esperado: Nativo preview-1, ready e preview visível.
   Se diálogo de permissão, erro, marcador diferente ou câmera/preview anormais,
   não capturar nem repetir: encerrar com segurança e retornar impedimento.
3. Enquadrar somente cartão SYS 120 / DIA 80 / PUL 72, sem dados pessoais em volta,
   e Capturar e reconhecer uma vez. Esperado: revisão/campos correspondem ao
   cartão, câmera/preview encerrados. Não editar/confirmar. Sem revisão ou câmera
   presa, parar; não preencher campos para contornar OCR nem repetir até acertar.
4. Com revisão ainda ativa e câmera encerrada, executar S1 e comparar S0→S1.
   Se comando falhar, cancelar a revisão para descarte, não fazer B; devolver erro.
5. Somente se S terminou normalmente: manter a mesma revisão, usar Home uma vez
   e retornar por Recentes, sem Iniciar/reload. Esperado: cancelled, câmera
   desligada, campos antigos ausentes e nenhuma retomada automática. Observar
   aproximadamente 5 s sem toque; informar janela efetiva/aproximada.
6. Executar B1 e comparar S1→B1. S1 faz o papel de B0: não há captura adicional.
   Se campos/câmera permanecerem indevidamente, cancelar/sair para segurança e
   parar; registrar o comportamento anterior à correção manual, sem aprovar B.

Comandos, **intercalados com as ações acima**, não como bloco para rodar de uma vez:

```powershell
$aferiS0 = New-AferiInventory -AdbPath $aferiAdb
$aferiS0 | ConvertTo-Json -Depth 4
# Depois de uma captura: revisão ativa, câmera/preview encerrados.
$aferiS1 = New-AferiInventory -AdbPath $aferiAdb
$aferiS1 | ConvertTo-Json -Depth 4
Compare-AferiInventory -Before $aferiS0.Id -After $aferiS1.Id | ConvertTo-Json -Depth 5
# Depois de Home/Recentes e observação sem novo início.
$aferiB1 = New-AferiInventory -AdbPath $aferiAdb
$aferiB1 | ConvertTo-Json -Depth 4
Compare-AferiInventory -Before $aferiS1.Id -After $aferiB1.Id | ConvertTo-Json -Depth 5
```

Manter mesmo módulo/PowerShell entre S0/S1/B1; não reimportar/limpar inventários
até terminar ambas as comparações. IDs não precisam começar em 1 nem nomes de
categorias/contagens precisam continuar iguais aos de I. Alterações são evidência
a analisar; zero mudanças também não aprova privacidade. Não repetir só para
obter resultado igual a I ou trocar classificações desconhecidas por suposição.

Devolver os três JSONs e duas comparações; fase/Nativo/preview antes da captura,
correspondência com o cartão sim/não, revisão/fase após OCR e câmera encerrada;
Home/retorno, fase/campos/câmera/retomada, intervalo e erro/recarga/reinício.
Sem screenshot, OCR bruto, conteúdo de arquivo ou valores reais. As regras de
parada obrigatória continuam. Retorno e esclarecimento recebidos abaixo;
não repetir S/B por rotina.

## Retorno S/B — captura, mudança de metadados e descarte

Registro em 24/11/2026, baseado no relato e JSONs do autor. Data/hora da execução
não informadas; sem acesso direto ao aparelho. Não houve nova identidade de
fonte/APK/bundle transcrita nessa devolução; a condução manteve versões P0/I,
sem atribuir hash atual de APK ou nova confirmação criptográfica por cenário.

| Observação | Resultado recebido | Alcance |
|---|---|---|
| S antes de Capturar | preview-1, ready, preview visível | Marcador/fase observados pelo autor |
| S reconhecimento | Revisão obtida, campos correspondem ao cartão sintético; câmera/preview encerrados; sem erro/recarga/reinício percebidos | Positivo nesse percurso; sem valores reais, confirmação ou avaliação de medidores |
| S0/S1 | inventario-1, IDs 3/4; 16 arquivos em cada | Categorias em ambos: 1 bundle, 2 nomes DataTransport, 12 não classificados, 1 preferência com nome ML Kit |
| S0→S1 | ChangedEntries 1; datatransport-nome, size-or-mtime, Files 1 | Uma entrada existente mudou de tamanho e/ou mtime; relatório não separa qual dos dois, arquivo específico ou conteúdo |
| B retorno | cancelled, campos antigos ausentes, câmera/preview desligados; aproximadamente 5 s sem toque; sem erro/recarga/reinício percebidos | Descarte/retorno observados pelo autor |
| S1/B1 | IDs 4/5, 16 arquivos em cada, mesmas categorias; ChangedEntries 0, Changes vazio | Nenhuma adição/remoção ou mudança de tamanho/mtime detectada nesse par |

**Correção rastreável da resposta de B:** o autor inicialmente marcou sim em
Houve retomada automática?, em tensão com os demais campos. Novas capturas foram
pausadas e foi solicitado esclarecimento sem repetir o teste. O autor confirmou:
**Não houve retomada; marquei sim por engano.** B é positivo no alcance corrigido;
a pausa foi encerrada sem reteste, defeito confirmado ou alteração funcional.

A mudança de uma entrada classificada por nome como DataTransport **não prova**
que imagem, OCR ou valores clínicos foram persistidos, nem que houve envio de
rede. Também não demonstra que o conteúdo seja apenas técnico/anônimo. O par
S0→S1 inclui abrir câmera/criar reconhecedor/inferir/liberar e atividade do Dev
Client/SO: não atribuir a mudança a uma operação específica. É compatível com
rotas técnicas identificadas na auditoria como hipótese, sem causa comprovada.
Comparação estável de I ou B não transforma essa diferença em medição causal.
Não ler/copiar/hashear conteúdo de bancos ou ampliar logs para investigá-la.

S/B positivos para leitura sintética e descarte no alcance relatado; metadados
com a diferença acima registrada. Privacidade, rede/UID/destino, arquivos
transitórios/conteúdo e SDK/SO continuam sem homologação. Não repetir para tentar
obter delta zero, não limpar dados, desativar telemetria por reflexão ou trocar SDK.

### Procedimento C/R — executado, retorno abaixo

Mesma demo/Metro/fonte TalkBack e coletor inventario-1 de ferramentas em 583f61f.
Sem Capturar/OCR, confirmação, alteração de rede/código/APK ou atualização de
worktree. Se houve mudança de versão ou impedimento desde S/B, informar antes.

1. Partir de cancelled/idle, câmera desligada e sem revisão. C0 no PowerShell.
   Um Iniciar; conferir ready/preview-1/preview. Não Capturar. Cancelar captura
   uma vez; câmera/preview devem encerrar. Observar aproximadamente 5 s sem toque,
   sem revisão/retomada. C1 e comparação C0→C1. Se falhar coletor/permissão/preview
   ou cleanup, parar; não repetir abertura, não fazer R nem contornar blocked.
2. R somente se C terminou saudável, câmera desligada, candidatos ausentes e
   nenhuma retomada: usar C1 como R0 e executar force-stop **só da demo**:

```powershell
& $aferiAdb -d shell am force-stop com.ramonmenz.afericapturetest
```

3. Abrir uma vez o ícone do cliente Aferi — captura em avaliação, com o Metro
   anterior aberto. Não tocar em Iniciar/Capturar/reload. Se não identificar o
   ícone ou ficar no launcher/menu sem carregar a demo normalmente, parar e
   informar esse destino/impedimento; não escolher bundles por tentativa.
4. Na demo carregada, observar aproximadamente 5 s. Esperado: nenhum candidato,
   câmera ou retomada; idle/nao-carregado são compatíveis com inicialização nova.
   Registrar fase/marcador efetivos, inclusive recarga/carregamento percebido:
   force-stop torna este reinício deliberado, não um erro espontâneo. R1 e
   comparação C1→R1. Não presumir sobrescrita física da RAM/SDK por esse comando.

Comandos intercalados com as ações, mantendo o mesmo módulo entre as coletas:

```powershell
$aferiC0 = New-AferiInventory -AdbPath $aferiAdb
$aferiC0 | ConvertTo-Json -Depth 4
# Iniciar uma vez, esperar ready, cancelar e observar; sem Capturar.
$aferiC1 = New-AferiInventory -AdbPath $aferiAdb
$aferiC1 | ConvertTo-Json -Depth 4
Compare-AferiInventory -Before $aferiC0.Id -After $aferiC1.Id | ConvertTo-Json -Depth 5
# Só após C saudável: force-stop, abrir ícone uma vez e observar a demo.
$aferiR1 = New-AferiInventory -AdbPath $aferiAdb
$aferiR1 | ConvertTo-Json -Depth 4
Compare-AferiInventory -Before $aferiC1.Id -After $aferiR1.Id | ConvertTo-Json -Depth 5
```

Não usar force-stop como bypass de falha de cleanup; neste grupo ele é cenário
planejado somente após encerramento normal. Sem clear-data/cache, reinstalação,
root, banco, imagem, logs completos ou ferramentas de rede. Nenhum delta/total é
preestabelecido; carregamento/launcher podem alterar metadados. Retornar três
JSONs/duas comparações e fases/Nativo/preview/câmera/campos/retomada, intervalos,
erros e forma de retorno. Retorno recebido abaixo; não repetir por rotina.

## Retorno C/R — cancelamento, reinício e metadados alterados

Registro em 24/11/2026; fonte: relato/terminal do autor, sem acesso direto ao
Windows/Samsung. Data/hora da execução não informadas. A importação do módulo
foi repetida antes de C0: os IDs reiniciaram em 1, comportamento compatível com
reinicialização do estado em memória. Não comparar esses IDs aos de sessões
anteriores. O ^C transcrito depois da importação não demonstra interrupção de
inventário ou parada do Metro; as coletas seguintes retornaram normalmente.

| Item | Resultado recebido | Alcance |
|---|---|---|
| C preview/cancelamento | preview-1/ready e preview visível; após Cancelar, cancelled e câmera/preview encerrados | Positivo no cenário sem Capturar/OCR solicitado, conforme roteiro |
| C observação | Aproximadamente 5 s sem novos toques; sem revisão/retomada, erro/recarga/reinício percebidos | Relato, sem medição instrumental de recursos internos |
| C0/C1 | inventario-1, IDs 1/2, 16 entradas em cada | Mesmas categorias: 1 bundle, 2 nomes DataTransport, 12 não classificados, 1 preferência com nome ML Kit |
| C0→C1 | ChangedEntries 1; datatransport-nome, size-or-mtime, Files 1 | Entrada existente com tamanho e/ou mtime alterados; conteúdo/causa/envio não determinados |
| R comando | am force-stop somente do pacote da demo; terminal sem erro transcrito; autor não percebeu erro | Exit code/PID não coletados; não inferir liberação física de RAM |
| R retorno | Autor abriu o ícone pela lista de apps; demo padrão de captura/revisão carregou; idle/Nativo não carregado, câmera desligada e campos ausentes | Retorno normal relatado, sem seleção repetida de bundles informada |
| R observação | Aproximadamente 5 s sem toque; sem abertura/retomada automática ou erro/impedimento percebido | Reinício deliberado não é crash espontâneo |
| R1 | Id 3, 16 entradas, mesmas categorias de C0/C1 | Snapshot posterior ao retorno descrito pelo autor |
| C1→R1 | ChangedEntries 2; bundle-dev-client-nome e outro-nao-classificado, size-or-mtime, 1 entrada por categoria | Sem adição/remoção detectada; não identifica qual metadado ou conteúdo mudou |

**C/R positivos no alcance relatado** para cancelamento/retorno sem candidatos
ou câmera automáticos. Não demonstram manifesto/APK efetivos, sobrescrita de RAM,
conteúdo dos arquivos, ausência de temporários/logs/tráfego ou conformidade SDK/SO.
Não houve nova identidade de fonte/APK/bundle transcrita nesta devolução.

A categoria DataTransport mudou também numa janela sem Capturar/OCR solicitado.
Isso impede atribuir exclusivamente ao reconhecimento a diferença de S0→S1.
Criar reconhecedor/preview, eventos adiados de etapas anteriores ou outra
atividade são hipóteses, não causas comprovadas. Não presumir que seja a mesma
entrada individual de S, pois o relatório agrupa nomes sem expor paths. Não ler
bancos, excluir eventos ou repetir capturas para obter delta zero.

Após R, mudança no bundle é compatível com carregamento do Dev Client como
hipótese; não comprova bytes iguais nem identifica novo código. A outra entrada
continua não classificada, sem chamá-la de clínica ou segura. Conferir somente
o hash do JS conhecido antes da próxima tentativa de modalidade; não hashear
arquivos desconhecidos/bancos. Inventários iguais de I/B não eliminam essas lacunas.

### Procedimento de identidade pós-R — retorno recebido abaixo

Preservar fonte TalkBack/Metro e ferramenta 583f61f. Não repetir C/R nem fazer
reload/reinstalação, alterar rede/permissões ou iniciar câmera. No PowerShell de
comandos, consultar a fonte e o único hash permitido:

```powershell
git -C C:\dev\aferi-task07-talkback rev-parse HEAD
git -C C:\dev\aferi-task07-talkback status --short
& $aferiAdb -d shell run-as com.ramonmenz.afericapturetest sha256sum files/DevLauncherApp-BridgelessReactNativeDevBundle.js
```

Referência P0: fonte f057283876ea2126b485abd762e2886012b4c7ca limpa e bundle
860174567097a3b5501ecf158c8aef2a32edeb44b112ac2b3f94e68e0ca81388. Não exigir
coincidência por tentativa: hash diferente ou arquivo ausente exige analisar o
carregamento/identidade, não recarregar até coincidir. Hash igual limita a
conclusão à igualdade desse arquivo nesses momentos, sem provar toda execução.

Devolver HEAD/status/hash ou impedimento e informar se Metro permaneceu no
terminal/pasta TalkBack, se houve reload/atualização/reinstalação/mudança de rede
durante R, e fase/Nativo/câmera atuais. Não enviar paths pessoais, imagem,
conteúdo de arquivo ou logs completos. E (erro seguro de permissão) só será
conduzido depois dessa análise; por enquanto, nenhuma alteração de permissão.
O/Q, M0, identidade atual do APK, UID/destinos e privacidade continuam pendentes.

## Retorno da identidade pós-R — fonte limpa e hash coincidente

Registro em 24/11/2026, conforme devolução do autor, sem data/hora de execução
informadas ou acesso direto ao Windows/Samsung. HEAD TalkBack
f057283876ea2126b485abd762e2886012b4c7ca e git status sem saída reconfirmados.
Hash do bundle consultado:
`860174567097a3b5501ecf158c8aef2a32edeb44b112ac2b3f94e68e0ca81388`, igual ao P0.
Metro permaneceu aberto na cópia TalkBack, sem mudança de rede informada; estado
atual idle/nao-carregado, câmera desligada.

Sobre reload/atualização/reinstalação, o autor informou que, antes de começar
esta fase de teste, fechou o app e o abriu novamente pressionando a no Metro.
Registrar como abertura manual/carregamento, sem converter em falha ou retomada
automática. O momento em relação a C0/C1/R1 não foi especificado; não afirmar
que toda a janela ficou sem recarregamento ou atribuir a essa ação a mudança
de metadados. O relato anterior de R descreveu retorno pelo ícone; os dois
registros são preservados sem inventar uma ordem mais precisa.

**Conclusão permitida:** os bytes do arquivo bundle nos momentos P0 e desta
consulta pós-R coincidem pelo SHA-256. Isso não comprova o código em execução,
identidade do APK, ausência de escrita ou conteúdo/causa da entrada desconhecida.
C1/R1 não tiveram hashes: não afirmar que sua diferença foi apenas mtime nem
que os bytes permaneceram iguais em todos os instantes. Não repetir R ou tentar
alterar o hash. Identidade atual suficiente para preparar nova baseline de E,
sem aprovação de privacidade ou encerramento de tarefas.

### Procedimento E — executado, retorno abaixo

Mesmo Metro TalkBack/fonte f057283 e ferramentas inventario-1/583f61f; sem npm,
update, novo APK, rede/reverse alterados ou indução de erro do motor/cleanup.
A permissão será alterada **somente no cliente de avaliação**, nunca no produto
principal. Este cenário verifica recusa/permissão, não falhas internas de OCR.

1. Partir de idle/cancelled, sem câmera/revisão, Fast Refresh desligado. Nas
   Informações do app Aferi — captura em avaliação (com.ramonmenz.afericapturetest),
   anotar a opção atual de Câmera e selecionar Não permitir. Se não identificar o
   cliente com segurança, parar. Não limpar dados/cache, alterar outras permissões
   ou configurações de outros apps.
2. Voltar à demo por Recentes. Revogar permissão pode encerrar/recriar o processo;
   registrar se percebeu isso. Se necessário para abri-la, usar o ícone uma vez;
   se ficar no launcher, a no terminal do Metro TalkBack uma única vez é permitido
   como preparação, anotando-o. Sem reload/seleção repetida de bundles. Se não
   carregar a demo, parar e retornar impedimento, sem Iniciar.
3. Antes de E0, conferir captura-5, idle/cancelled, câmera desligada e campos
   ausentes. Não exigir associacao-1 ou preview-1 antes de gesto. Obter novamente
   somente o hash do bundle conhecido, pois a preparação pode carregar JS. Se
   diferente da referência 86017456… ou houver erro, parar sem Iniciar; não
   recarregar até coincidir. Alterações de preparação ficam fora do par E0/E1.
4. E0 pelo coletor e seu JSON. Se falhar, parar antes de gesto. Tocar em Iniciar
   câmera Android **uma vez**. Se houver diálogo, escolher Não permitir/Negar
   uma vez; se o SO recusar sem diálogo, não insistir. Não conceder para testar
   nem iniciar novamente. Se houver orientação para Configurações, apenas anotar.
5. Esperado: permissão negada ou cancelled se o modal/background cancelar a
   tentativa, sem câmera/preview/revisão/OCR ou retry automático. Registrar fase,
   mensagem/código fixos e diálogo; não exigir failed se cancelled foi observado.
   Câmera aberta inesperadamente exige cancelar/sair e parar, sem Capturar.
6. Após encerramento, observar aproximadamente 5 s sem novos toques; E1 e
   comparação E0→E1. Manter permissão negada ao final: restauração será preparada
   antes da próxima captura, fora deste par. Nenhum delta/total esperado fixado.

Comandos intercalados com a preparação/gesto descritos:

```powershell
# Após voltar das Configurações, antes de E0 e sem iniciar câmera.
& $aferiAdb -d shell run-as com.ramonmenz.afericapturetest sha256sum files/DevLauncherApp-BridgelessReactNativeDevBundle.js
$aferiE0 = New-AferiInventory -AdbPath $aferiAdb
$aferiE0 | ConvertTo-Json -Depth 4
# Um Iniciar; negar se houver diálogo; aguardar encerramento e observar.
$aferiE1 = New-AferiInventory -AdbPath $aferiAdb
$aferiE1 | ConvertTo-Json -Depth 4
Compare-AferiInventory -Before $aferiE0.Id -After $aferiE1.Id | ConvertTo-Json -Depth 5
```

Mesmo módulo/PowerShell entre E0/E1. Se terminal foi fechado, reimportar apenas
antes de E0; sem atualizar ferramenta ou perder o primeiro snapshot no meio.
Devolver preparação (permissão antes/depois, retorno/reinício/a se usado), hash,
dois JSONs/comparação, fase antes/depois, diálogo/opção/mensagem fixa, câmera/
preview/revisão/retry, intervalo e erro/recarga/reinício. Não screenshot/tela de
permissão, logs completos, dados de conta ou mídia. Retorno de E recebido abaixo;
O/Q, M0, APK atual e UID/destinos continuam pendentes.

## Retorno E — negativa de permissão e mudança não classificada

Registro em 24/11/2026, conforme relato/terminal do autor. Data/hora de execução
não informadas; sem acesso direto ao aparelho. Ferramenta inventario-1 na cópia
já preparada; HEAD/status da ferramenta não repetidos nesta devolução.

| Item | Observação recebida | Alcance |
|---|---|---|
| Preparação | Câmera passou de Durante o uso do app para Não permitir; retorno por Recentes, sem a | Alteração somente da demo conforme condução; não houve nova captura relatada |
| Carregamento da preparação | Tela branca por aproximadamente 1 s e depois tela normal | Não comprova, sozinha, morte de processo, recriação de Activity, crash ou sua causa |
| Bundle antes de E0 | SHA-256 860174567097a3b5501ecf158c8aef2a32edeb44b112ac2b3f94e68e0ca81388 | Coincide com referências; preparação ficou antes do par de inventários |
| Estado anterior ao gesto | idle/nao-carregado | Câmera ainda não iniciada |
| Tentativa | Diálogo apareceu após um Iniciar; autor selecionou Não permitir | Recusa explícita no contexto da ação |
| Encerramento | cancelled; Captura cancelada; resultado descartado.; câmera/preview desligados, sem revisão ou nova tentativa | Positivo para recusa/cancelamento no alcance observado, não erro de motor provocado |
| Janela | Aproximadamente 5 s sem toque; sem comportamento/erro/recarga/reinício percebido após E0 | Relato, sem instrumentação interna do SDK/SO |
| E0/E1 | IDs 4/5, 16 entradas em cada | Mesmas categorias: 1 bundle, 2 nomes DataTransport, 12 não classificados, 1 preferência com nome ML Kit |
| Comparação | ChangedEntries 1; outro-nao-classificado, size-or-mtime, Files 1 | Uma entrada existente mudou tamanho e/ou mtime; sem adição/remoção detectada |

**E positivo para recusa segura no alcance relatado.** cancelled é compatível com
o cancelamento preservado durante modal/background, mas a sequência AppState não
foi instrumentada nesta resposta: não atribuir causalidade exclusiva ao diálogo.
Não exigir failed/permission-denied nem conceder para forçar outro resultado.

A mudança não classificada não identifica conteúdo clínico, arquivo seguro,
produtor, causa ou envio. Também não comprova que seja a mesma entrada não
classificada de R. A tela branca/carregamento ocorreram antes da baseline E0;
não atribuir a eles automaticamente a diferença E0→E1. Não ler arquivos ou
ampliar logs, limpar cache, repetir E até delta zero ou tratar o caso como falha
confirmada da implementação. Permissão ficou negada ao término conforme roteiro.

### Preparação de O/Q — retorno inicial recebido abaixo

Somente preparação, sem Capturar/Iniciar ou desligar rede ainda. Preservar Metro
TalkBack/fonte f057283 e ferramenta 583f61f, sem atualização de código/APK.

1. Na Informação do app do cliente Aferi — captura em avaliação, restaurar
   Câmera para Durante o uso do app, opção anterior informada. Não alterar outros
   apps/permissões, limpar dados/cache ou conceder para retomar pedido pendente.
   Se o cliente não for identificável ou a opção não existir, parar e informar.
2. Retornar por Recentes; se necessário, ícone uma vez ou a uma vez no Metro
   TalkBack para carregar o JS. Registrar tela branca/reinício/carregamento se
   percebidos, sem inferir causa. Esperado idle/cancelled, câmera desligada e sem
   candidatos/retomada; não Iniciar só para carregar módulo. Conferir Fast Refresh.
3. Obter só hash do bundle conhecido, sem recarregar até coincidir se divergir.
4. Consultar os mapeamentos reverse no host, retendo saída bruta em memória e
   exibindo **só contagens**. Não remover/criar mapeamento nesta preparação:

```powershell
$aferiReversePreparacao = @(& $aferiAdb -d reverse --list 2>&1)
if ($LASTEXITCODE -ne 0) { throw 'reverse-unavailable' }
$aferiReverseLinhas = @($aferiReversePreparacao | Where-Object { $_.ToString().Trim().Length -gt 0 })
$aferiReverse8097 = @($aferiReverseLinhas | Where-Object { $_ -is [string] -and $_ -match '^\S+\s+tcp:8097\s+tcp:8097\s*$' })
[pscustomobject]@{
    Reverse8097Conhecido = $aferiReverse8097.Count
    OutrasLinhas = $aferiReverseLinhas.Count - $aferiReverse8097.Count
} | ConvertTo-Json
```

Uma linha no formato conhecido prova o mapeamento naquele momento, não ausência
de tráfego externo. Zero linhas conhecidas é resultado válido a analisar; não
criar rota por suposição. Outras linhas/duplicatas/formato desconhecido impedem
alterar reverse até análise. Não devolver variáveis brutas, serial ou destinos
privados; erro de comando/permissão gera impedimento sem dump alternativo.

5. Informar apenas estado atual ligado/desligado/desconhecido de Wi-Fi/dados
   móveis e se há internet por USB, Bluetooth, Ethernet ou VPN. Não enviar SSID,
   IP, nome de VPN/operadora/conta ou screenshot. Se precisar abrir Configurações,
   fazê-lo só com câmera desligada e voltar sem novo gesto. Não alterar conexões,
   VPN, políticas corporativas ou instalar monitor para obter a resposta.

Devolver permissão restaurada, forma de retorno, fase/Nativo/câmera/campos,
Fast Refresh, hash, JSON de contagens reverse, conexões e reinício/erro percebidos.
Só depois conduzir O (offline) e Q (reconexão), com remoção/restauração dirigida
apenas do mapeamento reconhecido, se aplicável. Rede por UID/destinos segue NE:
contagens de reverse e teste offline não são monitor de rede ou aceite de
telemetria. Nenhum novo inventário ou captura solicitado nesta preparação.

## Retorno da preparação offline — permissão e reverse conhecidos

Registro em 24/11/2026, conforme resumo do autor; sem data/hora de execução
informadas ou acesso direto ao telefone. Fonte/ferramenta mantidas pela condução;
HEAD/status não foram retranscritos nesta devolução.

| Item | Retorno recebido | Alcance |
|---|---|---|
| Permissão | Restaurada | Condução pediu a opção anterior Durante o uso do app; não iniciou captura |
| Retorno à demo | Recentes, sem a; sem tela branca/carregamento/reinício percebido | Estado observado pelo autor |
| UI | cancelled/preview-1; câmera desligada, campos antigos ausentes, sem retomada; Fast Refresh desligado | preview-1 identifica módulo carregado, não câmera em uso |
| Bundle | SHA-256 860174567097a3b5501ecf158c8aef2a32edeb44b112ac2b3f94e68e0ca81388 | Coincide com referências, sem provar todo runtime/APK |
| Reverse | Reverse8097Conhecido 1, OutrasLinhas 0 | Um tcp:8097 → tcp:8097 no formato esperado; sem saída bruta/serial publicados |
| Conexões | Wi-Fi e dados móveis ligados; VPN não | Estados do telefone informados, sem medição de tráfego |
| Demais caminhos | Internet por USB e Bluetooth/Ethernet desconhecida; PC usa Ethernet | Conexão do PC não identifica conectividade do telefone |
| Impedimentos percebidos | Nenhum | Não equivale a eliminação das lacunas de rede |

O Ethernet do PC, sozinho, não significa internet no telefone. O reverse permite
que conexão do telefone a loopback:8097 alcance o Metro no PC; não é uma rota
genérica de internet nem prova de tráfego exclusivo de desenvolvimento. Rotas
por USB, adaptadores, VPN ou software de compartilhamento precisam de condição
registrada separadamente. Não fechar Metro, desconectar USB, mudar modo USB ou
instalar monitor para inferir isso.

**Esclarecimento solicitado antes de desligar redes:** nas Configurações do
Samsung → Conexões → Roteador Wi-Fi e Ancoragem (ou equivalente), consultar
somente estados de Ancoragem USB e Ancoragem Bluetooth, sem alterar. Informar
se telefone está conectado diretamente ao PC por cabo USB, sem hub/adaptador
Ethernet ligado ao telefone. Não pedir screenshot, nomes de rede ou identificadores.

Ancoragem do telefone é normalmente compartilhamento do telefone para outro
dispositivo; estado desligado, por si só, também não prova ausência universal de
rota inversa ou software de rede. O objetivo é delimitar a montagem física e
as conexões declaradas, sem chamar o ensaio de isolamento absoluto. Se não
conseguir verificar, registrar desconhecido, sem supor desligado.

Na devolução inicial O/Q ainda não tinham execução e aguardavam os estados
adicionais. O esclarecimento e a condução posterior estão abaixo, sem resultados
novos presumidos para desligamento de redes, reverse ou captura. A condição original já registrada a restaurar
após O será Wi-Fi ligado, dados móveis ligados e reverse 8097 conhecido; não
alterar mapeamentos desconhecidos nem configurações de outros apps. UID/destinos,
manifesto/APK atual e privacidade integral continuam pendentes.

### Esclarecimento das conexões e condução O/Q

Autor confirmou Ancoragem USB e Ancoragem Bluetooth desligadas, telefone ligado
diretamente ao PC por cabo USB, sem hub/adaptador Ethernet no telefone. Esse
esclarecimento resolve a montagem declarada; não certifica isolamento universal
ou tráfego zero. Não exige desligar Ethernet do PC ou depuração USB.

**Procedimento O/Q executado nas condições declaradas abaixo; retorno posterior:**
fonte/Metro TalkBack e coletor inventario-1 já carregados, Fast Refresh desligado,
sem novo APK/código, somente cartão sintético e nenhuma confirmação clínica.
O0→O1 abrange uma captura e cancelamento da revisão; O1 também é Q0, evitando
coleta redundante. Q observa reconexão sem captura adicional.

1. No PowerShell, definir a consulta sanitizada abaixo e conferir 1/0 antes de
   alterar redes. Se saída diferente, parar; não sobrescrever rotas desconhecidas.
2. Antes de alterar conexões, anotar se o rádio Bluetooth do telefone está ligado
   ou desligado (não informado ainda). Com câmera desligada, desligar Wi-Fi, dados
   móveis e temporariamente o rádio Bluetooth, se ligado, para retirar também
   eventual caminho cliente por Bluetooth; ancoragem desligada não o exclui.
   Não alterar cabo USB, depuração, modo USB, Ethernet do
   PC, VPN ou ancoragem. Voltar à demo com reverse ainda presente para carregar
   JS se o Android o exigir; registrar recarga/reinício. Se não ficar pronta,
   não capturar: restaurar redes originais e relatar impedimento.
3. Conferir câmera desligada, sem revisão, fase idle/cancelled e hash conhecido
   86017456…. Hash diferente é impedimento de identidade, sem reload até coincidir.
4. Remover somente tcp:8097 e conferir resumo 0/0. Registrar sucesso/erro e flag
   de remoção. Não usar --remove-all. Se falhar/saída inesperada, parar captura.
5. Sem reload ou retorno às Configurações, O0 e JSON. Um Iniciar até ready/
   preview-1, uma captura do cartão 120/80/72. Esperado revisão correspondente,
   câmera/preview encerrados; anotar. Cancelar revisão e observar cerca de 5 s,
   sem campos/retomada. O1 e comparação O0→O1. Sem editar/confirmar, repetir ou
   preencher campos para contornar. Qualquer falha de recurso encerra ensaios.
6. O1 é Q0, ainda sem redes/Metro conectados. Sem câmera ativa, restaurar o reverse
   removido, Wi-Fi/dados móveis originalmente ligados e o rádio Bluetooth somente
   se estava ligado antes da preparação. Não criar outras
   rotas. Conferir resumo reverse 1/0. A ida às Configurações ocorre após cancelar.
7. Voltar à demo sem Iniciar/Capturar/reload e observar cerca de 30 s, registrando
   espera programada e pausas extras sem atribuir precisão ao intervalo total.
   Q1 e comparação O1→Q1; informar fase/campos/câmera/retomada, recarga/carregamento
   e erro percebidos. Sem destino/payload ou monitor qualificado, rede fica NE.

Consulta somente de metadados do reverse, sem saída bruta/serial:

```powershell
function Get-AferiReverseResumo {
    $aferiRaw = @(& $aferiAdb -d reverse --list 2>&1)
    if ($LASTEXITCODE -ne 0) { throw 'reverse-unavailable' }
    $aferiLinhas = @($aferiRaw | Where-Object { $_.ToString().Trim().Length -gt 0 })
    $aferiAlvo = @($aferiLinhas | Where-Object { $_ -is [string] -and $_ -match '^\S+\s+tcp:8097\s+tcp:8097\s*$' })
    [pscustomobject]@{
        Reverse8097Conhecido = $aferiAlvo.Count
        OutrasLinhas = $aferiLinhas.Count - $aferiAlvo.Count
    }
}
Get-AferiReverseResumo | ConvertTo-Json
```

Comandos intercalados com as ações, não um bloco a executar sem pausas:

```powershell
# Só após redes móveis/Wi-Fi desligados, demo pronta e hash conferido.
$aferiReverseRemovido = $false
& $aferiAdb -d reverse --remove tcp:8097
if ($LASTEXITCODE -eq 0) { $aferiReverseRemovido = $true } else { throw 'reverse-remove-failed' }
# Conferir 0/0 antes de O0.
Get-AferiReverseResumo | ConvertTo-Json
$aferiO0 = New-AferiInventory -AdbPath $aferiAdb
$aferiO0 | ConvertTo-Json -Depth 4
# Uma captura; revisão conferida, câmera encerrada; cancelar e observar.
$aferiO1 = New-AferiInventory -AdbPath $aferiAdb
$aferiO1 | ConvertTo-Json -Depth 4
Compare-AferiInventory -Before $aferiO0.Id -After $aferiO1.Id | ConvertTo-Json -Depth 5
# Após cancelar, restaurar apenas mapeamento removido e redes originais.
if ($aferiReverseRemovido) { & $aferiAdb -d reverse tcp:8097 tcp:8097 }
Get-AferiReverseResumo | ConvertTo-Json
# Restaurar Wi-Fi/dados e estado original do Bluetooth; voltar e observar.
Start-Sleep -Seconds 30
$aferiQ1 = New-AferiInventory -AdbPath $aferiAdb
$aferiQ1 | ConvertTo-Json -Depth 4
Compare-AferiInventory -Before $aferiO1.Id -After $aferiQ1.Id | ConvertTo-Json -Depth 5
```

O comentário condicional da flag não substitui verificar erro: se houver erro
na remoção, não marcar sucesso nem avançar para O0. Ao interromper após mudança
de conexões, restaurar Wi-Fi/dados e estado Bluetooth originais; restaurar somente o reverse cuja
remoção foi confirmada, sem contornar câmera presa/blocked por reload. Se a demo
ficar inacessível sem Metro, registrar indisponibilidade do cliente/JS e restaurar
conexões; não atribuir isso automaticamente ao OCR. Contagens de arquivos e
mudanças não têm resultado esperado fixo. Hash igual não homologa SDK/SO.

Devolver hash, três resumos reverse (antes/depois da remoção/depois da restauração),
três inventários e duas comparações; estado inicial do Bluetooth e conexões efetivamente desligadas/restauradas,
phase/Nativo/preview, correspondência com cartão, cancelamento, janelas e pausas,
recarga/reinício/erro e confirmação de câmera desligada. Não payload, screenshot,
logcat, banco, IP/SSID/serial ou conteúdo de arquivo. Retorno de O/Q abaixo;
privacidade, manifesto/APK e observação por UID/destinos seguem pendentes.

## Retorno O/Q — leitura desconectada e reconexão

Registro em 24/11/2026, conforme relato/terminal do autor, sem data/hora de
execução informadas ou acesso direto ao Samsung. Não houve novos HEAD/status
transcritos; a condução manteve TalkBack f057283 e coletor inventario-1/583f61f.

| Item | Observação recebida | Alcance |
|---|---|---|
| Condições | Bluetooth estava ligado e foi desligado; Wi-Fi/dados/Bluetooth permaneceram desligados em O | Estados relatados pelo autor; montagem USB direta/ancoragens desligadas/VPN não já informadas |
| Bundle pré-remoção | SHA-256 860174567097a3b5501ecf158c8aef2a32edeb44b112ac2b3f94e68e0ca81388 | Coincide com referências, sem prova universal de runtime/SDK |
| Reverse | Resumos 1/0 antes, 0/0 após remover, 1/0 após restaurar; sem erro percebido | Canal tcp:8097→tcp:8097 retirado/restaurado; não mede tráfego, destinos ou outras interfaces do SO |
| O captura | ready/preview-1/preview visível; revisão correspondente ao cartão sintético, câmera/preview encerrados | Reconhecimento funcionou na configuração declarada, sem canal Metro 8097 e sem conexões de rádio declaradas |
| O cancelamento | Campos descartados, sem retomada automática ou aviso Metro/erro/recarga/reinício percebido | Descarte positivo no alcance relatado |
| O0/O1 | IDs 6/7, 16 entradas em cada | Categorias: 1 bundle, 2 nomes DataTransport, 12 não classificados, 1 preferência com nome ML Kit |
| O0→O1 | ChangedEntries 1, datatransport-nome, size-or-mtime, Files 1 | Janela inclui captura/reconhecimento/cancelamento; sem adição/remoção detectada |
| Q reconexão | Reverse/Wi-Fi/dados/Bluetooth restaurados aos estados anteriores; cancelled, sem campos/câmera/retomada ou comportamento inesperado | Sem nova captura; retorno saudável relatado |
| Q espera | Start-Sleep 30 s concluído, sem pausa adicional; sem erro/recarga/reinício percebido | Espera programada, sem cronometragem integral do intervalo |
| Q1 e comparação | Id 8, 16 entradas; O1→Q1 ChangedEntries 1, datatransport-nome, size-or-mtime, Files 1 | Uma entrada da categoria mudou; relatório não identifica se é a mesma de O |

**O/Q positivos no alcance funcional observado.** O complementa o R1 histórico:
aqui o reverse foi retirado e os rádios declarados desligados. Demonstra que o
percurso reconheceu o cartão sem depender dessas conexões; não comprova ausência
universal de rede, arquivos temporários, logs ou telemetria, nem leitura de
medidores reais. Nenhuma medição por UID/destino/payload foi realizada.

Mudança de metadados DataTransport em O e Q é compatível com atividade local e
possível processamento adiado como hipóteses, sem provar fila, conteúdo ou envio.
Reconectar Metro também restaura comunicação de desenvolvimento. Não transformar
estabilidade do restante do inventário, ausência de erro ou hash do JS em aceite
de anonimização/privacidade. Não ler bancos, instalar monitor por tentativa ou
repetir O/Q para obter delta zero. As conexões originais foram restauradas.

### Diagnóstico consolidado desta rodada

| Frente | Evidência disponível | Lacuna / condição de habilitação |
|---|---|---|
| Caminho próprio | CameraX/NV21/InputImage.fromByteBuffer, interpretação/revisão, erros fixos, demo sem writer/fallback; código revisado e testes | Compilação/manifesto/APK efetivos e internos SDK/SO não homologados por revisão de fontes |
| Execução no Samsung | I/S/B/C/R/E/O/Q positivos nos alcances descritos, correção do sim de B rastreada, versões/identidades delimitadas | Não equivalem a confirmação/persistência clínica, contas, corpus ou comparação acadêmica |
| Armazenamento | 16 entradas por snapshot; diferenças de tamanho/mtime por categoria documentadas | Conteúdo/temporários entre snapshots/mesmo tamanho e mtime/áreas fora do escopo não inspecionados |
| Localidade | O reconheceu com rádios declarados desligados e reverse removido | Não é auditoria integral de rede nem exclui telemetria/fila posterior |
| Telemetria/rede | Rotas estáticas de ID/serialização/transporte conhecidas; DataTransport mudou também em janelas sem OCR e em O/Q | Anonimização e comportamento efetivo, destinos/bytes/logs/falhas do SDK/SO seguem sem evidência suficiente |
| Manifesto instalado | Configuração/template/módulo revisados; APK instalado histórico sem reconfirmação atual | M0 exige identidade atual e artefato local correspondente, sem envio do APK |

Rodada funcional/metadados consolidada; **TASK-04/06/07/18 permanecem parciais e
habilitação clínica bloqueada**. Não há defeito funcional confirmado que justifique
mudar captura/parser/stack ou dispensar guardrails. Não pedir novas capturas por
lacunas que os snapshots não conseguem resolver. Próximo trabalho: manifesto
M0 se houver artefato/ferramenta existentes e auditoria independente do SDK.
Arquivos candidatos de Studio/aapt2/APK foram localizados depois da atualização
de SO; identidade atual e versão pós-update ainda pendentes. Sem build,
instalação, upload ou novo ensaio físico. Monitor por UID/destino continua NE.

### Complemento independente — encoders do evento OCR

Inspeção estática em 24/11/2026 com javap/JDK 21, sem executar SDK, sobre AAR
público play-services-mlkit-text-recognition-common 19.1.0. SHA-256 reconferido:
3be02b3c3c829476100f01d0ab79f0b4a923da23909d3ac63e486d1a63381c58.
Complementa os produtores do [PR #74](https://github.com/RamonMenz/bp-tracker/blob/812d65b3930833e9b2040882dbc877c20109cdab/docs/task-07-auditoria-dependencias.md#produtores-de-eventos-e-limites-da-inspeção),
sem incorporar seu código à base. Prefixo das classes abaixo:
com.google.android.gms.internal.mlkit_vision_text_common.

| Classe / método | Observação estática |
|---|---|
| zzmq.configure | Registra zzrz→zzln (offsets 205–210), zzod→zzhz (169–174), zzoj→zzid (97–102), zzsd→zzlo (217–222) |
| zzln.encode | Evento zzrz projeta inferenceCommonLogEvent, imageInfo e recognizerOptions por getters; não serializa InputImage diretamente nesse corpo |
| zzhz.encode | imageFormat e originalImageSize vêm de getters de zzod; compressedImageSize e isOdmlImage recebem null nesse encoder (41/51) |
| zzid.encode | durationMs/errorCode/flags vêm de zzoj; demais descritores examinados recebem null nesse corpo, não provar preenchimento só por nome de campo |
| zzlo.encode | languageOption vem do getter de zzsd; isUsingLegacyApi e sdkVersion recebem null nesse objeto (27/37); não implica ausência de versão no envelope comum |

Reprodução: extrair classes.jar do AAR público para diretório separado e usar
`java -m jdk.jdeps/com.sun.tools.javap.Main -c -p -classpath classes.jar` com os
nomes completos da tabela. Offsets são bytecode, não eventos do Samsung.
Nesta subárvore examinada não há campo de pixels/texto reconhecido/valores
clínicos; isso não cobre os demais produtores/envelopes/módulos nativos/logs ou
implementação dos transportes. O ID persistente já rastreado fica no envelope
comum, fora desses objetos: o complemento não resolve anonimização. Nenhum
payload ou banco do aparelho foi lido. Habilitação permanece bloqueada.

## Preparação M0 após atualização do SO — arquivos localizados

Registro em 24/11/2026. Autor informou reinício do telefone por atualização de
SO, reconexão USB e abertura manual por a no Metro. Estado atual idle/nao-carregado,
câmera desligada e conexões restauradas. Versão/build/patch pós-atualização ainda
não informados; não presumir que o firmware seja o dos ensaios anteriores.
I/S/B/C/R/E/O/Q permanecem evidências do ambiente anterior, sem nova execução
atribuída ao SO atualizado. Não repetir capturas por essa mudança neste momento.

Consulta de existência retornou AndroidStudioPadrao=true, Aapt2Sdk36=true e
ApkIntegracao=true. Isso localiza candidatos, não identifica versão/assinatura,
conteúdo ou correspondência do APK local ao instalado. Nenhum binário foi
executado por essa consulta; não houve build, instalação ou upload solicitado.

**Procedimento M0a, retorno recebido abaixo:** reconfirmar alvo USB e obter Android/API/patch/build
público pós-update, hash do JS conhecido e SHA-256 do base.apk atual/local. Não
usar fingerprint, serial, Android ID, banco, mídia, dumps ou APK exportado. Após
comparar, inspecionar manifesto do artefato correspondente com ferramenta já
existente; aapt2/Studio ainda sem versão executada registrada.

Comandos de versão (um por vez):

```powershell
$aferiAdb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
& $aferiAdb -d get-state
& $aferiAdb -d shell getprop ro.build.version.release
& $aferiAdb -d shell getprop ro.build.version.sdk
& $aferiAdb -d shell getprop ro.build.version.security_patch
& $aferiAdb -d shell getprop ro.build.display.id
& $aferiAdb -d shell run-as com.ramonmenz.afericapturetest sha256sum files/DevLauncherApp-BridgelessReactNativeDevBundle.js
```

APK local candidato: C:\dev\aferi-task07-integracao\demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk.
O caminho instalado deve ser obtido via pm path **só do pacote da demo**, retido
em variável, validado como /data/app/.../base.apk sem caracteres de shell e sem
travessia. Consultar hash com run-as/sha256sum; publicar só digest e contagem de
entradas APK. Contagem >1 limita comparação ao base e exige revisar splits antes
de declarar o conjunto instalado identificado. Hash local obtido por Get-FileHash,
sem imprimir path. Se run-as/path/hash falhar, parar sem root/chmod/pull/novo build.

Comparação sanitizada, após get-state retornar device; não imprimir as variáveis
intermediárias. O bloco foi verificado com sete fixtures PowerShell 7.5.4/Linux
(igualdade, splits, divergência, path injetado/travessia, erro nativo e hash inválido),
sem ADB/aparelho real. Em caso de erro, devolver só código fixo e parar.

```powershell
$aferiApkLocal = 'C:\dev\aferi-task07-integracao\demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk'
$aferiPacoteM0 = 'com.ramonmenz.afericapturetest'
if (-not (Test-Path -LiteralPath $aferiApkLocal -PathType Leaf -ErrorAction SilentlyContinue)) {
    throw 'apk-local-unavailable'
}
try {
    $aferiPathsM0 = @(& $aferiAdb -d shell pm path $aferiPacoteM0 2>&1)
} catch { throw 'apk-path-unavailable' }
if ($LASTEXITCODE -ne 0 -or $aferiPathsM0.Count -lt 1) { throw 'apk-path-unavailable' }
$aferiValidosM0 = @($aferiPathsM0 | Where-Object {
    $_ -is [string] -and
    $_.Trim() -match '^package:/data/app/[A-Za-z0-9_./=+~\-]+\.apk$' -and
    $_ -notmatch '/\.\./'
})
if ($aferiValidosM0.Count -ne $aferiPathsM0.Count) { throw 'apk-path-unexpected' }
$aferiBaseM0 = @($aferiValidosM0 | Where-Object { $_.Trim().EndsWith('/base.apk') })
if ($aferiBaseM0.Count -ne 1) { throw 'apk-base-unavailable' }
$aferiBasePathM0 = $aferiBaseM0[0].Trim().Substring(8)
try {
    $aferiHashM0 = @(& $aferiAdb -d shell run-as $aferiPacoteM0 sha256sum $aferiBasePathM0 2>&1)
} catch { throw 'apk-installed-hash-unavailable' }
if ($LASTEXITCODE -ne 0 -or $aferiHashM0.Count -ne 1 -or
    $aferiHashM0[0] -isnot [string] -or
    $aferiHashM0[0] -notmatch '^(?<Digest>[0-9a-fA-F]{64})\s') {
    throw 'apk-installed-hash-unavailable'
}
$aferiInstaladoM0 = $Matches.Digest.ToLowerInvariant()
try {
    $aferiLocalM0 = (Get-FileHash -LiteralPath $aferiApkLocal -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant()
} catch { throw 'apk-local-hash-unavailable' }
[pscustomobject]@{
    EntradasApkInstaladas = $aferiValidosM0.Count
    Sha256BaseInstalado = $aferiInstaladoM0
    Sha256ApkLocal = $aferiLocalM0
    BaseCoincideComLocal = ($aferiInstaladoM0 -eq $aferiLocalM0)
} | ConvertTo-Json
```

Hashes iguais identificam bytes dos arquivos consultados, não a cadeia de build,
todo runtime ou ausência de persistência. Diferentes não autorizam reinstalar
para obter coincidência. Nenhuma leitura de manifesto ou nova captura pedida
antes desse retorno de identidade. Habilitação clínica continua bloqueada.

## Retorno M0a — APK local correspondente e referência atual do SO

Registro em 24/11/2026 conforme resumo do autor, sem data/hora da execução
informadas ou acesso direto ao aparelho. get-state retornou device; sem erro
ou impedimento percebido. Não houve nova captura solicitada após o update.

| Metadado | Valor recebido | Alcance |
|---|---|---|
| Android/API atuais | 17 / 37 | Mantêm os números reportados antes; não identificam sozinhos todo firmware |
| Patch de segurança | 2026-10-05 | Identificador do patch, não data do ensaio ou da instalação da atualização |
| Build do SO | CP2A.260605.016.S731BXXUACZJC | Referência atual declarada pelo comando; build/patch anteriores não foram comparados |
| Bundle | 860174567097a3b5501ecf158c8aef2a32edeb44b112ac2b3f94e68e0ca81388 | Igual às consultas anteriores, sem comprovar toda execução |
| Entradas APK instaladas | 1 | Uma entrada reportada por pm path na consulta da demo; sem split adicional reportado |
| SHA-256 base instalado | 69d5a0b31023a9b3647b0036cc2eb3af0683be19a02782a2b8e834635849e09c | Arquivo atual consultado |
| SHA-256 APK local | 69d5a0b31023a9b3647b0036cc2eb3af0683be19a02782a2b8e834635849e09c | Coincide com base instalado; BaseCoincideComLocal=true |

M0a identifica os bytes do APK local como os do base instalado nos momentos
consultados e permite inspecionar seu manifesto sem exportar o APK. Os hashes
coincidem também com a identidade histórica conhecida, mas isso não homologa
o runtime no SO atualizado, todos os serviços, logs/rede ou privacidade. A rodada
funcional anterior permanece vinculada ao ambiente anterior, sem reteste imposto.

### Próximo M0b — manifesto selecionado com aapt2 local

[Extrator manifesto-1](../tools/task07/AferiManifestMetadata.psm1) e
[checks](../tools/task07/AferiManifestMetadata.check.ps1) novos, sem dependência
adicional no app. Atualizar **só a worktree de ferramentas**, após conferir que
git status --short está vazio, com fetch da branch do PR #75 e switch --detach
no commit publicado desta entrega. Não alterar TalkBack/Metro ou a cópia de
integração que contém o APK; sem reset/stash caso exista trabalho local.

Importar o novo módulo e chamar Get-AferiManifestMetadata com o aapt2 existente
em Android/Sdk/build-tools/36.0.0, APK local de integração e ExpectedSha256 igual
a 69d5a0b3… completo acima. O extrator:

- reconfere SHA-256 do APK antes da leitura e recusa divergência;
- registra versão aapt2, só então usa dump xmltree --file AndroidManifest.xml;
- mantém árvore completa em memória privada, sem arquivo intermediário/log/envio;
- retorna só pacote esperado, min/target SDK, permissões Android de câmera/rede/
  áudio/mídia/storage selecionadas (com maxSdk/tipo), e seis atributos diretos de
  application: allowBackup/usesCleartextTraffic/debuggable/fullBackupContent/
  dataExtractionRules/networkSecurityConfig;
- ignora rótulos/componentes e atributos de Activity; ausência é nao-declarado,
  referência é referencia-presente, formato desconhecido é nao-interpretado;
- recusa estrutura parcial/pacote divergente/atributo duplicado ou falha nativa
  com código fixo, sem reproduzir conteúdo bruto ou paths.

Código de chamada após importar, com caminhos existentes já localizados:

```powershell
$aferiAapt2 = Join-Path $env:LOCALAPPDATA 'Android\Sdk\build-tools\36.0.0\aapt2.exe'
$aferiApkLocal = 'C:\dev\aferi-task07-integracao\demos\android-capture\android\app\build\outputs\apk\debug\app-debug.apk'
Get-AferiManifestMetadata -Aapt2Path $aferiAapt2 -ApkPath $aferiApkLocal -ExpectedSha256 '69d5a0b31023a9b3647b0036cc2eb3af0683be19a02782a2b8e834635849e09c' | ConvertTo-Json -Depth 8
```

Retornar só JSON ou código fixo/impedimento. Não imprimir árvore/variáveis privadas,
manifesto inteiro, APK, certificados, chaves, screenshot ou logs. Não abrir projeto
no Studio nem fazer build, instalação ou nova captura. Resultado de referência
não expõe o recurso associado: requer análise posterior; ausência não equivale
a false nem declaração de permissão a concessão em runtime. INTERNET/cleartext
no Dev Client não comprovam upload; não removê-los por tentativa.

Verificação independente: aapt2 público oficial Linux 8.10.1-12782657, versão
2.19-12782657, usado para dump de fixture de manifesto binário sintético sem
código executável. Nenhum APK do autor foi recebido ou executado. Formatos
full URI/android: e valores tipados suportados pelo extrator; checks simulados
cobrem escopo application, whitelist/ausências/maxSdk, desconhecido, pacote/
estrutura/duplicatas, privacidade de saída, hash alterado e fronteira nativa.
Também entram no job App do CI. Windows/aapt2 do autor ainda sem execução M0b;
UID/destinos/SDK/SO integrais e habilitação clínica continuam pendentes.

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
git cat-file -e '583f61fa4a444d944e31178829706313b1b86795^{commit}'
git worktree add --detach C:\dev\aferi-task07-privacidade 583f61fa4a444d944e31178829706313b1b86795
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

Estado atualizado: P0/I/S/B/C/R recebidos. C/R positivos para cancelamento e
retorno sem retomada/campos/câmera, com mudanças de metadados descritas acima:
DataTransport em C; bundle e entrada não classificada após R. Conteúdo/causa/envio
não determinados. Fonte/bundle pós-R reconfirmados: f057283 limpa e hash igual
ao P0; abertura manual por a registrada com momento relativo não especificado.
E recebido positivo para negativa/cancelamento; uma entrada não classificada
mudou size-or-mtime, sem conteúdo/causa/envio determinados. Preparação offline
recebida: permissão restaurada, cancelled/preview-1 sem câmera, hash conhecido,
um reverse 8097 e Wi-Fi/dados ligados. Ancoragens USB/Bluetooth desligadas e
cabo direto sem adaptador confirmados. O/Q recebidos positivos no alcance
funcional; reverse 1/0→0/0→1/0, rádios desligados em O e restaurados em Q;
16 entradas nos snapshots, uma mudança DataTransport em cada comparação, sem
conteúdo/causa/envio determinados. Rodada consolidada; M0/APK/UID/destinos e
privacidade pendentes, habilitação clínica bloqueada. Atualização de SO posterior
registrada: M0a identificou Android17/API37/patch2026-10-05/buildCP2A.260605.016.S731BXXUACZJC,
APK local/base únicos com hash69d5a0b3… e JS86017456… coincidentes. Próximo M0b
com extrator manifesto-1, sem captura; ensaios anteriores não homologam o novo SO.

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
