# TASK-09 — diagnóstico dirigido do visor real Android

## Base e evidência

Etapa baseada em staging `5d88c0bc709e3c114921fe8abac31655efbe11e3`, após
merge do PR#76 confirmado no GitHub. Trabalho anterior preservado. Autor
identifica aparelho G-Tech BSPII, linha Home, e relata tentativa na demo sem
identificação dos três campos. A tentativa terminou; não há diagnóstico de
associação correspondente recuperado. Não atribuir essa falha ao APK259 ou a
outro hash sem confirmação da identidade daquela execução.

Duas fotos foram fornecidas no chat, com LCD ligado/desligado. Inspeção visual
pelo assistente, sem executar ML Kit sobre elas. Fotos, valores e metadados
pessoais não foram adicionados a arquivos, fixtures, logs ou PR. Registro apenas
do layout: SIS/DIA/PULSO e unidades impressos na carcaça à direita do LCD;
dígitos de sete segmentos; região inferior com acessórios de calendário/relógio;
reflexo e contraste não uniformes. Isso não reproduz o quadro entregue pela demo.
Imagem vista pelo assistente não equivale a resultado do ML Kit no Samsung.

## Hipóteses e implementação

Enquadrar apenas o LCD pode excluir rótulos. OCR pode ler somente a carcaça,
falhar nos segmentos ou entregar caixas inadequadas à associação. Nenhuma dessas
causas foi comprovada. O parser já aceita SIS/PULSO e possui testes sintéticos
para números à esquerda dos rótulos/unidades separadas. Não relaxar geometria,
inventar campos por ordem/faixa nem substituir o motor com base nas fotos.

`associacao-2` mantém os quatro indicadores anteriores e acrescenta apenas:

- `ocr:digitos-ascii-presentes` ou `ocr:sem-digitos-ascii`;
- `rotulo:SYS=presente/ausente`, `rotulo:DIA=presente/ausente` e
  `rotulo:PUL=presente/ausente`.

Rótulos usam normalização/tokenização/dicionário do próprio parser; não se trata
de busca de substring. A presença é lexical, não conta ocorrências nem confirma
identidade, número clínico, caixa válida, proximidade ou acerto. Dígitos podem
pertencer a acessórios. Ausência de dígitos ASCII não prova ausência de imagem
ou OCR: letras confundidas com números e outros caracteres permanecem possíveis.
Não há texto bruto, valor, posição, confiança, hora, arquivo, logger, upload ou
nova captura. Diagnóstico segue transitório e os testes de ciclo de vida conferem
seu descarte. Nenhuma regra de interpretação/câmera/nativo/permissão mudou.

## Próximo ensaio — ainda não executado ou solicitado

Nenhum novo build/instalação ou repetição agora. Alteração é JS/TS, mas sua
adoção exige fonte/Metro/bundle identificados para não usar ferramentas fixadas
na fonte ca786ed de outra rodada como prova desta. App instalado e snapshots
anteriores devem ser preservados. Primeiro conferir mudança e CI do PR.

Preparar posteriormente um único ensaio dirigido com entradas não clínicas,
identidade do artefato, ambiente local controlado e redes verificadas conforme
protocolo de privacidade; nenhuma foto ou texto bruto precisa ser devolvido.
Enquadramento deve incluir LCD e rótulos externos, câmera aproximadamente frontal,
sem zoom digital e sem brilho cobrindo o visor. Não usar o ciclo de inflar/medir
como estímulo de teste. Não pedir medições adicionais ou invocar modo de teste
não documentado. LCD desligado testa layout, não leitura de segmentos; estímulo
sintético tampouco homologa o display real.

Retorno futuro: somente versão visível, App/Fase/Nativo, os oito indicadores de
associação e observação de encerramento/erro, sem screenshot ou valores.
Se não há dígitos, investigar captura/OCR; se faltam rótulos, investigar
cobertura/reconhecimento da carcaça; se ambos existem mas campos seguem incertos,
investigar associação. Essas classificações orientam, não comprovam causa.

