# TASK-07 — continuidade, rodada técnica e resultados consolidados

Rodada técnica registrada em 24/11/2026, baseada na staging 8e2d132 (PRs #69/#70
mesclados) e no trabalho documental do PR #71. Sem acesso ao Windows/Samsung.
Não conclui TASK-07, privacidade ou habilitação clínica.

## Ponto de retomada — consolidação do aprendizado deste chat

Atualizado em 24/11/2026 a pedido do autor, para permitir retomada sem depender
de memória da conversa ou acesso a outros chats. Este é o índice de continuidade;
os documentos vinculados preservam detalhes e correções históricas. Datas de
registro não são datas presumidas de execução dos testes.

### Estado verificado do Git nesta consolidação

- Repositório RamonMenz/bp-tracker; destino autorizado dos PRs: staging.
- PR #69 mesclado em 64aa395aa0794bd9861dc6a7cfd877ecd5f86d18; PR #70 mesclado
  em 8e2d132f5fa7c0f53eb57cf4bb3a8efc6b518207, que é a staging consultada.
- PR #71 aberto, não mesclado; branch docs/task-07-sdk-dependency-insight.
  Checkpoint anterior a esta consolidação: 554469e0de485bb2ad3ba8c45fb9d77bdc4a7a7e.
  Novos commits documentais não exigem trocar APK/JS. Reconsultar head/checks/base
  antes de decisões futuras; estes dados são um retrato, não estado permanente.
- As cópias locais existentes foram preservadas. Não aplicar patches históricos
  sobre o código atual nem apagar worktrees para retomar.
- Se, após outro merge em staging, GitHub exigir atualização do PR: incorporar
  a base na branch do PR e aguardar checks do novo head. Checks antigos verdes
  não dispensam essa exigência; atualizar branch não faz merge do PR na staging.

### Onde encontrar cada evidência

| Documento | Conteúdo / uso |
|---|---|
| [Registro inicial](task-07-registro-validacao-android.md) e [artefatos históricos](evidencias/task-07-android-2026-11-11/README.md) | Depuração, patches e manifesto; preservar bytes/hashes e não executar automaticamente |
| [Roteiro Windows](task-07-roteiro-windows-android.md) | SDK/ADB, build, Metro e diagnóstico inicial |
| [Integração Android](task-07-integracao-android.md) | Correções integradas, contratos e protocolo original S01–S09 |
| [Resultados Samsung](task-07-resultados-samsung.md) | Rodadas originais e A–K, inventários, hashes e esclarecimentos de transcrição |
| [Reteste TalkBack](task-07-reteste-talkback.md) | Correção do PR #70, carregamento do JS e retorno K1 |
| [Auditoria de dependências](task-07-auditoria-dependencias.md) | Falha/recuperação SDK, Gradle resolvido, AARs, UID/netstats e limites de rede |
| Este documento, seções abaixo | Testes técnicos, R1/R2, descrição BSPII e rastreio de identidade do SDK |
| [tasks.md](../tasks.md) e [spec fotografia](../specs/spec-fotografia.md) | Tarefas ainda abertas, critérios aplicáveis e decisões técnicas preservadas |

### Baseline que não deve ser confundida

- Samsung S25 FE, SM-S731B; Android/API 17/37 declarados. Compile/target SDK 36
  são configuração de build, não versão do Android do telefone.
- Windows: Node/npm/JDK v24.22.0/11.19.1/17.0.21 informados na primeira coleta;
  não presumir que continuem instalados em outra máquina/sessão.
- Cópia C:\dev\aferi-task07-integracao em 4dc010599747bcb6de2b5e2f939f030e9cbe4ea8,
  limpa na consulta recebida: projeto Android gerado usado no build/Gradle.
- Cópia C:\dev\aferi-task07-talkback em f057283876ea2126b485abd762e2886012b4c7ca,
  limpa na preparação R1/R2: JS com correção acessível. Pasta da demo para Metro:
  demos/android-capture. Não misturar essa fonte com a cópia 4dc0105.
