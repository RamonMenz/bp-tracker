# TASK-09 — Etapa 4, protocolo congelado A/B do ROI591

## Estado e objetivo

Protocolo preparado **antes da coleta**. Nenhum resultado novo de OCR foi recebido.
Base remota consultada: staging `ef4a97613554e9b6ebc9e4e2d0fa45aa9949649a`, PR83
merged. Candidato não mudou com o merge. Constituição, CLAUDE, tasks, spec de
fotografia, diagnóstico do visor, plano de correção e fechamento da etapa3 são
as referências. TASK-04/06/07/09/18 e habilitação clínica continuam abertas.

Experimento de viabilidade local com **dois cartões inventados**, não com LCD ou
medições reais. Duas capturas no máximo, A depois B. Uma chamada original e uma
processada por captura, sequenciais no mesmo quadro. Não reutilizar resultados
históricos do APK259 como passagens desta coleta. Não selecionar sucessos,
repetir falhas, mesclar campos, escolher melhor passagem ou buscar parâmetros.

## Identidades e parâmetros fixos

| Item | Valor congelado |
|---|---|
| Dispositivo relatado | Samsung SM-S731B |
| Fonte do app | 45f7376a7ed2f7e04725866ffe98ff625f057566, limpa |
| APK instalado | 591555a24e8ba0d952c8dc93829c8204b3c731348764a61f80c29a79580038f6 |
| Bundle de arquivo consultado | 98d31d1e0523c3e8c00fbda33f052ea9e6637b8062c04478a3cb01111d3375c2 |
| Cartões | tools/task09/cartoes-ocr.html da fonte45; blob Git normalizado42ee8e651b8dc0c6b30eafd3c6ccac99a746ce12; SHA256 do conteúdo LF f70ee21e27de1b1f451eb890969e473c7adcf814696f27603027dff6f25e4713 |
| Verdade sintética de ambos | SYS/SIS120; DIA80; PUL/PULSO72 |
| A / B | Fonte Arial comum / dígitos CSS de sete segmentos; mesmos rótulos/unidades |
| UI/revisões | captura-5, associacao-3, bridge-2; modo explícito comparação roi-1 |
| Motor e fluxo | CameraX, NV21 em RAM, ML Kit latino embarcado; parser existente |
| Ordem fixa | A original→A processado; B original→B processado |
| Variante única | ROI/orientação/escala roi-1; nenhuma luminância/varredura/reconstrução |
| Guia | Margem0.08 do preview, ROI efetivo arredondado para fora e projetado por CameraX/ViewPort |
| Escala | Bilinear Y/VU, alvo de eixo1600, ampliação até2; saída par por eixo |
| Teto | 1920000 pixels por quadro; original+saída próprios até5760000 bytes |

Escala efetiva deriva uma vez da geometria: mínimo de2, 1600/eixo maior do ROI e
raiz(1920000/áreaROI); dimensões arredondadas para baixo a múltiplos de2. Registrar
dimensões/ROI/rotação expostos, sem editar. Isso não mede heap total/SDK/GPU.
As caixas processadas voltam ao upright-frame de origem; não alterar o parser.

Fixar telefone em retrato e orientação estável antes de começar. Manter o mesmo
monitor, zoom do navegador100%, brilho atual fixo, posição/tamanho da janela,
distância e iluminação entre A/B. Sem zoom digital ou ajustes após resultados.
Não inventar distância/brilho medidos. Posicionar o cartão inteiro, inclusive
rótulos à direita, dentro da guia com folga; não enquadrar apenas números.
O quadro original também deve conter só fundo não clínico e o cartão: fechar
documentos pessoais, notificações e janelas clínicas antes de posicionar câmera.

## Preparação e elegibilidade

Usar a sessão recuperada já relatada: demo correta, conteúdo montado, comparação
disponível, Fast Refresh desligado, Metro parado/reverse0, redes declaradas off,
active/cancelled/nao-carregado, sem revisão/preview/indicador ou erro. Cancelled
após configurações é esperado. Não recarregar nem reconstruir esse estado só
para começar. O hash identifica arquivo de bundle, não todo o código em RAM.