Privacidade SDK, tráfego por UID/destino, efeito compilado do inspector e demais
critérios permanecem pendentes. TASK-04/06/07/09/18 parciais, habilitação clínica
bloqueada. Esta mudança diagnostica; não corrige ou comprova leitura do medidor.

## Verificações desta alteração

Lint, TypeScript raiz e demo, 745 testes em 67 suítes e diff sem erros de
whitespace aprovados. Testes usam somente textos sintéticos, cobrem marca sem
dígitos, acessórios numéricos, rótulos sem valores, limites léxicos, ausência de
conteúdo sensível na saída e distinção entre presença lexical/associação.
Regressões confirmam descarte do diagnóstico e rejeição de resultados tardios.
Nenhum ML Kit real, APK novo ou ensaio físico executado pelo Codex.


## Retorno do visor desligado — rótulos presentes

Autor confirmou fonte Windows a649b6c181f6a04e5b9677f286bb22b19ffa024b
limpa, preparo inspector-metro-1 e APK25990bb4… sem instalação. Tela captura-5 /
associacao-2, active/idle/nao-carregado, Fast Refresh desligado, sem câmera ou
revisão antiga percebidas. Preparação offline retornou bundle
`2191e4f100e72f97a3a899d033e48f42b6d5190987eb4efdd59d643bb3c748ee`
e ReverseAtivosDepois=0; redes/ancoragens/VPN conforme roteiro por declaração.

Uma captura do medidor desligado: linhas presentes; três campos incertos por
ilegível ou distante; dígitos ASCII presentes; três rótulos presentes. Autor
avisou possibilidade de erro de digitação; escreveu associação com acento e
PUl com último caractere minúsculo. Esta síntese interpreta as categorias
relatadas, sem tratar essas grafias como saída literal do software.

Esclarecimento sem repetição: cancelled/nao-carregado foi antes de Iniciar;
autor depois viu preview e ready antes de Capturar. Câmera encerrou após OCR,
cancelamento encerrou revisão, sem retomada/recarga/erro percebidos. Reverse
restaurado pelo preparo, mesmo APK, instalação=false; redes restauradas depois
desse JSON, conforme esclarecido. Essa ordem não contradiz a janela offline
relatada. Sem tráfego por UID/destino medido; isolamento não comprova ausência
de fila/telemetria/transientes SDK ou comportamento universal.

Conclusão limitada: os três rótulos chegaram à detecção lexical nesta tentativa.
Não falta suporte aos nomes SIS/DIA/PULSO. Falta de números do LCD desligado é
coerente com campos incertos; dígitos detectados podem ser inscrições acessórias.
Não afirmar que todos vieram delas ou que há falha de geometria. Isso não
reconstitui nem explica sozinho a tentativa anterior com visor ligado.

## Comparação dirigida preparada — fonte comum versus sete segmentos

[Cartões HTML locais](../tools/task09/cartoes-ocr.html), dois estímulos estáticos
independentes de fotos de usuário. Valores inventados 120/80/72, mesmos rótulos,
mesmo retângulo e organização; variam formato/largura dos dígitos. Não é controle
pixel a pixel nem réplica calibrada do LCD. Nenhuma origem, cor ou geometria foi
extraída de fotografia. Sem JS, recursos externos, captura, gravação ou envio;
CSP bloqueia recursos/rede e formulários. Só permite estilo inline para desenho
geométrico de segmentos. Não inclui arquivos de fonte ou motor adicional.

Escopo: duas capturas distintas A/B, sem novas medições, edição ou confirmação.
Comparação física depende do Samsung; não foi executada pelo Codex. Resultado
positivo não homologa LCD/reflexo/sete segmentos de outros displays; falha não
atribui causa exclusivamente ao motor ou aos segmentos. Testar os dois no mesmo
bundle/câmera/aparelho evita comparar diretamente com a rodada antiga do cartão.
Não repetir tentativas para selecionar apenas sucessos.

