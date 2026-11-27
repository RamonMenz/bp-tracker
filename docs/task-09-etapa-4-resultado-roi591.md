# TASK-09 — resultado A/B do candidato ROI591

## Identificação e alcance

Análise do retorno sanitizado do autor, conforme o [protocolo congelado antes da
coleta](task-09-etapa-4-ab-roi591.md). Não houve execução física pelo Codex nem
recebimento de imagens/OCR bruto/valores clínicos. Valores120/80/72 pertencem aos
cartões inventados existentes. Não solicitar repetição, novos prints ou logs.

- Fonte45f7376a7ed2f7e04725866ffe98ff625f057566.
- APK591555a24e8ba0d952c8dc93829c8204b3c731348764a61f80c29a79580038f6.
- Bundle98d31d1e0523c3e8c00fbda33f052ea9e6637b8062c04478a3cb01111d3375c2,
  arquivo estável no preparo, não hash de todo código em RAM.
- Samsung SM-S731B; roi-1; bridge-2. Retorno contém um par original/processado
  por cartão. Sem relato de repetição seletiva, reconexão ou saída durante captura.
- Autor declarou posição/luz/zoom mantidos. Modo offline foi preparado com reverse0
  e redes declaradas desligadas; o script mantém OfflineComprovado=false. Isso
  não é medição independente de tráfego por UID/destino.

## Matriz por cartão e passagem

| Cartão/passagem | SYS | DIA | PUL | Troca relatada | Resultado |
|---|---|---|---|---|---|
| A original | 120 | 80 | 72 | Não | Três campos sintéticos exatos |
| A processado | 120 | 80 | 72 | Não | Controle A preservado |
| B original | Ausente | Ausente | Ausente | Indeterminável | Não leu os valores |
| B processado | Incerto | Incerto | Incerto | Indeterminável | Não leu os valores |

Não mesclar valores de passagens/cartões. Não transformar indeterminável em
ausência demonstrada de troca. Nenhum número errado apresentado como candidato
foi relatado; ausência/incerteza em B continua falha do critério, não sucesso.

## Diagnóstico: SDK versus bridge

| Indicador | A original | A processado | B original | B processado |
|---|---|---|---|---|
| Linhas SDK/bridge | Presentes | Presentes | Presentes | Presentes |
| ASCII em Text do SDK | Presente | Presente | Ausente | Ausente |
| ASCII em TextBlock do SDK | Presente | Presente | Ausente | Ausente |
| ASCII em Line do SDK | Presente | Presente | Ausente | Ausente |
| ASCII após bridge | Presente | Presente | Ausente | Ausente |
| Três rótulos lexicais | Presentes | Presentes | Ausentes | Presentes |
| Descartes sem caixa/linha longa/limite | Não sinalizados | Não sinalizados | Não sinalizados | Não sinalizados |
| Descarte de ASCII nesses filtros | Não sinalizado | Não sinalizado | Não sinalizado | Não sinalizado |

A interpretação de A foi candidato nos três campos em ambas as passagens. Em
B original, três ausentes; em B processado, três incerto-ilegivel-ou-distante.
Essa última categoria é motivo do parser, **não diagnóstico medido de distância,
foco ou contraste**. A detecção dos rótulos é lexical; não mede acerto das caixas.

Há ganho limitado na detecção dos rótulos de B após ROI/orientação/escala.
Não há ganho demonstrado na leitura numérica. Diferentemente da evidência antiga
do APK259, este retorno separa níveis do SDK e pós-filtro: os indicadores de
ASCII já são negativos em Text/Block/Line de B. Não é somente ausência na saída
filtrada; os descartes investigados não explicam o resultado pelos indicadores
recebidos. Não concluir ausência de todo OCR: linhas estavam presentes. Tampouco
excluir letras confundidas com segmentos, outros caracteres ou questões não
expostas pelos indicadores. Sem OCR bruto, não afirmar o que o SDK escreveu.

## Geometria e buffers

Os quatro diagnósticos registram buffer960x720, upright720x960/rot90, preview
view906x844 e preview buffer1440x1080, fill-center, mapeamento calculado por
CameraX/ViewPort. A e B registram o mesmo ROI(56,198,664,762), saída1216x1128 e
bilinear. Região608x564, escala2 por eixo; dimensões pares e abaixo dos tetos.
Isso é consistência dos metadados, não inspeção dos pixels/caixas no Samsung.

