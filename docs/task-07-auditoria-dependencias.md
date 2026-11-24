# TASK-07 — primeira coleta técnica de dependências

> Continuidade: [serialização e transporte do identificador](#serialização-e-transporte-do-identificador)
> e [diagnóstico de associação](task-07-diagnostico-associacao.md). Sem aceite de privacidade.

Protocolo preparado em 23/11/2026; **primeira tentativa bloqueada por SDK não
localizado; repetição recebida com as três consultas bem-sucedidas**.
Complementa [retorno TalkBack](task-07-reteste-talkback.md). Não substitui auditoria
de disco/logs/rede/SO nem encerra TASK-07. Nenhuma publicação, alteração de SDK,
leitura de mídia ou exportação de bancos é autorizada por este roteiro.

## Pergunta a resolver

O sandbox contém bancos DataTransport. A documentação pública consultada na
frente #69 mostra rota transitiva ML Kit text-recognition 16.0.1 → common 18.11.0
→ DataTransport. Isso não identifica versões efetivamente selecionadas pelo
Gradle, nem conteúdo/payload ou destinos de envio. A repetição abaixo identifica
as versões resolvidas em debugRuntimeClasspath. A inspeção estática inicial dos
artefatos públicos e a preparação da observação por UID não substituem a
verificação de conteúdo, armazenamento e tráfego em runtime.

## Coleta no PowerShell

Usar o projeto Android já gerado da cópia de integração original. A nova cópia
TalkBack foi criada só para JS e pode não ter gradlew.bat. Não recriar projeto,
limpar dados, reinstalar APK ou trocar dependências para obter esta saída.

```powershell
cd C:\dev\aferi-task07-integracao
git rev-parse HEAD
git status --short
cd demos\android-capture\android
Test-Path .\gradlew.bat
```

Esperado: wrapper existente (True). Se a pasta/wrapper não existir, registrar
impedimento. Usar o mesmo JDK/SDK do build anterior, sem atualizar versões.
Antes das consultas, configurar o SDK já instalado **no mesmo PowerShell**.
Uma variável definida em outro terminal ou em uma sessão anterior pode não
estar disponível. A existência do adb.exe, sozinha, não configura o Gradle.

```powershell
$aferiSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
Test-Path -LiteralPath $aferiSdk -PathType Container
```

Se retornar False, consultar **Android SDK Location** no SDK Manager do Android
Studio e atribuir esse caminho existente a `$aferiSdk`. Não instalar/atualizar
pacotes. Não continuar se o diretório não existir. Em seguida:

```powershell
if (-not (Test-Path -LiteralPath $aferiSdk -PathType Container)) {
    throw 'SDK não localizado. Confira Android SDK Location no Android Studio.'
}
$env:ANDROID_HOME = $aferiSdk
# Se a variável antiga existir, manter o mesmo destino nesta sessão.
if (Test-Path Env:ANDROID_SDK_ROOT) {
    $env:ANDROID_SDK_ROOT = $aferiSdk
}
Test-Path -LiteralPath (Join-Path $aferiSdk 'platform-tools\adb.exe')
Test-Path -LiteralPath (Join-Path $aferiSdk 'platforms\android-36\android.jar')
Test-Path -LiteralPath (Join-Path $aferiSdk 'build-tools\36.0.0')
```

Esperado: três True para os componentes do ambiente anterior. Se algum retornar
False, registrar qual verificação falhou e parar; não instalar outra versão por
tentativa. Essas verificações não garantem que todos os artefatos do cache estão
presentes. Não é preciso celular, ADB conectado, Metro, assemble ou instalação
para consultar dependências. A atribuição das variáveis vale só nesta sessão;
não altera configurações globais nem exige escrever local.properties. Caso já
exista um local.properties com sdk.dir inválido, corrigir somente essa entrada
local para o mesmo SDK existente, preservando as demais propriedades e sem
versionar o arquivo.

Executar um comando por vez, mantendo `--offline`:

```powershell
.\gradlew.bat :app:dependencyInsight --dependency transport-runtime --configuration debugRuntimeClasspath --offline --console=plain
```

```powershell
.\gradlew.bat :app:dependencyInsight --dependency transport-backend-cct --configuration debugRuntimeClasspath --offline --console=plain
```

```powershell
.\gradlew.bat :app:dependencyInsight --dependency com.google.mlkit:common --configuration debugRuntimeClasspath --offline --console=plain
```

São consultas de dependências: não solicitam assemble/install nem deploy.
Gradle pode gerar metadados de build/cache locais, sem capturar mídia. A opção
offline impede resolução remota de novas dependências. Se faltar artefato no
cache ou houver falha de SDK/JDK, enviar mensagem sanitizada; não retirar offline
ou trocar versões por tentativa. Saída sem correspondência deve ser registrada,
não convertida em prova de ausência do componente no APK.

## Primeira tentativa recebida — impedimento de ambiente

Fonte do projeto consultado: `4dc010599747bcb6de2b5e2f939f030e9cbe4ea8`;
`git status --short` sem saída antes das consultas; wrapper existente (True).
O retorno não informa data/hora da execução; nenhuma é atribuída à coleta.

| Consulta em debugRuntimeClasspath, offline | Resultado recebido | Versão selecionada |
|---|---|---|
| transport-runtime | BUILD FAILED; SDK location not found | Não obtida |
| transport-backend-cct | BUILD FAILED; SDK location not found | Não obtida |
| com.google.mlkit:common | BUILD FAILED; SDK location not found | Não obtida |

As três falhas ocorreram na configuração de :app, ao aplicar
com.facebook.react.rootproject. Não houve árvore de resolução nem resultado
de ausência de correspondência. Os números de Build Tools, compile/target SDK,
NDK e Kotlin exibidos pelo Expo não são versões de ML Kit/DataTransport. O aviso
de APIs obsoletas para Gradle 10 não é a causa de falha indicada pelo retorno e
não justifica atualizar Gradle/SDK para esta coleta.

O impedimento já apareceu no [registro da depuração](task-07-registro-validacao-android.md)
e é tratado no [roteiro Windows, seção 3](task-07-roteiro-windows-android.md#3-adb-e-sdk).
Próximo passo: apontar o SDK existente no mesmo terminal e repetir as três
consultas acima. Não há evidência nova sobre payloads, armazenamento de mídia,
tráfego ou versões resolvidas nessa primeira tentativa; a repetição posterior
está registrada abaixo. TASK-07 e a auditoria de privacidade seguem abertas.

## Repetição recebida — versões selecionadas

O autor configurou ANDROID_HOME no mesmo PowerShell, alinhando ANDROID_SDK_ROOT
se existente. Diretório do SDK, adb.exe, android-36/android.jar e Build Tools
36.0.0 retornaram True. As três consultas offline em debugRuntimeClasspath
chegaram a :app:dependencyInsight e terminaram com BUILD SUCCESSFUL.

A pasta consultada é a mesma cópia de integração informada na primeira coleta.
O novo arquivo não repete git rev-parse HEAD/status nem informa data/hora da
execução. Não atribuir automaticamente o estado limpo/4dc0105 da primeira
tentativa a essa segunda execução; confirmação atual solicitada abaixo.

| Componente consultado | Versão selecionada | Motivo de seleção exibido |
|---|---|---|
| com.google.android.datatransport:transport-runtime | 2.2.6 | Resolução de conflito entre 2.2.6 e 2.2.5 |
| com.google.android.datatransport:transport-backend-cct | 2.3.3 | Sem motivo adicional explícito no trecho recebido |
| com.google.mlkit:common | 18.11.0 | Resolução de conflito entre 18.11.0, 18.9.0 e 18.6.0 |

As setas 2.2.5 → 2.2.6 e 18.6.0/18.9.0 → 18.11.0 descrevem a seleção de uma
versão compartilhada; não indicam atualização manual feita nessa consulta.
O POM oficial de transport-backend-cct 2.3.3 declara runtime 2.2.5, coerente com
a substituição mostrada. O aviso sobre Gradle 10 continua não sendo falha.

Dois caminhos efetivamente aparecem na árvore (resumo, sem reproduzir cada ramo):

- `:aferi-photo-capture` → `com.google.mlkit:text-recognition:16.0.1` →
  `com.google.mlkit:common:18.11.0` e componentes text-recognition → DataTransport.
- `:expo-dev-launcher` → `com.google.mlkit:barcode-scanning:17.3.0` e
  `com.google.android.gms:play-services-code-scanner:16.1.0` → common/DataTransport.

Também são exibidos play-services-mlkit-text-recognition 19.0.1,
play-services-mlkit-text-recognition-common 19.1.0,
text-recognition-bundled-common 17.0.0 e vision-common 17.3.0. São evidências
transitivas da árvore recebida, sem novas consultas específicas desses módulos.

Portanto, o Dev Client possui mais de um caminho para DataTransport. A presença
do banco não identifica qual componente o criou nem atribui eventos a uma
captura. Remover o dev launcher, por si só, não demonstraria ausência de
DataTransport no caminho OCR. Nenhuma dependência foi excluída ou substituída.

## Inspeção estática inicial dos artefatos públicos

Foram obtidos os POMs e AARs das três versões acima do Google Maven, sem acessar
APK, bancos ou mídia do autor. URLs oficiais dos AARs:

- [transport-runtime 2.2.6](https://dl.google.com/dl/android/maven2/com/google/android/datatransport/transport-runtime/2.2.6/transport-runtime-2.2.6.aar)
- [transport-backend-cct 2.3.3](https://dl.google.com/dl/android/maven2/com/google/android/datatransport/transport-backend-cct/2.3.3/transport-backend-cct-2.3.3.aar)
- [ML Kit common 18.11.0](https://dl.google.com/dl/android/maven2/com/google/mlkit/common/18.11.0/common-18.11.0.aar)

| AAR público examinado | SHA-256 |
|---|---|
| transport-runtime 2.2.6 | d83ad23c134429691161c92476a3c83df236cd1f8badbfd4f00723b4eccd741c |
| transport-backend-cct 2.3.3 | b22a14d560a590dc875e902424b29a13a02d1faf297b7c39a9007967ffadccbd |
| common 18.11.0 | 66408a08dbb2465687ff5dd0c8f6410b56549ce3ecf449d9096f3712282131d0 |

Método: abrir os AARs como ZIP, abrir classes.jar e localizar nomes/referências
e literais nos arquivos .class. É inspeção estática limitada, sem execução,
decompilação completa ou rastreamento de payload. Resultados:

- runtime contém SQLiteEventStore/SchemaManager, referências a SQLiteOpenHelper,
  literal `com.google.android.datatransport.events` e `CREATE TABLE events`,
  além de `payload`/`transport_name`. Isso corrobora a capacidade de persistir
  eventos e a correspondência do nome com o banco listado no aparelho.
- CctTransportBackend contém referências a HttpURLConnection, getOutputStream
  e GZIPOutputStream: há capacidade de envio no backend, sem provar que houve
  envio nesse aparelho ou identificar destino/conteúdo em runtime.
- common contém referências a com/google/android/datatransport nas classes
  internas zzsl, zzsm, zzsn, zzso e zzsp. A presença dessas referências não
  determina os campos efetivamente produzidos pelo OCR ou pelo scanner.

Os caminhos convencionais de sources.jar dessas versões retornaram HTTP 404;
não houve auditoria completa de fontes. Os hashes identificam os downloads
públicos, não os bytes do APK instalado. Não foi demonstrado que imagem, texto
OCR ou valores candidatos integram eventos; também não foi demonstrada sua
ausência. Persistência de eventos técnicos não equivale, sozinha, a persistência
clínica, e inferência local não garante ausência de telemetria.

## Coleta mínima proposta — identidade e capacidade de consulta de rede

Sem repetir os testes de captura, confirmar HEAD/status da cópia consultada:

```powershell
cd C:\dev\aferi-task07-integracao
git rev-parse HEAD
git status --short
```

Com depuração USB autorizada, usar o ADB do SDK existente (ajustar o caminho se
o SDK Manager indicar outro local). Não é preciso abrir Metro ou capturar:

```powershell
$aferiSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$aferiAdb = Join-Path $aferiSdk 'platform-tools\adb.exe'
& $aferiAdb shell pm list packages -U com.ramonmenz.afericapturetest
& $aferiAdb shell cmd netstats help
```

Esperado: linha do pacote com uid e ajuda de netstats, ou erro de comando/permissão
que deve ser registrado. Esses comandos ainda não medem tráfego. Retornar só
HEAD/status, a linha do pacote alvo e a ajuda/erro, sem serial ou outros apps.
Não usar dump global de rede, captura de payload, root, banco, logcat completo
ou limpar estatísticas. Se a ajuda não estiver disponível, não ampliar a coleta
por tentativa. O retorno e a alternativa limitada ao app estão registrados abaixo.
Contadores por UID não distinguem OCR/dev launcher/Metro dentro do mesmo app,
não mostram payload/destino e não bastam para homologar privacidade.

## Retorno da coleta mínima — identidade confirmada, interface indisponível

O autor enviou novamente HEAD `4dc010599747bcb6de2b5e2f939f030e9cbe4ea8` e
git status --short sem saída. Isso confirma o estado da cópia de integração
nesse momento; não é verificação retroativa de cada consulta nem vínculo
criptográfico entre fonte, projeto Android gerado, APK instalado e JS carregado.

Saída sanitizada relevante:

```text
package:com.ramonmenz.afericapturetest uid:10033
cmd netstats help → No shell command implementation.
```

O UID 10033 identifica o pacote nessa instalação/usuário Android; reconfirmar
se houver reinstalação ou troca de usuário. A resposta de netstats indica
ausência de implementação da interface shell acionada, não ausência de serviço,
de bytes trafegados, de telemetria ou de permissões em outras interfaces.
Não houve medição de tráfego nessa coleta. Data/hora da execução não informadas.

Não usar como substituto automático dumpsys netstats com --uid, --uid=10033 ou
-h. Nas implementações de referência examinadas ([Android 12/AOSP](https://github.com/aosp-mirror/platform_frameworks_base/blob/android-12.0.0_r1/services/core/java/com/android/server/net/NetworkStatsService.java)
e [Lineage 23.0/Connectivity](https://github.com/LineageOS/android_packages_modules_Connectivity/blob/lineage-23.0/service-t/src/com/android/server/net/NetworkStatsService.java)),
--uid habilita detalhamento por UIDs, sem selecionar um único app, e argumentos
desconhecidos não garantem saída de ajuda. Essas referências não são inspeção do
firmware Samsung, mas impedem presumir um filtro seguro por tentativa.

## Próxima observação — uso de dados do app na interface Samsung

**Replanejamento em 24/11/2026:** T0/T1/T2 passa a ser opcional, sem impedir o
avanço técnico. O [roteiro consolidado](task-07-rodada-tecnica-consolidada.md)
prioriza testes controlados e dois complementos físicos, preservando abaixo o
protocolo original e suas limitações. Nenhuma medição T0/T1/T2 foi recebida.

Este é um ensaio complementar proposto, **ainda não executado**. Não substitui
auditoria de payload/destinos, nem a medição precisa por UID, que continua
indisponível pelo comando consultado. Não pede nova build ou instalação.

1. Manter o cliente de teste já carregado, sem captura em andamento, conectado
   por USB/reverse e com Fast Refresh desativado. Usar somente cartão sintético.
   Registrar se houve recarga/reinício durante a observação e qual conexão de
   internet está ativa. Se o app não estiver pronto, resolver isso antes de
   iniciar a observação; não contar o download inicial do bundle como captura.
2. No Samsung, procurar Configurações → Conexões → Uso de dados → Uso de dados
   Wi-Fi (ou opção equivalente) e selecionar somente o app da demo Aferi. Se o
   teste usar dados móveis, consultar a tela correspondente. A tela deve cobrir
   a conexão usada: um contador exclusivamente móvel não mede tráfego Wi-Fi.
   Se essa tela não existir ou não for possível distinguir o app, informar o
   impedimento e parar, sem exportar lista de apps/dump global.
3. Anotar T0: período exibido, conexão, total e valores de primeiro/segundo plano
   se disponíveis, com unidades e precisão exibidas. Não redefinir contadores,
   limpar dados, alterar restrições de rede ou instalar monitor de tráfego.
4. Voltar à demo, deixar sem interação por aproximadamente um minuto e retornar
   à mesma tela de uso de dados. Anotar T1 e o intervalo efetivamente observado;
   se não o mediu, declarar aproximado. Manter o mesmo período/conexão.
5. Voltar à demo, iniciar e capturar uma vez o cartão sintético 120/80/72,
   observar a revisão e cancelar. A câmera deve encerrar; nenhuma confirmação
   clínica é solicitada. Aguardar aproximadamente um minuto, mantendo a demo
   aberta, e retornar à mesma tela para anotar T2 e o intervalo observado.
6. Retornar apenas os valores/textos da tela do app nos três momentos, revisão
   obtida/cancelamento, recarga/reinício se houver e eventuais limitações. Não
   enviar tela com outros apps, contas, SSID, dados de operadora ou valores reais.

Como interpretar: os deltas T1−T0 e T2−T1 só são calculáveis se período/unidades
e atualização dos contadores permitirem. Os intervalos incluem ida/volta às
configurações e não isolam o instante da captura. A UI pode arredondar ou
atualizar com atraso: igualdade exibida não significa zero bytes. Aumento
mostra uso atribuído ao app pela UI, sem distinguir Metro/dev launcher/OCR/
outros componentes, conteúdo ou destino. Sem controle de duração/atualização,
não comparar taxas nem atribuir causalidade. A observação não homologa
privacidade mesmo que a captura funcione e os números permaneçam iguais.

## Retorno esperado

- HEAD/status do projeto consultado, distinguindo-o da cópia TalkBack f057283.
- Nome do componente e versão selecionada, inclusive setas de substituição.
- Motivos de seleção (conflito/regra/constraint) e caminho até as dependências.
- Sucesso, ausência de correspondência ou impedimento de cada comando.

Não enviar variáveis de ambiente, credenciais, conteúdo de google-services.json,
logs debug completos, APK, banco DataTransport, cookies, identificador de
instalação ou capturas do produto. Remover nomes pessoais/caminhos locais da
saída. A árvore descreve resolução do projeto naquele momento: não identifica
sozinha o binário instalado, o JS executado ou o conteúdo dos bancos.

A árvore e a inspeção estática inicial estão registradas acima; falta ampliar
a auditoria dos produtores de eventos e verificar o comportamento em runtime.
O [retorno R1/R2 e avanço de produtores/identificador do SDK](task-07-rodada-tecnica-consolidada.md#retorno-recebido-de-r1r2)
complementam esta coleta: captura offline e descarte acessível positivos no
relato; produtor de identificador de instância encontrado nos artefatos públicos,
sem constatação de payload ou envio no Samsung.
Qualquer evidência de persistência/envio clínico bloqueia habilitação; ausência
de erro nos testes de interface não homologa privacidade. Nenhum conteúdo de
evento/banco ou comportamento de rede no aparelho é presumido neste documento.

## Serialização e transporte do identificador

Inspeção estática em 24/11/2026, sem acesso ao Windows, APK ou sandbox Samsung.
Os AARs públicos common 18.11.0 e text-recognition-common 19.1.0 foram obtidos
novamente das URLs oficiais já vinculadas acima/no [registro anterior](task-07-rodada-tecnica-consolidada.md#auditoria-estática-complementar--identificador-de-instância-do-sdk).
SHA-256 conferidos: respectivamente `66408a08dbb2465687ff5dd0c8f6410b56549ce3ecf449d9096f3712282131d0`
e `3be02b3c3c829476100f01d0ab79f0b4a923da23909d3ac63e486d1a63381c58`.
Não se confundem com hashes de arquivos instalados no telefone.

Método reproduzível: abrir AAR como ZIP, extrair classes.jar para diretório
temporário e executar o disassembler do JDK 21, sem carregar/executar o SDK:

```sh
java -m jdk.jdeps/com.sun.tools.javap.Main -c -p -classpath classes.jar NOME_COMPLETO_DA_CLASSE
```

Classes text-common abaixo usam o prefixo
`com.google.android.gms.internal.mlkit_vision_text_common.`. A classe common
é `com.google.mlkit.common.sdkinternal.SharedPrefManager`. Offsets são posições
de bytecode dentro do método, não linhas de fonte nem rastreamento de execução.

| Classe/método | Vínculo observado |
|---|---|
| SharedPrefManager.zza / getMlSdkInstanceId | Preferência privada `com.google.mlkit.internal`; chave `ml_sdk_instance_id`; UUID persistido por putString/apply se ausente (offsets 19–43) |
| zzuc.zzc | Obtém ID do Task ou getMlSdkInstanceId (147–155), passa a zzsr.zzi (99), acopla builder a zztr.zzc (130) e entrega a zzts.zza (141) |
| zzuf.zzc / zze | Implementação de zztr guarda o builder; zze materializa zzst, acopla ao evento e serializa via JSON ou encoder binário, ambos configurados por zzmq |
| zzmq.configure / zzmg.encode | Registra zzst → zzmg (12–18); encoder lê zzst.zzi e adiciona ao descritor mlSdkInstanceId (113–120), com tag 9 definida no inicializador |
| zztu.zzd / zztv construtor | Factory interna define boolean true e modo 1; zztv adiciona zzuk à lista quando zztu.zzc é true |
| zzun.zzb / zzum.create | zzun materializa as opções padrão; zzum cria zzuc com SharedPrefManager e uma instância concreta de zztv |
| zzuk construtor / zzb / zza | Inicializa TransportRuntime com CCTDestination.INSTANCE; zzb serializa zztr.zze e envolve em Event.ofData ou Event.ofTelemetry; zza chama Transport.send nos ramos JSON/proto |
| zzui.get / zzug.apply | Transporte proto com nome FIREBASE_ML_SDK e Transformer que retorna o mesmo byte array; não há remoção de ID nesse Transformer |

Avanço frente à inspeção anterior: o vínculo builder → encoder → bytes →
Transport.send também existe no artefato específico de OCR. O ID não é apenas
um nome de campo desconectado do serializador. Isso **não demonstra** execução,
fila, envio, destino efetivo ou payload no aparelho; não é auditoria completa
de todos os eventos, caminhos condicionais ou versões transitivas.

Também examinado `com.google.mlkit.vision.text.internal.TextRecognizerTaskWithResource`:
zze(InputImage) chama o método privado zzf tanto no sucesso quanto em
MlKitException; zzf prepara a closure zzq e chama zzuc.zzf. A passagem de
InputImage à closure não prova serialização de pixels: o corpo completo dessa
closure e os demais produtores ainda precisam de auditoria. Não converter
presença de parâmetro em alegação de mídia enviada ou ausência de mídia.

O nome FIREBASE_ML_SDK não implica uso do banco clínico do Aferi. Event.ofData
é uma categoria do DataTransport, não evidência de dados clínicos. Os métodos
examinados não permitem concluir que imagens/texto/valores são enviados nem
que todos os eventos os excluem. Não foi lido nem publicado ID de instalação.

Um UUID persistente de instância pode permitir correlação; sua geração aleatória
não comprova anonimização. A constituição exige telemetria nova anônima e
agregada, sem identificadores pessoais: essa compatibilidade continua **não
demonstrada**. Não chamar o SDK de anônimo/offline apenas por inferência local.
Nenhum toggle interno, reflexão, remoção de dependência, alteração de manifest
ou bloqueio artificial de rede foi adotado como solução de privacidade.

Próximo trabalho técnico: rastrear quais produtores de eventos do reconhecedor
embarcado atingem essa factory/configuração, revisar campos efetivamente
preenchidos e APIs públicas documentadas aplicáveis às versões fixadas. Uma
opção interna ofuscada não é uma configuração pública comprovada. Runtime
exigirá ensaio isolado com dados sintéticos e observação dirigida que distinga
OCR/dev launcher, incluindo armazenamento, logs e reconexão; não pedir dump de
banco ou captura clínica ao autor. Manter habilitação clínica bloqueada até
evidência dos critérios, sem substituir ML Kit/Tesseract definidos nas specs.

## Produtores de eventos e limites da inspeção

Continuidade em 24/11/2026 sobre staging
`81af92f4d3763e1e89f910e01c296decf83b5778`, após os merges #72/#73.
Inspeção estática de bibliotecas públicas com OpenJDK 21.0.12.1, sem executar
classes do SDK, capturar mídia, consultar sandbox ou acessar o Windows/Samsung.
Complementa a seção anterior; não constitui aceite de privacidade.

### Artefatos e reprodução

| Artefato público oficial | SHA-256 conferido nesta etapa |
|---|---|
| [text-recognition 16.0.1](https://dl.google.com/dl/android/maven2/com/google/mlkit/text-recognition/16.0.1/text-recognition-16.0.1.aar) | `da753265d02479a8cfe4dbf891ba7d189248e7c8430b6f72bd4d532c757a69b3` |
| [play-services-mlkit-text-recognition 19.0.1](https://dl.google.com/dl/android/maven2/com/google/android/gms/play-services-mlkit-text-recognition/19.0.1/play-services-mlkit-text-recognition-19.0.1.aar) | `6b504dc053758407a507883fa9495bcb4c1c2bae8069012ff3a8f70f93bc89d4` |
| [play-services-mlkit-text-recognition-common 19.1.0](https://dl.google.com/dl/android/maven2/com/google/android/gms/play-services-mlkit-text-recognition-common/19.1.0/play-services-mlkit-text-recognition-common-19.1.0.aar) | `3be02b3c3c829476100f01d0ab79f0b4a923da23909d3ac63e486d1a63381c58` |

O [POM de text-recognition 16.0.1](https://dl.google.com/dl/android/maven2/com/google/mlkit/text-recognition/16.0.1/text-recognition-16.0.1.pom)
declara o componente 19.0.1. O AAR 16.0.1 contém o descritor do módulo latino,
mas sua classes.jar não contém TextRecognizerOptions: a primeira tentativa de
javap nessa classe retornou class not found. A classe foi localizada em 19.0.1.
Isso não é falha de OCR nem resolução Gradle nova. Os hashes são de downloads
públicos, não do APK instalado; o runtime efetivo continua sem inspeção.

Para reproduzir, baixar os AARs oficiais para diretório temporário separado do
repositório, conferir os hashes e extrair somente classes.jar de cada ZIP para
pastas distintas. Sobre cada jar, executar, sem carregar as classes:

```sh
java -m jdk.jdeps/com.sun.tools.javap.Main -c -p -classpath classes.jar NOME_COMPLETO_DA_CLASSE
```

Classes em 19.0.1: `com.google.mlkit.vision.text.latin.TextRecognizerOptions`
e `com.google.mlkit.vision.text.latin.TextRecognizerOptions$Builder` (proteger
`$` com aspas simples no shell). Em 19.1.0: os nomes da tabela abaixo.
Prefixo **T** = `com.google.mlkit.vision.text.`; **I** =
`com.google.android.gms.internal.mlkit_vision_text_common.`. Offsets são posições
de bytecode por método, não linhas de fonte nem eventos observados no telefone.

### Do cliente próprio aos produtores

AferiPhotoView.kt cria `TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)`.
O builder latino examinado expõe setExecutor/build, sem opção pública de
telemetria nessa superfície. Isso não prova inexistência de configuração em
todas as APIs do SDK; nenhuma opção interna foi tratada como solução suportada.

| Classe/método | Vínculo observado / alcance |
|---|---|
| T.TextRecognition.getClient → T.internal.zzo.zza | Cria zzn com tarefa obtida de zzp e logger obtido de I.zzun.zzb; não há ramo que exclua logger para cliente embarcado nesse trecho |
| T.internal.zzp.create | getLoggingLibraryName → I.zzun.zzb (6–11); entrega o logger ao construtor de TextRecognizerTaskWithResource (59–63) |
| TextRecognizerOptions.getIsThickClient → T.internal.TextRecognizerOptionsUtils.isThickClient | Consulta DynamiteModule.getLocalVersion do módulo latino e guarda boolean; não inferir a resposta do aparelho pela presença do AAR |
| T.internal.zzn construtor | Ramos thick/thin convergem na criação do evento e I.zzuc.zzd (85–94); criar cliente já tem uma rota de evento, sem exigir uma captura |
| T.internal.TextRecognizerTaskWithResource.zze | Chama zzf no sucesso (15–21) e em MlKitException (46–50); resultado Text é retornado separadamente |
| T.internal.zzq.zza → TextRecognizerTaskWithResource.zzc | Closure entrega duração, código e InputImage ao produtor; nesse corpo zzc, imagem é consultada por getMobileVisionImageFormat/getMobileVisionImageSize (66–79) |
| TextRecognizerTaskWithResource.zzc | Monta duração/código/flags, formato/tamanho e opção de idioma; seleciona thick/thin e retorna zzuf.zzf. Não há leitura de pixels ou texto reconhecido nesse corpo examinado |
| I.zzuc.zzf → zze → I.zztw.run → zzuc.zzc | Gate por tipo de evento com intervalo de 30 s no bytecode; closure só materializada se aceita. Depois segue a rota de metadados/ID e transporte já descrita acima |
| TextRecognizerTaskWithResource.zzf → I.zzua.run → I.zzuc.zzh/zzg → T.internal.zzr.zza → TextRecognizerTaskWithResource.zzd | Rota adicional acumula durações por chave de código/flags/idioma e monta contagem/estatísticas; converge em zzuc.zze, sem tornar anônimo o envelope com ID |

O intervalo de 30 s é constante inspecionada do SDK, não latência medida nem
recomendação para esperar entre capturas. O gate e as condições de execução
impedem presumir um evento enviado por gesto ou que observar um período sem
tráfego prove ausência de telemetria. Flags/idioma/tamanho são metadados técnicos,
mas essa classificação não demonstra anonimização do envelope.

### Rota adicional além de DataTransport

`TextRecognizerTaskWithResource` também constrói **I.zzue** e, no final de zzf,
chama `zzue.zzc(getLoggingEventId(), codigo, inicio, fim)` (146–166).
No artefato latino 19.0.1, getLoggingEventId retorna 24317 ou 24306 conforme
getIsThickClient. São constantes técnicas do SDK, não medições do aparelho.

`zzue` obtém `TelemetryLogging.getClient` com API `mlkit:vision`. Seu método zzc
monta MethodInvocation/TelemetryData e chama `TelemetryLoggingClient.log`
(offset 58). Nessa montagem há inteiros, tempos e dois argumentos String nulos;
não há imagem ou texto OCR como argumento nesse trecho. Um listener de falha
guarda tempo e o gate pode suprimir novas chamadas por 30 minutos. Isso é
inspeção de condições internas, sem evidência de aceitação/envio pelo serviço.

A auditoria de rede não pode ser encerrada apenas pela revisão de bancos
DataTransport ou contadores da UI do app. Esta nova rota exige rastrear também
a implementação transitiva de TelemetryLoggingClient e suas condições/destinos;
não foi inspecionado tráfego de Google Play services ou qualquer outro app.
Não solicitar dump global, identificadores, bancos ou logs completos ao autor.

### Conclusão permitida e próximo trabalho

O vínculo da API usada pelo Aferi com produtores e duas interfaces de transporte
foi aprofundado. A closure antes pendente usa metadados da imagem no corpo
examinado; sua referência a InputImage não é prova de pixels enviados. Também
não prova ausência de conteúdo sensível nos demais produtores, módulo nativo,
encoders, logs, serviços ou versões transitivas. Agregação de durações não
resolve a presença de identificador persistente no envelope já rastreado.

Continuam pendentes: demais produtores de inicialização/carga/erro, encoders dos
campos específicos e implementação de TelemetryLoggingClient; depois, protocolo
isolado de runtime com entradas sintéticas que distinga app/SDK/dev launcher/SO,
armazenamento, logs e reconexão. Nenhuma configuração de privacidade suportada
foi comprovada nesta inspeção. Não alterar dependências, usar reflexão/toggles
ofuscados, substituir motor ou habilitar integração clínica por esses resultados.

O diagnóstico associacao-1 continua sem retorno físico registrado. Sua rodada
sintética é independente da auditoria de privacidade e não a aprova. TASK-07,
TASK-10 e TASK-18 permanecem parciais; horas/despesas/saldos não informados.
