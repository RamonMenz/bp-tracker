# TASK-07 — primeira coleta técnica de dependências

Protocolo preparado em 23/11/2026; **primeira tentativa recebida, bloqueada por
SDK não localizado; versões resolvidas ainda pendentes**.
Complementa [retorno TalkBack](task-07-reteste-talkback.md). Não substitui auditoria
de disco/logs/rede/SO nem encerra TASK-07. Nenhuma publicação, alteração de SDK,
leitura de mídia ou exportação de bancos é autorizada por este roteiro.

## Pergunta a resolver

O sandbox contém bancos DataTransport. A documentação pública consultada na
frente #69 mostra rota transitiva ML Kit text-recognition 16.0.1 → common 18.11.0
→ DataTransport. Isso não identifica versões efetivamente selecionadas pelo
Gradle, nem conteúdo/payload ou destinos de envio. Primeiro obter a árvore
resolvida no projeto isolado que gerou o APK; depois inspecionar as versões
identificadas e planejar observação de rede por UID sem payload clínico.

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
tráfego ou versões resolvidas; TASK-07 e a auditoria de privacidade seguem abertas.

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

O Codex analisará a árvore e os artefatos/fontes das versões identificadas.
Qualquer evidência de persistência/envio clínico bloqueia habilitação; ausência
de erro nos testes de interface não homologa privacidade. Nenhum resultado da
coleta ou exame de conteúdo é presumido neste documento.