### Procedimento Windows, depois de obter o arquivo estático

Preservar Metro da fonte a649b6c e APK25990bb4…; não usar a pasta dos cartões
como novo projeto Expo. Abrir o HTML por arquivo local no PC, selecionar A e
manter cartão inteiro visível, sem rolagem/cortes, cabeçalho fora do enquadramento.
Somente o Samsung ligado ao ADB. Não carregar foto do usuário no navegador.

No telefone, anotar estados originais; desligar Wi-Fi, dados e Bluetooth;
conferir ancoragens/VPN desligadas e ausência de outras rotas/adaptador Ethernet.
Retornar por Recentes: background pode cancelar e deve continuar cancelando.
Se houver rota desconhecida ou erro de preparação, parar sem capturar.

No Terminal B, na fonte Windows a649b6c, usar o bloco abaixo. Só remove o reverse
conhecido e confere o bundle desta rodada; saídas brutas ficam privadas:

```powershell
& {
    $ErrorActionPreference = 'Stop'
    Set-Location -LiteralPath 'C:\dev\aferi-task09-rotulos'
    Import-Module .\tools\task07\AferiEvaluationAdb.psm1 -ErrorAction Stop
    $aferiAdb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
    $aferiBundle = Invoke-AferiEvaluationAdbProcess -AdbPath $aferiAdb -Arguments @(
        'shell', 'run-as', 'com.ramonmenz.afericapturetest', 'sha256sum',
        'files/DevLauncherApp-BridgelessReactNativeDevBundle.js'
    )
    if ($aferiBundle.Code -ne 0 -or $aferiBundle.Lines.Count -ne 1 -or
        $aferiBundle.Lines[0] -notmatch '^2191e4f100e72f97a3a899d033e48f42b6d5190987eb4efdd59d643bb3c748ee\s+files/DevLauncherApp-BridgelessReactNativeDevBundle\.js$') {
        throw 'bundle-unexpected-preserve'
    }
    $aferiAntes = Invoke-AferiEvaluationAdbProcess -AdbPath $aferiAdb -Arguments @('reverse', '--list')
    if ($aferiAntes.Code -ne 0 -or $aferiAntes.Lines.Count -ne 1 -or
        $aferiAntes.Lines[0] -notmatch '^\S+\s+tcp:8097\s+tcp:8097\s*$') {
        throw 'reverse-unexpected-preserve'
    }
    $aferiRemocao = Invoke-AferiEvaluationAdbProcess -AdbPath $aferiAdb -Arguments @('reverse', '--remove', 'tcp:8097')
    if ($aferiRemocao.Code -ne 0) { throw 'reverse-remove-failed' }
    $aferiDepois = Invoke-AferiEvaluationAdbProcess -AdbPath $aferiAdb -Arguments @('reverse', '--list')
    if ($aferiDepois.Code -ne 0 -or $aferiDepois.Lines.Count -ne 0) { throw 'reverse-offline-not-confirmed' }
    [pscustomobject]@{ BundleConfere = $true; ReverseAtivosDepois = 0 } | ConvertTo-Json
}
```

Com preparo aprovado: uma captura A, aproximadamente frontal, sem zoom digital,
preview/ready observados; enquadrar apenas o retângulo incluindo seus rótulos.
Transcrever os oito indicadores; comparar campos com os valores inventados:
corretos/incorretos/ausentes por campo, sem corrigir ou confirmar. Cancelar e
conferir câmera/revisão encerradas. Trocar no PC para B, sem tocar rede/Metro
ou recarregar app; preservar distância/enquadramento/luz/tamanho do cartão.
Somente se A encerrou normalmente, fazer uma captura B pelos mesmos passos.
Se A der erro, travar ou não liberar câmera, parar e não executar B.