Se app morreu, fonte/artefato mudou, voltou à home de desenvolvimento, reiniciou
Metro/redes/reverse, Fast Refresh atuou ou houve erro: **não capturar**; informar
qual condição mudou. Usar recuperação vinculada ao pacote, sem atalho a/Expo Go,
e novamente identificar bundle/preparar offline conforme registro do APK591
antes de uma coleta futura. Não presumir que bundle diferente é equivalente.
Não improvisar essa recuperação durante a rodada.

No PC abrir o arquivo local dos cartões. Não é necessário servir HTTP nem
conectar o telefone. Comandos na raiz da cópia original (não no terminal do Metro):

```powershell
& {
    $ErrorActionPreference = 'Stop'
    $repo = (git rev-parse --show-toplevel)
    if ($LASTEXITCODE -ne 0 -or -not $repo) { throw 'repo-unavailable' }
    $build = Join-Path (Split-Path -Parent $repo) 'aferi-task09-roi-build'
    $tools = Join-Path (Split-Path -Parent $repo) 'aferi-task09-roi591-offline-tools'
    $head = (git -C $tools rev-parse HEAD)
    if ($LASTEXITCODE -ne 0 -or $head -cne '1eac9017182fbf9e1993eb5028dfaec50a501472') { throw 'offline-tools-head-unexpected' }
    $changes = @(git --no-optional-locks -C $tools status --porcelain --untracked-files=all)
    if ($LASTEXITCODE -ne 0 -or $changes.Count -ne 0) { throw 'offline-tools-not-clean' }
    Import-Module "$tools\tools\task09\AferiRoiCandidate.psm1" -Force
    Assert-AferiRoiSource $build
    $cards = Join-Path $build 'tools\task09\cartoes-ocr.html'
    $blob = (git -C $build hash-object --path=tools/task09/cartoes-ocr.html -- $cards)
    if ($LASTEXITCODE -ne 0 -or $blob -cne '42ee8e651b8dc0c6b30eafd3c6ccac99a746ce12') { throw 'cards-identity-unexpected' }
    Start-Process -FilePath $cards
}
```

Esse arquivo não tem scripts, fontes remotas ou persistência; não o editar.
O blob Git normaliza as terminações de linha do checkout, evitando rejeitar
somente a diferença LF/CRLF no Windows. O SHA256 LF é referência de conteúdo.
Selecionar A na página e deixar retângulo completo visível, sem rolagem/corte.
No telefone confirmar modo avião, Wi-Fi/Bluetooth/dados móveis off, VPN e todas
as ancoragens off (inclusive USB), Metro parado e reverse0 do último retorno.
Essa declaração não substitui medição independente por UID/destino. ADB por USB
não é ancoragem. Não habilitar rede para carregar ML Kit: modelo é embarcado;
pedido de download/rede é impedimento técnico. Não abrir apps de cronômetro no
telefone durante uma tentativa.

## Coleta única de A

1. Na demo tocar **Selecionar comparação original/processado**. Aguardar eventual
   closing encerrar e ver modo selecionado. Não usar revisão simples.
2. Com A no PC, tocar **Iniciar câmera Android** uma vez. Se aparecer diálogo
   normal de CAMERA, conceder durante uso. Pedido de áudio/mídia/rede é parada.
3. Aguardar guia azul e botão Capturar habilitado/fase ready. Nativo deve ser
   roi-1 após carregar o binding; nao-carregado antes de iniciar era esperado.
   Preservar cartão inteiro, números/rótulos/unidades dentro da guia. Estabilizar
   antes do disparo; não girar, redimensionar preview ou alternar aplicativos.
4. Tocar **Capturar e reconhecer** uma única vez. Não tocar de novo enquanto
   recognizing/closing. Não cancelar para buscar resultado melhor.
5. Aguardar **Comparação encerrada. Resultados separados abaixo.** O app executa
   original→completion→transformação→processado→completion→cleanup; não são dois
   disparos manuais. Confirmar blocos Original e Processado distintos e fonte
   técnica de comparação roi-1/mesmo-quadro/sem-mescla. Não há botão confirmar.
