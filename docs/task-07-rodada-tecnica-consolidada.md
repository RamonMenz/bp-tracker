# TASK-07 — rodada técnica e próxima execução consolidada

Rodada técnica registrada em 24/11/2026, baseada na staging 8e2d132 (PRs #69/#70
mesclados) e no trabalho documental do PR #71. Sem acesso ao Windows/Samsung.
Não conclui TASK-07, privacidade ou habilitação clínica.

## O que foi executado pelo Codex

- Revisão do coordenador Android, binding, hook, revisão compartilhada e módulo
  CameraX/ML Kit próprio. O caminho próprio copia NV21 em RAM, fecha ImageProxy,
  mantém buffer/lease até completion e projeta somente códigos de falha. Não
  foram encontradas APIs de arquivo de mídia ou logger clínico nesses trechos.
  Isso não inspeciona execução interna de SDK/SO nem comprova limpeza física.
- Os testes existentes cobrem permissão tardia, cancelamento durante OCR,
  descarte tardio, falha/timeout de liberação, bloqueio de recaptura e reinício
  de efeitos. Foram acrescentados quatro casos: abertura cancelada com status
  antigos durante nova tentativa; cancelamento no fechamento com candidatos já
  calculados; timeout em permissão; timeout em abertura. Coordenador: 16 testes
  aprovados com portas simuladas. Não são quatro novos ensaios de hardware.
- Verificação final: lint, TypeScript raiz/demo Android e 724 testes/66 suítes
  aprovados; Jest emite avisos act() nas suítes existentes. Sem compilação
  Kotlin/APK ou execução de SDK/SO no ambiente desta rodada.
- FrameBytes: 8 checks de buffers e 11 de dimensões aprovados em Java, sintéticos.
- Descarte da explicação acessível ao cancelar já é coberto por teste de revisão;
  ainda falta observar esse detalhe com TalkBack no aparelho.
- Contraste calculado a partir dos tokens, sem screenshot: texto/superfície,
  muted/superfície, erro/superfície, primária e desabilitado deram, respectivamente,
  14,63 / 4,76 / 6,29 / 5,17 / 6,15 no claro e 13,20 / 6,34 / 6,04 / 7,36 / 4,59
  no escuro. São razões de luminância dos pares nominais, não medição de todos
  os estados renderizados. Button declara mínimo 48×48; corpo usa 16 e scaling
  não foi desativado nos trechos revisados. Não homologa toda acessibilidade.

## Telemetria: avanço e limite da inspeção

O AAR público common 18.11.0 foi novamente obtido do Google Maven. Por
`java -m jdk.jdeps/com.sun.tools.javap.Main -c -p`, em classes.jar:

- `com.google.android.gms.internal.mlkit_common.zzsp` inicializa TransportRuntime,
  usa CCTDestination.INSTANCE, cria Event.ofTelemetry e chama Transport.send.
- zzsm/zzsn obtêm transportes via TransportFactory; zzsm contém o nome de fonte
  FIREBASE_ML_SDK. Esse nome não demonstra inicialização do Firebase clínico.

É evidência estática de uma rota de envio implementada, além das referências
encontradas anteriormente. Não prova sua execução no Samsung, conteúdo dos
eventos, anonimização, frequência ou destinos efetivamente acessados. Não houve
inspeção de bancos, captura de payload nem alteração/desativação de SDK.
Auditoria de produtores/serializadores, logs, temporários e rede/reconexão
continua aberta; leitura offline não a substitui.

## Preparação única no Windows

Preservar a cópia de integração 4dc0105 usada nas consultas Gradle. Para os dois
ensaios abaixo, usar a cópia TalkBack já criada e testada, cuja última fonte
informada foi f057283876ea2126b485abd762e2886012b4c7ca. As alterações desta rodada
são testes/documentação: não exigem reinstalar APK ou carregar novo JS.

No PowerShell, sem trocar branch, instalar dependências ou limpar dados:

```powershell
cd C:\dev\aferi-task07-talkback
git rev-parse HEAD
git status --short
$aferiSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$aferiAdb = Join-Path $aferiSdk 'platform-tools\adb.exe'
$aferiLinhaBase = & $aferiAdb shell pm path com.ramonmenz.afericapturetest |
    Where-Object { $_.Trim().EndsWith('/base.apk') } | Select-Object -First 1
if ($aferiLinhaBase) {
    $aferiApkBase = ($aferiLinhaBase -replace '^package:', '').Trim()
    & $aferiAdb shell sha256sum $aferiApkBase |
        ForEach-Object { ($_ -split '\s+')[0] }
} else {
    Write-Output 'APK base não localizado; identidade pendente.'
}
& $aferiAdb shell run-as com.ramonmenz.afericapturetest sha256sum files/DevLauncherApp-BridgelessReactNativeDevBundle.js
```

Se a pasta não existir, houver mudanças locais ou erro de identidade, retornar
o impedimento preservando tudo. Não presumir que hashes identifiquem sozinhos
o código executado. Se Metro estiver parado, usar a cópia TalkBack existente
com o procedimento de localhost/IPv4/reverse do [reteste](task-07-reteste-talkback.md),
sem repetir criação de worktree/npm ci/fetch. Conferir Fast Refresh desativado,
captura-5/preview-1 e texto novo da confirmação. Um Metro por vez.

## R1 — captura sem internet externa

1. Com demo carregada e câmera desligada, registrar conexão inicial. Manter
   USB, reverse e Metro no computador; desligar Wi-Fi e dados móveis no Samsung.
   Não fazer recarga deliberada. USB localhost continua sendo comunicação local,
   portanto não descrever como ausência absoluta de rede.
2. Iniciar, capturar uma vez o cartão sintético 120/80/72 e conferir os campos.
   Esperado: revisão com esses candidatos, preview fechado e indicador apagado,
   sem dependência de internet externa. Se houver falha de carregamento/bundle,
   distingui-la de falha do OCR e registrar sem repetir até obter sucesso.
3. Cancelar a revisão. Esperado: descarte, sem retomada automática. Não solicitar
   confirmação clínica, inventários repetidos ou logs completos.
4. Restaurar as conexões anteriores ao terminar. Registrar somente eventual erro
   ou comportamento automático percebido; isso não observa nem exclui envio de
   eventos na reconexão, que permanece pendente de instrumentação adequada.

## R2 — mensagem acessível após cancelar

1. Habilitar TalkBack com forma conhecida de desativá-lo; usar o mesmo cartão.
2. Capturar e editar sistólica para 70, mantendo diastólica 80. Esperado: motivo
   compreensível e confirmação impedida. Navegar até a explicação é válido;
   anotar anúncio automático separadamente, sem tratá-lo como obrigatório por si só.
3. Cancelar a revisão. Esperado: mensagem de revisão cancelada, sem campos,
   disponibilidade ou motivo pertencente à revisão anterior.
4. Iniciar nova captura explicitamente. Esperado: novos candidatos do cartão,
   sem edição 70 ou motivo antigo. Cancelar ao final e desativar TalkBack.

## Uma única devolução

```text
Preparação: HEAD/status; houve reinstalação?; hashes APK/bundle; marcadores;
Fast Refresh desativado?; houve recarga/reinício durante os casos?
R1: Wi-Fi/dados móveis desligados?; USB/reverse mantidos?; valores reconhecidos;
preview/indicador encerrados?; cancelamento descartou?; erro de bundle/OCR?;
ao restaurar conexões houve comportamento automático percebido?
R2: bloqueio/motivo identificáveis?; anúncio por navegação ou automático?;
ao cancelar sumiram campos/motivo antigo?; nova captura recuperou edição 70?;
cancelamento final funcionou?
Medidor: marca G-Tech, modelo BSPII informado pelo autor; rótulos/organização
do visor ainda não informados. Descrever apenas rótulos/posições, sem valores reais.
```

Cada caso é executado uma vez nesta rodada. Divergências geram análise/correção
direcionada, sem repetir A–K. Não solicitar fotos/áudios do produto, bancos,
credenciais, serial, dumps globais ou instalação de monitor de rede.

T0/T1/T2 fica **opcional e de baixa força de evidência**, sem ser condição para
R1/R2 ou para avançar a auditoria técnica. Os blocos S03/S04/S05 permanecem
parciais em hardware: testes simulados não cobrem a implementação interna do
SDK nem recriação real da Activity. Medidor real exige investigação própria;
não presumir rótulos, causa ou acurácia com base na marca/modelo.