Se os cartões não couberem completos no monitor, ajustar antes do ensaio e
anotar zoom do navegador; manter o mesmo ajuste para A/B. Não fazer varredura de
brilho/foco/distâncias ou tentativas extras nesta coleta. Anotar aproximações
ou mudanças inevitáveis; não inventar medidas.

Após cancelar, restaurar só reverse8097 via Update-AferiInspectorEvaluation.ps1
-PrepareMetro (na pasta rotulos), restaurar estados originais das conexões e
registrar ordem/resultado. Em falha de remoção não repetir automaticamente;
consultar/preparar restauração pelo script, sem reinstalar. Não deixar o usuário
sem orientação de recuperação se a captura interromper.

Retorno: JSON do preparo/restauração; versão/zoom do navegador; redes conforme;
para A e B separados, preview/ready, oito indicadores, correspondência dos três
campos (somente correto/incorreto/ausente), encerramento, cancelamento e erros.
Sem screenshot, fotos, OCR bruto, payloads, logcat ou heap dump. Sem espera idle
adicional. Privacidade e habilitação clínica permanecem bloqueadas.

### Verificações da preparação dos cartões

Lint, TypeScript raiz, 745 testes/67 suítes e diff sem erros de whitespace
aprovados. Chromium154.0.8037.57, viewport1280x900: HTML fornecido via setContent,
um cartão visível por seleção, retângulos600x452 sem corte/sobreposição entre
valores/rótulos e nenhuma requisição observada; renderização sete segmentos
inspecionada visualmente. Navegação file foi bloqueada por política do navegador
deste ambiente; abertura do arquivo no Windows do autor ainda não verificada.
Sintaxe do bloco PowerShell validada com parser7.5.4, sem executar ADB.
Nenhum ensaio ML Kit/Samsung ou acerto físico novo inferido desses checks.


## Retorno A/B — fonte comum correta, sete segmentos sem dígitos ASCII

Fonte da demo permanece a649b6c e APK25990bb4… pelo protocolo/retorno anterior;
esta preparação retornou BundleConfere=true (hash esperado2191e4f1…) e
ReverseAtivosDepois=0. Autor declarou redes/ancoragens/VPN conforme o roteiro.
Ferramentas: associacao-2/captura-5, módulo AferiEvaluationAdb; exibição no PC
Chrome158.0.8127.88, versão oficial64bits, zoom100%, cartões completos.
Sem data/hora de execução ou duração informadas. Codex não executou o Samsung.

| Observação relatada | A — fonte comum | B — sete segmentos |
|---|---|---|
| Preview/ready/preview-1 | Sim | Sim |
| OCR linhas | Presentes | Presentes |
| Dígitos ASCII nos tokens utilizáveis | Presentes | Ausentes |
| Rótulos SYS/DIA/PUL | Presentes | Presentes |
| Associação dos três campos | Candidato | Incerto por ilegível ou distante |
| Correspondência com cartão sintético | Três campos corretos | Três campos ausentes |
| Câmera encerrada após OCR | Sim | Sim |
| Cancelamento descartou revisão | Sim | Sim |
| Erro/retomada/impedimento | Nenhum relatado | Nenhum relatado; sem mudança de posição/luz declarada |

Grafias associação com acento e PUl no relato não são tratadas como saída literal
nova; síntese das categorias informadas pelo autor. Estímulos usam valores
inventados do cartão, não dados de saúde. Não foram recebidas novas imagens/OCR
bruto. Restauração inspector-metro-1 reconheceu APK25990bb4…, reverse configurado,
outras linhas0/instalaçãofalse; conexões restauradas por declaração do autor.

### Diagnóstico alcançado e limites

Comparação orienta prioridade para captura/reconhecimento de segmentos antes
de ajustar associação. A mostra caminho câmera→OCR→parser→revisão funcional
para aquele estímulo. B reprova a leitura do cartão segmentado nessa tentativa:
com os três rótulos presentes, nenhum dígito ASCII chegou aos tokens utilizáveis.
Não é correto tentar recuperar números ausentes por faixa, ordem, histórico ou
confiança, nem chamar ausência de resultado de leitura aprovada.