6. Transcrever formulário de A **antes de cancelar**, incluindo diagnósticos
   sanitizados das duas passagens. Conferir separadamente SYS120/DIA80/PUL72.
   Se número incorreto aparecer como candidato, ou ocorrer condição de parada,
   interromper aqui e marcar B não executado. Ausente/incerto sozinho é resultado:
   registrar, sem retry; B pode seguir se recursos/privacidade estiverem normais.
7. Observar câmera desligada/preview ausente/indicador encerrado e fase reviewing,
   que só recebe o par após ACK de cleanup. Tocar **Cancelar captura** uma vez,
   aguardar fim de closing e fase cancelled, par antigo descartado e possibilidade
   de iniciar outra tentativa. Não presumir liberação só pela ausência de imagem.

## Coleta única de B

Só prosseguir se A não exigiu parada e seu encerramento foi normal. No PC trocar
somente o seletor para **B — sete segmentos**, sem mudar posição, brilho, zoom ou
tamanho. No telefone manter o modo comparação. Repetir os passos2–7 uma única vez,
agora registrando B. Ordem total Aoriginal/Aprocessado/Boriginal/Bprocessado.
Se faltar guia ou o cartão não couber mantendo a configuração, interromper;
não variar distância/parâmetros entre tentativas para conseguir um sucesso.

São **até duas capturas, até quatro chamadas SDK sequenciais**. Falhas não geram
reposição. Cartão não executado deve ser registrado como tal. Cancelamento manual
interpassagens não é provocado nesta rodada; não alegar que foi testado fisicamente.
Cancelar após resultado exercita descarte e reutilização, não todos os cenários
de background/desmontagem/late result. Os testes simulados anteriores mantêm esse
alcance limitado. Não introduzir terceira captura para medir recursos.

## Parada e duração

Parar em erro técnico, número errado apresentado como candidato, mistura de
passagens, resultado antigo ressurgindo, guia/rotação perdidas, permissão/rede
inesperada, reconexão, app em background durante captura, travamento/fechamento,
camera/indicador persistentes, cleanup-failed/blocked ou incapacidade de descartar.
Não tentar compensar com campo do outro cartão ou da outra passagem.

Timeouts já implementados: permissão30s, abertura/espera pelo gesto60s,
quadro10s, comparação30s e ACK de cleanup10s. São limites do código, não métricas
atingidas. Aguardar as mensagens do app; não prolongar com novos toques. Se não
há saída após o intervalo de reconhecimento+cleanup (até40s após o disparo),
cancelar uma vez se UI responder e registrar a fase/impedimento. Se persistir
blocked/indicador, não tratar como cleanup concluído nem começar B.

Se já houver relógio/cronômetro externo disponível sem trocar o app do telefone,
anotar duração aproximada toque→par visível. É tempo do par incluindo UI/cleanup,
não tempos separados do SDK. Caso contrário, marcar não medido. Tempos por
passagem, heap total, alocações reais SDK/GPU e p50/p95: não medidos nesta rodada.
Só os bytes próprios reportados pela transformação podem ser transcritos como
metadados calculados, sem confundir com profiler de RAM. Sem heap dump/logcat.

## Encerramento e restauração das conexões

Depois de transcrever B (ou o motivo de parada), tocar Cancelar uma vez se ainda
houver estado ativo/revisão; aguardar o encerramento e anotar fase, indicador,
descarte e eventual erro. Não avaliar câmera após force-stop como prova de cleanup.
Não repetir capturas. Mantenha redes off até conter o processo da demo.

Fechar somente o pacote de avaliação com comando guardado abaixo. Isso é
contenção/encerramento do processo, não uninstall, clear, prova de apagamento
físico da RAM ou substituto do completion SDK. Se foi necessário por travamento,
registrar encerramento forçado por falha; a rodada fica bloqueada.