- Hashes completos do APK instalado e bundle estão na tabela do retorno R1/R2
  abaixo. APK 69d5a0b3… e bundle TalkBack 86017456… coincidem com os anteriores.
  O bundle antigo a7b2efd2… pertencia às rodadas anteriores à correção JS.
  Marcadores captura-5/preview-1 não identificam a correção acessível sozinhos.
- Confirmação na demo é exclusivamente em memória. Leitura positiva do cartão
  120/80/72 não comprova medidor real, corpus, acurácia geral ou escrita clínica.

### Lições operacionais e de interpretação

- Manter Metro no terminal da demo e usar outro PowerShell para Git/ADB. USB
  reverse usa porta 8097. Se localhost responder e 127.0.0.1 não, investigar
  binding IPv4; o reinício orientado com dns-result-order=ipv4first resolveu o
  caso relatado. Conferir /status antes de abrir a demo, sem prometer causa única.
- ANDROID_HOME precisa existir no mesmo PowerShell do Gradle; adb.exe localizado
  não basta. Apontar SDK já instalado, sem atualizar SDK/Gradle por tentativa.
  Manter --offline nas consultas; dependencyInsight bem-sucedido não é novo build.
- adb sem dispositivo significa comando não executado no telefone. Não registrar
  erro de conexão como falha de instalação/OCR ou inventário vazio aprovado.
- Fast Refresh desativado eliminou a faixa Atualizando no ensaio relatado; isso
  não prova a causa de todas as recargas. Preservar opções NODE_OPTIONS anteriores.
- journala no inventário A e DIA 90 em J1 foram esclarecidos pelo autor como
  erros de transcrição: journal e DIA 80. Preservar a correção rastreável, sem
  tratar as versões iniciais como falhas do SDK/OCR.
- Nomes/metadados iguais não comprovam conteúdo igual nem ausência de temporários.
  Hash igual prova igualdade daquele arquivo nos momentos consultados, não de
  todo sandbox, memória, banco ou tráfego. mtime diferente com hash igual também
  não identifica causa ou vazamento. Não calcular percentuais a partir disso.
- Sem permissão/abertura/OCR suficientemente lentos, não pedir tentativas humanas
  indefinidas: usar testes controlados e registrar limites de hardware.

### Pendências e limite desta etapa

Rodada posterior de ciclo de vida solicitada em 24/11/2026:
[matriz TASK-07/10/18, fonte/APK, grupos e estados separados](task-07-ciclo-vida-samsung.md).
O retorno inicial informa Metro desligado e terminal de mais cedo com f057283
limpa, APK 69d5a0b3… e bundle 86017456…; G0 atual ainda pendente. Não é novo
ensaio físico nem validação automática das etapas históricas abaixo.