Há só uma tentativa de cada; não calcular taxa de acerto, latência ou cobertura
por modelo. Não comprova incapacidade universal do ML Kit em sete segmentos,
nem explica definitivamente o LCD físico. Forma/largura/gaps dos dígitos e sua
imagem na câmera variam com o estímulo; não houve inspeção de pixels/texto bruto.
OCR pode confundir dígitos com letras; o diagnóstico não revela essas letras.
A bridge filtra linhas sem boundingBox ou com mais de500 caracteres antes do
contrato; ausência de dígitos no diagnóstico não afirma ausência em toda saída
interna do SDK. Não há evidência de erro de permissão/cancelamento nesse par.
Offline e encerramento relatados não homologam telemetria/filas/logs internos.

### Próxima investigação técnica, sem nova coleta agora

Revisão do nativo AferiPhotoView.kt: cópia YUV→NV21 em RAM, ImageProxy fechado,
câmera encerrada, fromByteBuffer com dimensões e rotação e uma chamada ao ML Kit.
Saída de linhas/caixas normalizada ao quadro orientado. Não há recorte de display
ou normalização adicional. Isso descreve a fonte; não mede nitidez, tamanho dos
dígitos no buffer, foco ou todos os comportamentos do APK/SDK.

Ajuste apenas do parser não cria os dígitos ausentes de B. Próximo experimento
admissível deve limitar-se a recorte/orientação/normalização em RAM conforme
spec-fotografia§6.2, mantendo ML Kit embarcado. Não apresentar contraste como
solução garantida: cartão já é de alto contraste visual, sem medida do quadro.
Não substituir motor nem introduzir reconhecimento próprio de segmentos ou
OpenCV como atalho. Não iniciar varredura manual de distâncias/tentativas.

Antes de novo APK/ensaio: implementação concreta com controle original versus
processado, transformação de coordenadas explícita para não quebrar associação,
limites de buffer/tamanho preservados e testes de formato/rotação/bordas/cancelamento/
cleanup/resultado tardio. Todo buffer processado deve ter vida útil controlada
até completion; sem arquivos, URI, Bitmap.compress, logger ou fallback remoto.
Uma versão experimental não deve ser ativada no produto automaticamente.
Não usar conteúdo clínico para ajustar regras. Comparação posterior deve usar
estes mesmos estímulos e registrar também regressão em A, sem aceitar apenas B.

Este item é requisito de próximo experimento, não implementação já realizada ou
promessa de acerto. Se não houver abordagem compatível eficaz, registrar a
limitação e não declarar leitura de medidores reais concluída. Tarefas e gate
permanecem parciais/bloqueados. Nenhuma repetição A/B ou idle solicitada agora.

## Etapa 1 do plano — caminho conferido e diagnóstico da bridge preparado

Base desta implementação: `origin/staging` consultado em
`a106a39d10d17b6e5cb16a48fd10328a4dede24e`, com PRs #78 e #79 confirmados
como merged e nenhum PR aberto na consulta inicial. O plano `26a1c973` já está
incorporado. Checkout inicial limpo, branch `work` em `3f8220f` preservada;
implementação na branch própria `fix/task-09-diagnostico-bridge`.
Nenhuma fonte, APK, bundle ou sessão Windows foi acessada nesta etapa.

### Caminho e contrato de coordenadas encontrados na fonte