```powershell
& {
    $ErrorActionPreference = 'Stop'
    $repo = (git rev-parse --show-toplevel)
    if ($LASTEXITCODE -ne 0 -or -not $repo) { throw 'repo-unavailable' }
    $tools = Join-Path (Split-Path -Parent $repo) 'aferi-task09-roi591-offline-tools'
    $head = (git -C $tools rev-parse HEAD)
    if ($LASTEXITCODE -ne 0 -or $head -cne '1eac9017182fbf9e1993eb5028dfaec50a501472') { throw 'offline-tools-head-unexpected' }
    $changes = @(git --no-optional-locks -C $tools status --porcelain --untracked-files=all)
    if ($LASTEXITCODE -ne 0 -or $changes.Count -ne 0) { throw 'offline-tools-not-clean' }
    Import-Module "$tools\tools\task09\AferiRoi591Readiness.psm1" -Force
    Import-Module "$tools\tools\task07\AferiEvaluationAdb.psm1" -Force
    $adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
    $device = Get-AferiRoiInstalledIdentity $adb
    if ($device.EstadoAdb -cne 'device' -or $device.ModeloConfere -ne $true -or $device.Sha256Instalado -cne '591555a24e8ba0d952c8dc93829c8204b3c731348764a61f80c29a79580038f6') { throw 'roi591-stop-device-unexpected' }
    $stopped = Invoke-AferiEvaluationAdbProcess -AdbPath $adb -Arguments @('shell','am','force-stop','com.ramonmenz.afericapturetest')
    if ($stopped.Code -ne 0) { throw 'roi591-stop-not-confirmed-keep-offline' }
    [pscustomobject]@{Tool='roi591-end-1';ForceStopSolicitado=$true;ComandoRetornouSemErro=$true;InstalacaoExecutada=$false;DadosLimpos=$false} | ConvertTo-Json
}
```

Só após o comando sem erro, restaurar manualmente as conexões usuais desejadas
do telefone. Não ligar automaticamente tudo. Reverse continua0 e Metro parado;
não é necessário restaurá-los para o uso normal do telefone. Uma futura sessão
da demo usará o roteiro de pacote explícito/Metro validado, sem atalho a. Se o
encerramento não puder ser confirmado, manter a demo sem novos gestos e informar
impedimento antes de qualquer tentativa de reconexão. Não pedir novo build ou
limpar/reinstalar para recuperar a rodada.

## Formulário sanitizado

Usar apenas textos abaixo/linhas técnicas fixas exibidas. Sem fotos, screenshots,
OCR bruto, valores incorretos transcritos, certificados, URLs, payloads ou logs.
Valores120/80/72 são permitidos porque definidos pelo cartão inventado.

```text
Identidade: APK591 / fonte45 / bundle98d31d1e… / cartao-blob42ee8e65…
Modo comparacao roi-1 / captura-5 / associacao-3 / bridge-2: conferem ou divergencia
Sessao offline conforme declaracao anterior: sim/nao; mudanca/impedimento:
Retrato; mesmo monitor/zoom100/brilho/posicao/distancia/luz: sim/nao
Camera/permissao: ja concedida/dialogo CAMERA/negada/inesperada
Capturas: A=0 ou1; B=0 ou1. Motivo de nao executar:

A original: SYS= ; DIA= ; PUL= ; troca=sim/nao/indeterminavel
A processado: SYS= ; DIA= ; PUL= ; troca=sim/nao/indeterminavel
B original: SYS= ; DIA= ; PUL= ; troca=sim/nao/indeterminavel
B processado: SYS= ; DIA= ; PUL= ; troca=sim/nao/indeterminavel
Cada campo: exato(120/80/72 conforme campo), ausente, incerto, numero-incorreto,
troca-de-campo, nao-executado. Nao copiar o numero errado.

Para CADA uma das quatro linhas/passagens:
- Diagnostico disponivel: sim/nao
- Linhas fixas ocr:/associacao:/rotulo: (somente indicadores)
- Linhas fixas bridge:/sdk:/descarte:/digitos-descartados:
- Linhas tecnicas quadro:/preview: (dimensoes/rotacao/mapeamento)
Para CADA par: linhas comparacao:/transformacao:/buffers: (sem caixas OCR)
A encerramento: fase; preview/indicador desligados; par descartado ao cancelar;
  iniciar novamente disponivel; erro; duracao do par=aproximada externa/nao medida
B encerramento: mesmos campos, ou nao-executado
Interrupcao/background/reconexao/erro valido/resultado antigo: nenhum ou categoria
Cancelamento durante passagens: nao exercitado / ocorreu involuntariamente
Memoria/SDK/GPU, tempos por passagem, p50/p95: nao medidos
Force-stop: JSON ou impedimento; por rotina apos cleanup / por falha
Conexoes restauradas depois: sim/nao/impedimento; novas capturas: nenhuma
```