Retorno posterior G0: fonte limpa e hashes atuais de APK/bundle coincidentes,
Metro/demo funcionais, idle/nao-carregado, Fast Refresh desligado e câmera sem
uso ativo/revisão antiga. G0 passou para versão/carregamento; modelo atual não
foi transcrito. [Análise e G1 liberado, sem Capturar/OCR](task-07-ciclo-vida-samsung.md#retorno-g0--versão-e-carregamento-confirmados):
somente L03 e, se encerrar normalmente, L11; ambos sem resultado novo recebido.

| Frente | Estado / próximo trabalho |
|---|---|
| Rede ativa | Nenhuma medição conclusiva; cmd netstats sem implementação; T0/T1/T2 opcional por baixa força de evidência |
| Offline/reconexão | R1 positivo para captura offline; sem anormalidade percebida ao reconectar, sem prova de ausência de envio |
| Disco/telemetria | Dependências e rotas estáticas identificadas; falta verificar dados efetivos, anonimização e comportamento em runtime |
| Logs/falhas | Caminho próprio revisado; coletores e internos SDK/SO não homologados |
| Cancelamento/concorrência | Testes automatizados cobrem mais fases; S03/S04/S05 continuam parciais em hardware, sem recriação real demonstrada |
| Acessibilidade | K/reteste/R2 positivos no alcance descrito; não presumir anúncio integral automático ou todos os estados renderizados |
| Medidor real | BSPII G-Tech descrito; vocabulário/layout sintético aceitos pelo parser; causa da ausência de candidatos reais não determinada |
| Consolidação/regressão | Última suíte de código: 726 testes/66 suítes; atualizar evidências por mudança, sem repetir toda A–K por rotina |

Os oito blocos não são oito testes simples nem percentual de TASK-07. Cada
conclusão deve indicar alcance, falha ou bloqueio; não inventar quantidade fixa
de execuções restantes. Corpus de dois medidores, avaliação quantitativa,
comparação Android/Web, persistência clínica/filas/isolamento de contas e
validação integral do legado são trabalhos posteriores, não aceites desta demo.

### Ponto em que o autor pode parar / sequência para retomar

R1/R2 encerrados no alcance relatado. Autor foi orientado a cancelar fluxo ativo,
conferir câmera desligada, fechar demo/TalkBack, encerrar Metro com Ctrl+C e
desconectar USB. São instruções, não confirmação de que as executou. Preservar
pastas, APK instalado e resultados; nenhuma nova captura ou foto foi solicitada.

Próximo trabalho independente: aprofundar produtores/serializadores de telemetria
e compatibilidade com a constituição; preparar diagnóstico dirigido que distinga
OCR de associação de campos do BSPII, sem expor imagem/texto/valores clínicos.
Qualquer nova rodada física deve ter versão, objetivo, passos, resultado esperado
e uma única devolução sanitizada. Não pedir de novo resultados já registrados
sem uma mudança/falha que justifique a repetição.

Manter ML Kit embarcado/Tesseract e caminho legado definidos nas specs. Capturas
em memória, sem arquivo intermediário, logger clínico ou fallback remoto; nenhuma
escrita/fila antes de confirmar. Preservar cancelamento, exclusão de recursos,
descarte tardio e isolamento de contas. Não acessar produção, mudar SDK por
tentativa, fazer merge/deploy ou habilitar uso clínico automaticamente. Autorização
existente abrange commits/push/PRs para staging após verificações. Revalidar Git
ao retomar e continuar trabalho independente enquanto depender do aparelho.

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
  o retorno físico R2 posterior está registrado abaixo.
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

## Retorno recebido de R1/R2

Fonte: relato do autor e comandos transcritos; sem acesso ao Windows/aparelho.
Data/hora da execução não informadas. Preparação recebida:

| Identificador | Resultado |
|---|---|
| HEAD da cópia TalkBack | f057283876ea2126b485abd762e2886012b4c7ca |
| git status --short | Sem saída, limpo |
| SHA-256 do base.apk instalado | 69d5a0b31023a9b3647b0036cc2eb3af0683be19a02782a2b8e834635849e09c |
| SHA-256 do bundle no sandbox | 860174567097a3b5501ecf158c8aef2a32edeb44b112ac2b3f94e68e0ca81388 |

APK coincide com o hash instalado/local anteriormente recebido; bundle coincide
com o reteste TalkBack. São identidades dos arquivos consultados, sem par
antes/depois desta rodada nem prova isolada de qual código estava em execução.
Não foram repetidos marcadores, Fast Refresh ou informação de reinstalação;
não preencher essas lacunas por suposição nem exigir nova rodada sem motivo.

**R1 — positivo no alcance relatado:** autor informa captura/reconhecimento
funcionais com Wi-Fi e dados móveis desligados, sem erro percebido. Após
religá-los, não percebeu comportamento estranho. Não transcreveu valores por
campo, indicador/preview/cancelamento separadamente nem forneceu medição de
rede. O relato sustenta funcionamento nessa condição, não ausência absoluta
de rede (USB/localhost permanecia no roteiro) ou de tráfego na reconexão.

**R2 — positivo para descarte e orientação:** após editar SYS para 70, autor
ouviu logo em seguida a regra de que a sistólica deve ser maior que a diastólica.
Cancelou; campos/explicação antigos desapareceram; nova captura não recuperou
a edição 70. Sem erro percebido. Não detalhou se houve navegação/foco adicional,
qual elemento anunciou a regra ou a fala completa de disponibilidade; portanto
não descrever como anúncio automático integral do status comprovado. O novo
relato complementa o reteste anterior, sem apagá-lo ou presumir contraste/
acessibilidade integral. Não acrescentar confirmação/cancelamento final não
detalhados nessa resposta.

Não repetir R1/R2 nem A–K com base apenas nessas lacunas de relato. Próximo
trabalho é técnico: rastrear produtores/serializadores e compatibilidade da
telemetria, mantendo a investigação do layout G-Tech BSPII separada. Não há
aprovação de privacidade, medidor real, persistência clínica ou TASK-07.

### Layout do G-Tech BSPII — esclarecimento do autor

Autor descreveu `SIS\nmmHg`, `DIA\nmmHg` e `PULSO\nmin`, cada conjunto à direita
do valor, com quebra de linha entre rótulo/unidade. Não forneceu foto ou medidas
de caixas; não inferir posições verticais exatas ou a saída real do OCR.
Não é necessário enviar fotografia com valores reais para esta reprodução.

O interpretador já aceita SIS/DIA/PULSO, ignora mmHg/min e admite número à
esquerda do rótulo. Dois testes adicionais usam valores/coordenadas sintéticos
inspirados nessa descrição: unidade agrupada com rótulo ou em linha separada,
com permutação da ordem dos tokens. Não alteram as regras para fazer o ensaio
passar; tampouco comprovam a detecção ML Kit de letras/dígitos/sete segmentos.
Ausência de candidatos no medidor continua sem causa determinada: texto omitido
ou confundido pelo OCR e geometria real fora das associações permanecem hipóteses.
Após esse complemento: lint, TypeScript raiz e 726 testes/66 suítes aprovados,
incluindo 43 testes de interpretação. Sem alterações no código de produção.

## Auditoria estática complementar — identificador de instância do SDK

Por javap -c -p nos AARs públicos common 18.11.0 e
[play-services-mlkit-text-recognition-common 19.1.0](https://dl.google.com/dl/android/maven2/com/google/android/gms/play-services-mlkit-text-recognition-common/19.1.0/play-services-mlkit-text-recognition-common-19.1.0.aar),
versões presentes na árvore Gradle recebida. SHA-256 desse segundo AAR:
`3be02b3c3c829476100f01d0ab79f0b4a923da23909d3ac63e486d1a63381c58`.

- SharedPrefManager.getMlSdkInstanceId consulta a chave ml_sdk_instance_id;
  se ausente, gera UUID e usa SharedPreferences.Editor.putString/apply.
- O produtor OCR interno zzuc consulta esse método e passa a string ao builder
  zzsr.zzi antes de entregar o evento à interface zzts. O getter zzst.zzi é
  lido pelo encoder zzmg no campo mlSdkInstanceId; o encoder common zzkh também
  declara esse campo. Há rota estática para identidade de instância em eventos.

Isso não é só um nome de campo no esquema: há rotina de persistência e produtor
que solicita o identificador. Porém, não foi lido identificador do aparelho,
não houve captura de eventos nem confirmação da execução/envio dessa rota no
Samsung. UUID de instância não é automaticamente identidade civil, mas sua
presença impede presumir telemetria exclusivamente anônima/agregada; requer
avaliação frente à constituição. Não afirmar que valores clínicos são enviados
nem que os eventos contêm apenas métricas. Nenhuma API de SDK foi alterada ou
desabilitada por tentativa; auditoria de dados, destinos e runtime segue aberta.