| Ponto | Contrato atual e consequência |
|---|---|
| Seleção CameraX | Preferência `1280x960`, fallback mais próximo menor/depois maior, filtro de dimensões pares positivas com até `1920000` pixels. Preferência não comprova tamanho selecionado no Samsung. |
| Preview | `PreviewView` COMPATIBLE, agora `FILL_CENTER` explícito, mesmo default da dependência `1.5.1`. View da demo com altura de 300 dp; tamanho medido pelo Android é em pixels. Preview tem seleção de resolução própria. |
| Quadro analisado | `frame.width/height` e `rotationDegrees` do quadro recebido. `FrameBytes.nv21` copia o buffer completo usando posições/strides dos planos; não aplica `ImageProxy.cropRect`. Dimensões e igualdade do crop com o buffer passam a ser metadados transitórios. |
| OCR | `InputImage.fromByteBuffer(NV21, width, height, rotation)`, sem nova rotação física dos bytes, recorte ou escala. Uma chamada ao ML Kit latino embarcado. |
| Saída | Contrato existente `upright-frame`: dimensões orientadas `W=width,H=height` para 0/180 e `W=height,H=width` para 90/270; caixas de linha do SDK divididas por W/H, com os clamps existentes em `[0,1]`. Não rotacionar novamente essas caixas. |
| Preview → análise | Dois use cases no bind, sem `UseCaseGroup`/`ViewPort` compartilhado nem matriz de projeção. Igualdade de campo visível e correspondência de uma guia com pixels de análise **não estão estabelecidas**. Razão de dimensões sozinha não fornece essa transformação. |