`crop-camera=parcial-ignorado` indica a cópia do buffer completo em vez de limitar
o NV21 ao crop da câmera. Não é, isoladamente, falha: original usa quadro inteiro
e ROI usa transformação para esse upright-frame. Não atribuir a falha numérica
a esse indicador sem evidência adicional. Preview e análise tiveram dimensões
distintas de fato; não presumir a resolução-alvo1280x960 como observada.

A linha de buffers estava cortada no registro do autor. O prefixo limite5760000
é compatível com o código, mas o restante não foi transcrito com segurança.
Pelas dimensões relatadas, o cálculo nominal é:

- Original NV21:960×720×3/2=1036800 bytes.
- Saída NV21:1216×1128×3/2=2057472 bytes.
- Soma própria esperada:3094272 bytes, inferior ao teto5760000.

São **valores derivados**, não leitura da linha cortada ou perfil de alocação,
heap/SDK/GPU. Não substituir a observação ausente pelo cálculo. A lacuna não
altera o veredito dos campos de B e não requer nova captura.

## Encerramento e limitações do retorno

Autor relatou os dois blocos em A e B, preview/indicador encerrados normalmente,
resultados descartados ao cancelar, sem erro percebido além da falha de leitura
em B. O campo “Foi possível iniciar B” ficou com as alternativas sem seleção;
o par de B foi relatado, compatível com reutilização posterior, mas não preencher
essa resposta como observação explícita separada.

Force-stop foi declarado rotina após encerramento normal; roi591-end-1 retornou
comando sem erro, nenhuma instalação ou limpeza. Conexões restauradas depois.
Isso é contenção posterior, não prova autônoma de cleanup, lease até completion
ou descarte tardio. Sem regressão de recursos **percebida** no relato; sem tempos,
profiler ou exercício de cancelamento interpassagens/background/desmontagem em
voo. Não declarar memória total/latência/zeroização/ausência global de regressões.

As grafias “orentado” e quebras de linha foram tratadas como transcrição dos
metadados apresentados, sem inventar resultado ou exigir nova captura. Não há
p50/p95, percentual de acerto representativo, custos/horas/datas de execução
medidos neste retorno. Não extrapolar estes pares para população de aparelhos.

## Decisão conforme critérios prévios

**Etapa4 executada/analisada; resultado negativo para avanço do ROI591.**
A foi preservado, mas B processado não apresentou120/80/72. A condição necessária
falhou mesmo com encerramento observado normal. O candidato não avança para a
avaliação de generalização/LCD da etapa5 como correção aprovada. A melhoria
lexical dos rótulos não atende ao objetivo numérico.

**Não há justificativa demonstrada para a segunda variante de luminância.**
Não foi medida deficiência fotométrica; B é um estímulo de alto contraste, A
funcionou, a geometria relatada é consistente e nenhum dos descartes investigados
foi sinalizado. Ausência de dígitos não prova causa de contraste. Não implantar
normalização, outra escala/ROI ou ajustes de parser por tentativa, nem coletar
novas amostras para fabricar justificativa. A segunda variante era condicional,
não uma obrigação de gastar outra rodada; não foi implementada ou testada.

**Encerrar esta linha de correção ROI/orientação/escala como ineficaz para obter
os três valores do cartão B nas condições observadas.** Preservar candidato,
cartões, fonte, registros e caminho manual. Não atribuir incapacidade universal
ao ML Kit, nem causa definitiva/falha corrigida ao LCD G-Tech real. Não houve
LCD real nesta rodada ou motor alternativo avaliado.

Próximo trabalho é formalizar esse limite na etapa6 e encaminhar eventual
decisão de escopo pela governança existente, sem alterar a stack automaticamente.
TASK-04/06/07/09/18 e habilitação clínica continuam pendentes. Nenhuma nova ação
no dispositivo ou repetição da coleta é solicitada por esta análise.

## Verificação desta entrega

Alterações somente documentais; protocolo prévio preservado. Revisão da coerência
entre campos/indicadores, cálculo de geometria/bytes e critérios congelados.
Lint/TypeScript/Jest do código existente conferidos; CI do commit publicado é
registrado no PR84. Nenhum build/SDK/ensaio físico novo foi executado pelo Codex.