Diagnósticos são categorias limitadas do código, não dump de reconhecimento.
Se alguma linha contiver conteúdo que não seja esses indicadores, não copiar.
Resultados de par interrompido são não publicados/não executados, nunca completar
com a passagem parcial ou revisão anterior. Registrar o que não pôde ser observado.

## Análise e decisão, congeladas antes do retorno

Avaliar matriz por cartão e passagem. Para avanço local: Aoriginal E Aprocessado
exatos nos três campos, Bprocessado exato nos três, sem troca, erro válido ou
regressão observável de recursos/encerramento. Boriginal é comparador, sem requisito
de falhar. Se ambos em B forem exatos, não haverá ganho incremental demonstrado.
Nenhum destes casos prova generalização, acerto universal ou suporte ao LCD.

| Retorno | Decisão |
|---|---|
| A preservado, Boriginal falha e Bprocessado exato, recursos normais | Ganho observado nessa coleta única; apto a ampliar avaliação congelada na etapa5, condicionado aos demais gates |
| A preservado e ambas passagens de B exatas | Resultado local favorável; ganho específico do pré-processamento não demonstrado; sem escolher/mesclar automaticamente |
| A ausente/incerto/regrediu, ou Bprocessado ausente/incerto | Não avançar; analisar por passagem e controle; nenhuma repetição para selecionar sucesso |
| Número errado como candidato/troca/late result/mistura | Bloquear avanço; analisar interpretação/bridge/SDK sem corrigir parser para fabricar valores |
| Falha técnica, geometria, recursos, desconexão ou protocolo interrompido | Rodada bloqueada/inconclusiva; não rotular incapacidade OCR nem buscar contraste como correção automática |
| Dígitos no Text/Block/Line mas descartados na bridge | Investigar contrato/filtros, não concluir que motor não reconheceu |
| B sem dígitos no SDK em ambos, rótulos presentes e geometria/controle válidos | ROI1 ineficaz para esse estímulo; não prova incapacidade universal do ML Kit |

**Única segunda variante condicional:** normalização de luminância só será
proposta se o retorno/evidências já disponíveis fornecerem motivo fotométrico
concreto compatível com controles/geometria. Ausência de dígitos, sozinha, não
justifica; cartão B já é de alto contraste. Indicadores não medem luminância dos
pixels. Falha de bridge/guia/recursos não justifica normalização. Não coletar novas
amostras ou varrer parâmetros para fabricar uma justificativa. Se não houver
justificativa sustentada e ROI1 falhar em rodada válida, encerrar essa linha de
correção compatível como ineficaz no escopo observado e encaminhar viabilidade,
sem trocar motor, treinar ou reconstruir segmentos. Se houver justificativa,
documentar uma configuração fixa, novo artefato e novo protocolo ANTES de testar;
após essa segunda variante não haverá terceira/varredura. Falta de evidência por
impedimento técnico é bloqueio, não resultado inventado nem autorização de retries.

## Entrega e verificações

Este protocolo apenas documenta a etapa4 e congela decisões. Candidato, cartões,
parser, câmera, buffers e dependências permanecem iguais. Qualidade do repositório
e integridade dos comandos/links/cartão são verificadas antes de publicar; não há
build novo ou execução física pelo Codex. Etapa4 **aguarda retorno do autor**;
não declarar conclusão/eficácia, custos, durações ou métricas não medidos.

## Retorno posterior — resultado analisado

[Análise por cartão/passagem e decisão](task-09-etapa-4-resultado-roi591.md).
O protocolo acima permanece o congelado antes da coleta. A foi preservado; B
processado permaneceu incerto nos três campos. Critério de avanço não atendido,
sem justificativa fotométrica para a segunda variante. Encerrar esta linha ROI1
no escopo observado, sem repetir/selecionar sucessos ou declarar inviabilidade
universal do motor. Etapa4 analisada com resultado negativo; não iniciar etapa5
como correção aprovada. TASKs e habilitação clínica continuam pendentes.