Foram conferidas as fontes públicas das versões usadas de
[camera-view 1.5.1](https://dl.google.com/dl/android/maven2/androidx/camera/camera-view/1.5.1/camera-view-1.5.1-sources.jar)
(`PreviewView`/`PreviewTransformation`, default FILL_CENTER e OutputTransform) e
[camera-core 1.5.1](https://dl.google.com/dl/android/maven2/androidx/camera/camera-core/1.5.1/camera-core-1.5.1-sources.jar)
(`Preview.getResolutionInfo`, `ImageAnalysis`). Isso confirma APIs/configuração,
não a geometria ou nitidez executadas no dispositivo. `upright-frame` é o contrato
que a bridge já utiliza; esta etapa não comprova por execução a orientação das
caixas do SDK em todas as rotações.

O ImageProxy continua fechado no finally da cópia; câmera é encerrada antes de
processar. A referência do NV21 e a lease continuam retidas até completion do
SDK, inclusive após cancelamento. A projeção nova só é construída no callback
de sucesso de geração ativa. No JS, só aparece após parse e ACK de cleanup,
durante a revisão atual. Cancelar, recapturar, confirmar, background e desmontar
preservam o descarte/rejeição tardia; diagnóstico não entra no histórico de eventos.
Isso não demonstra sobrescrita física da RAM nem inspeciona internos do SDK/SO.

### `bridge-1` / `associacao-3`: distinguir SDK e filtros sem conteúdo

`OcrLinePolicy` centraliza a política já existente: considerar as primeiras 500
linhas, rejeitar caixa ausente e depois texto com mais de 500 unidades UTF-16.
Linhas rejeitadas também consomem o limite, preservando a ordem anterior dos
filtros. Não há relaxamento, reparo de dígitos ou mudança do parser.

A projeção nativa contém revisão fixa e dez booleanos: presença de linhas e
dígitos ASCII nas linhas do SDK e nos tokens exportados; presença de rejeições
por caixa ausente, texto longo e limite; presença de dígitos nessas três classes
de rejeição. São sinais lexicais, sem contagem de dígitos ou valor reconhecido.
Se uma linha tem mais de um impedimento, vale o primeiro filtro dessa ordem.
O percurso inclui linhas após o limite somente para projetar presença; não
exporta seus textos e não mantém uma lista adicional de linhas rejeitadas.

“SDK” aqui significa **linhas de TextBlocks devolvidas ao callback**, não todos
os níveis internos do reconhecedor nem uma inspeção de `Text.text`, palavras ou
hipóteses. Ausência de ASCII também não exclui confusão com letras ou outros
caracteres. Dígitos presentes podem ser acessórios; nenhuma categoria comprova
valor útil, associação ou leitura correta.

`describePhotoBridge` aceita somente revisão conhecida/booleanos; metadados de
geometria aceitam só dimensões limitadas, rotações 0/90/180/270 e crop booleano.
Mostra dimensões do buffer/orientado, view e buffer do preview quando disponível,
e sempre explicita transformação não estabelecida. Nenhum texto, caixa de OCR,
valor, confiança, timestamp, exceção ou propriedade extra é refletido. Payload
ausente/antigo/malformado vira `bridge:diagnostico-indisponivel`, nunca “SDK sem
dígitos”. Geometria inválida é indisponível sem apagar os sinais válidos da bridge.

Esta instrumentação é da demo isolada; produto não monta a tela/coordenador
nem passa a autolinkar o módulo. Não inicia captura, tentativa extra, rede,
arquivo, logger, writer ou fila. APK antigo continua sem essa instrumentação:
Metro pode mostrar `associacao-3`, mas somente um futuro APK recompilado pode
anunciar `Nativo:bridge-1` e produzir o novo diagnóstico.

### Hipótese revisável e decisão para o candidato

A/B histórico não distingue perda na bridge de ausência de dígitos nas linhas
do SDK. A política pode descartar dígitos por construção, demonstrado apenas
com entradas sintéticas; não há evidência de que tenha ocorrido em B. Não é
justificado relaxar filtros ou fabricar candidatos para resolver essa lacuna.

Para a etapa 2, a hipótese é concentrar a região útil e limitar redimensionamento
em RAM sem cortar os rótulos externos do BSPII. Antes do recorte, estabelecer
transformação verificável entre guia/preview e análise, considerando ViewPort,
rotação, escala e cortes; testar ida/volta ao quadro orientado de origem. Esta
etapa apenas torna explícita a ausência dessa transformação no caminho atual.
Não há ROI arbitrária, reconstrução de segmentos ou normalização de luminância
implementada. O diagnóstico será incorporado ao candidato, sem rodada física
isolada para obtê-lo. Se o retorno futuro revelar descarte relevante, corrigir
o contrato/filtro com limites equivalentes antes de concluir necessidade de uma
segunda variante. Contraste não é solução presumida para B.

### Verificações e próxima ação desta etapa

Lint, TypeScript raiz/demo Android e **773 testes em 68 suítes** aprovados.
Jest emitiu avisos de `act` em testes de edição/tema; não houve falha. Os testes
novos cobrem whitelist/sentinelas, APK antigo, metadados inválidos, dimensões
orientadas nas quatro rotações e descarte do diagnóstico durante o ciclo da
revisão. Checks Java puros de política/limites e buffers aprovados com ECJ 3.38.0
em modo Java 17 e runtime OpenJDK 21 do host. O CI passa a compilar/executar os
mesmos checks com JDK 17; não é job de build Android. `git diff --check` aprovado.

Nenhum Kotlin/APK compilado, pré-processamento, comparação original/processado
ou ensaio ML Kit/Samsung novo foi executado. Nenhum resultado histórico foi
reatribuído a este código. Tempo/alocação/SDK/SO/rede e eficácia continuam sem
nova medição; não concluir TASK-04/06/07/09/18 ou habilitar uso clínico.

Próxima ação do autor: revisar o PR da etapa 1 e preservar fontes/APKs/bundle
históricos. **Nenhum comando no Windows ou dispositivo é necessário agora.**
Etapa 2 pode continuar sobre esta branch em trabalho dependente sem exigir merge
intermediário. Antes de qualquer instalação futura, ainda são necessários
candidato concreto, build nativo/CI, identidade/manifesto/backup/inspector e
assinatura; os scripts fixados em APK259/fonteca786ed não são atualizadores
genéricos para esse candidato. Protocolo físico será específico do novo artefato,
com retorno sanitizado e condições de parada conforme o plano.
