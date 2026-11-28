# Fotografia — investigação experimental em laboratório

**Branch:** `exp/fotografia-lab`, criada de `origin/staging @ f8cfdee` em 28/11/2026.
**Natureza:** investigação de laboratório, retomada pelo autor após a pausa operacional
[D-001](relatorio/decisoes-e-evidencias.md). **Nada muda no produto**: `src/`, `app/`,
`native-modules/` e o `package.json` raiz não são alterados; nenhum motor é trocado nem
habilitado; toda abordagem nova é só **candidata comparativa**. Confirmação antes de salvar,
legado e privacidade ficam como estão. Este documento **não declara a fotografia concluída**.

## 0. Estado e retomada

| Etapa | Estado | Próximo passo |
|---|---|---|
| 1. Pré-registro (esta seção 1) | Registrado antes de qualquer execução | — |
| 2. Linha de base Tesseract.js | AJUSTE executado: **não passa** no critério (seção 2) | AVALIAÇÃO só no fim |
| 3. H-seg (Python, depois TS) | Python congelado; AJUSTE **passa** no critério (seção 3) | Porte TS puro |
| 4. Modelos Tesseract de sete segmentos | Pendente | — |
| 5. Análise do ML Kit (documental) | Pendente | — |
| 6. Avaliação única do conjunto reservado | Pendente | — |

Para retomar em outra sessão: as fotos **não** estão no repositório. O autor precisa
reenviá-las no chat. Os scripts recebem os caminhos como argumento (README em
`tools/lab-fotografia/`).

## 1. Pré-registro (escrito antes de rodar qualquer abordagem)

### 1.1 Dados e privacidade

- 20 fotografias enviadas pelo autor no chat desta sessão, com um gabarito de valores esperados
  e condições (luz, reflexo, inclinação, corte, sombra, modelo). 16 mostram o G-Tech BSPII ligado,
  1 mostra o BSPII desligado (ID 05) e 3 mostram um segundo aparelho genérico (IDs 12, 16 e 20).
  As fotos 06, 07 e 08 têm aparência de imagem de divulgação/vídeo, mas são tratadas como
  as demais, com o gabarito fornecido.
- **Fotos, gabarito, recortes, imagens intermediárias e saídas brutas de OCR ficam só no
  diretório temporário da sessão, fora do repositório.** Nada disso é comitado. Este documento
  registra resultados por foto somente como categorias (correto, errado, ausente, troca), sem
  os valores.
- O assistente associou cada arquivo recebido a um ID do gabarito comparando o conteúdo da
  imagem com a lista do autor, porque a ordem de exibição no chat não segue a numeração.
  O **gabarito é o do autor**, não uma leitura do assistente. Todas as 20 imagens foram vistas
  pelo assistente ao chegar no chat. Por isso o conjunto reservado é cego quanto a
  **resultados**, não quanto à aparência das fotos.
- Nenhum serviço remoto de OCR ou de IA lê as imagens. Todo processamento roda localmente no
  contêiner (Python/OpenCV e Tesseract.js no Chromium local).

### 1.2 Divisão AJUSTE / AVALIAÇÃO

Sorteio estratificado por aparelho, com `random.Random(20261128)` do Python 3.13. Seis das 16
fotos do BSPII ligado e uma das três do genérico vão para a avaliação. A foto desligada (05)
fica no AJUSTE de propósito: é o controle negativo usado para projetar a recusa de "visor vazio".

| Conjunto | IDs | Composição |
|---|---|---|
| AJUSTE (13) | 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 16, 17 | 10 BSPII ligado, 1 BSPII desligado, 2 genérico |
| AVALIAÇÃO (7, reservada) | 01, 02, 14, 15, 18, 19, 20 | 6 BSPII ligado, 1 genérico |

Regras: parâmetros, limiares e gabaritos de layout são escolhidos olhando **somente** o AJUSTE.
A AVALIAÇÃO é executada **uma única vez**, ao final, com tudo congelado. Os resultados de todas
as abordagens executadas são reportados, inclusive as falhas.

### 1.3 Métricas

Por foto ligada e por campo (SIS, DIA, PULSO), cada saída cai em uma categoria:

- **correto:** valor candidato igual ao esperado;
- **errado-válido:** valor numérico apresentado como candidato e diferente do esperado. É a
  categoria mais grave, porque induz o usuário a confirmar um número errado;
- **troca:** subconjunto de errado-válido em que o valor de um campo é o esperado de outro
  (por exemplo, SIS recebe o valor de DIA);
- **ausente:** nenhum candidato (ausente, incerto ou ilegível).

Foto desligada: qualquer valor candidato conta como **falso positivo**.

Agregados por conjunto e por aparelho: acerto exato por campo, **par SIS/DIA exato** (foto com
SIS e DIA corretos), errado-válido, trocas e ausências. O tempo de processamento é registrado
apenas como indicação, porque o contêiner não representa um celular.

Diagnóstico adicional, só para OCR geral: se o texto bruto contém o número esperado em
qualquer posição, o que dá o **teto** do que um interpretador poderia extrair. Esse indicador é
calculado por script e registrado como sim/não, sem o texto.

### 1.4 Critério de sucesso (fixado antes da execução)

Uma abordagem **passa no critério de ajuste** se, no AJUSTE:

- **S1 Segurança:** errado-válido ≤ 5% dos campos, com arredondamento para baixo (12 fotos ligadas
  × 3 = 36 campos, logo no máximo 1), **zero trocas** e **zero falso positivo** na foto desligada;
- **S2 Utilidade:** par SIS/DIA exato em ≥ 60% das fotos ligadas (no mínimo 8 de 12).

Veredito final, aplicado à AVALIAÇÃO (6 fotos ligadas, 18 campos):

- **funcionou:** S1 (0 errado-válido, 0 troca) e S2 (par exato em pelo menos 4 de 6);
- **parcial:** S1 atendido e par exato em 1 a 3 de 6;
- **não funcionou:** S1 violado, ou nenhum par exato;
- **inconclusivo:** não foi possível executar de forma válida.

Um resultado bom em 7 fotos não é acurácia representativa: o conjunto é pequeno, de um único
autor e de dois aparelhos.

### 1.5 Abordagens, na ordem de execução (famílias)

1. **OCR geral — Tesseract.js (linha de base):** o worker do projeto
   (`src/services/recognition/tesseract-worker.web.ts`), empacotado para laboratório com os
   assets fixados de `demos/web-capture` (tesseract.js 7.0.0, `eng` 4.0.0_best_int, LSTM,
   PSM 6) e seguido de `interpretPhoto`, no Chromium do contêiner. Quatro condições fixas:
   foto inteira crua; foto inteira pré-processada; recorte do visor cru; recorte do visor
   pré-processado. Receita única de pré-processamento, em memória: escala de cinza, escala
   2× (limitada ao teto de 1,92 MP do worker), binarização de Otsu e, como variante, a inversão.
   Não há varredura de parâmetros.
2. **H-seg — decodificação de sete segmentos por lógica pura:** localizar o retângulo do LCD,
   que simula o ROI do guia de enquadramento; normalizar iluminação; binarizar; separar as
   faixas SIS/DIA/PULSO por **gabarito de layout por modelo**; segmentar dígitos; testar as 7
   regiões de segmento; mapear para 0–9. Um valor só é emitido quando **todos** os dígitos
   decodificam num padrão válido sem ambiguidade; caso contrário, o campo fica ausente. Não há
   faixas clínicas, histórico ou ordem para completar valores. O modelo do aparelho (BSPII ou
   genérico) é dado de entrada, simulando a escolha do guia pelo usuário. Se a localização falhar,
   a foto conta como ausente, sem resgate manual. Protótipo em Python/OpenCV; se passar no
   critério, porte para TypeScript puro com testes sintéticos em `tools/lab-fotografia/`.
3. **OCR com modelo de sete segmentos (Tesseract):** só modelos de fonte identificável e licença
   compatível. São registrados origem, licença e resultado, no mesmo harness e nas mesmas
   condições. Nunca entram no produto.

**Emenda 1, registrada antes de rodar as condições de recorte:** no BSPII os rótulos estão
impressos na carcaça, fora do LCD. O recorte só do visor (`crop`) exclui os rótulos, então
`interpretPhoto` não tem âncora por construção e só o teto do OCR é informativo. Por isso entra
uma condição fixa a mais, `croplab`: o LCD estendido à direita em 45% da sua largura, para
incluir os rótulos, como na premissa do ROI591 de preservar números e rótulos. As mesmas três
receitas (cru, Otsu, Otsu invertido) se aplicam. O ROI vem do localizador do H-seg, congelado
antes destas execuções e projetado só com o AJUSTE.

**Emenda 2, registrada antes de rodar a família 3:** modelos de
[`Shreeshrii/tessdata_ssd`](https://github.com/Shreeshrii/tessdata_ssd) (Apache-2.0; commit
`e493a10`, de 18/04/2019; ajuste fino de `tessdata_best/eng` com três fontes de sete segmentos
sintéticas). São testados só dois arquivos, sem varrer os demais: `7seg.traineddata` (sha256
`7e170293…91487291`; o README do autor diz que ele vai melhor em imagens reais) e
`ssd.traineddata` (sha256 `f0060f4d…df44ca5`, a versão "best"). Ambos são servidos ao **mesmo
worker do projeto**, no lugar do arquivo `eng`, comprimidos em gzip. Condições fixas: foto inteira
crua, só LCD cru e com Otsu, LCD + rótulos cru e com Otsu. A inversão sai porque o LCD já tem dígito
escuro sobre fundo claro. Esses modelos foram treinados só com números e pontuação. Se não lerem
os rótulos, `interpretPhoto` não tem âncora por construção, e o teto do OCR passa a ser a medida
principal.

A análise da causa do fracasso do ML Kit é documental (seção 6) e não conta como família.

### 1.6 Condições de parada

(a) plano completo; (b) **duas famílias seguidas** sem passar no critério de ajuste: as famílias
seguintes não são executadas, a AVALIAÇÃO é rodada uma vez para as já executadas e o resultado
é reportado; (c) limite de uso da sessão. Não há varredura cega de parâmetros. Cada ajuste
aplicado no H-seg é registrado com o motivo.

## 2. Linha de base — Tesseract.js do projeto (família "OCR geral")

**Método.** `tools/lab-fotografia/ocr/run-ocr.mjs` empacota `ocr/entry.ts`, que importa **sem
alteração** `recognizeCanvas` (`src/services/recognition/tesseract-worker.web.ts`), `Attempt` e
`interpretPhoto`. Ambiente: Chromium headless do contêiner (Playwright), worker `safe-worker.js`
de `demos/web-capture`, tesseract.js 7.0.0, núcleo LSTM, `eng` 4.0.0_best_int, `oem 1`, PSM 6.
O servidor local escuta só em 127.0.0.1; **0 requisições externas** em todas as execuções. O
quadro respeita o teto de 1,92 MP do worker: na condição "crua", a foto só é reduzida quando
necessário.

**Resultado no AJUSTE (12 fotos ligadas, 36 campos; foto 05 desligada).**

| Condição | Correto | Errado-válido | Troca | Ausente | Par exato | Falso positivo (05) | Teto do OCR | Com dígito ASCII | Com rótulo |
|---|---|---|---|---|---|---|---|---|---|
| foto inteira, crua | 0 | 1 | 0 | 35 | 0/12 | 1 | 0/36 | 8/12 | 9/12 |
| foto inteira, Otsu | 0 | 0 | 0 | 36 | 0/12 | 1 | 0/36 | 6/12 | 11/12 |
| foto inteira, Otsu invertido | 0 | 0 | 0 | 36 | 0/12 | 1 | 0/36 | 4/12 | 11/12 |
| só LCD, cru | 0 | 0 | 0 | 36 | 0/12 | 0 | 0/36 | 4/12 | 0/12 |
| só LCD, Otsu | 0 | 0 | 0 | 36 | 0/12 | 0 | 0/36 | 4/12 | 0/12 |
| só LCD, Otsu invertido | 0 | 0 | 0 | 36 | 0/12 | 0 | 0/36 | 5/12 | 0/12 |
| LCD + rótulos, cru | 0 | 0 | 0 | 36 | 0/12 | 0 | 0/36 | 3/12 | 11/12 |
| LCD + rótulos, Otsu | 0 | 0 | 0 | 36 | 0/12 | 0 | 0/36 | 6/12 | 10/12 |
| LCD + rótulos, Otsu invertido | 0 | 0 | 0 | 36 | 0/12 | 0 | 0/36 | 6/12 | 10/12 |

"Teto do OCR" conta os campos cujo número esperado aparece em qualquer posição do texto bruto,
como sequência isolada de dígitos. Mesmo sem nenhum interpretador, o texto **nunca** conteve um
valor do visor. "Com dígito ASCII" e "Com rótulo" contam fotos em que o texto bruto tinha algum
dígito (de acessórios, ruído ou pedaços) e algum dos rótulos SIS/SYS/DIA/PUL.

**Por foto (AJUSTE).** Todas as fotos ligadas, em todas as condições, ficaram com os três campos
ausentes, com duas exceções:

- **08, foto inteira crua:** DIA errado-válido (um dígito isolado na linha do rótulo DIA);
- **05 (desligado), três condições de foto inteira:** **falso positivo de pulso**. Um artefato da
  carcaça, lido como um único dígito na mesma linha de "PULSO", foi aceito por `interpretPhoto`
  pela regra rótulo + valor na mesma linha. O número fica fora da faixa do formulário (pulso de
  20 a 250), então a revisão o bloquearia. Mesmo assim, ele seria **apresentado como candidato**
  num aparelho desligado.

**Latência indicativa (contêiner, não celular):** inicialização mediana de 314 a 370 ms e
reconhecimento mediano de 150 a 517 ms por condição.

**Leitura.** O padrão repete o relatado para o ML Kit no Samsung: **rótulos impressos lidos,
dígitos de sete segmentos ausentes**. Pré-processar e recortar não mudou isso nas condições
testadas. A família "OCR geral com modelo `eng`" **não passa** no critério de ajuste (S2: 0/12
pares). O falso positivo na foto desligada também viola S1.

## 3. H-seg — decodificação de sete segmentos por lógica pura (família "segmentos")

**Método (`tools/lab-fotografia/hseg.py`, congelado).**

1. **Localização do LCD**, que simula o ROI do guia de enquadramento: contornos de bordas com três
   limiares fixos, quadriláteros com 4% a 45% do quadro e proporção altura/largura de 0,8 a 1,7.
   Vence o maior contraste entre o anel externo (carcaça clara) e o interior. Retificação
   perspectiva para 400 px de largura.
2. **Binarização:** divide pelo fundo estimado (fechamento 41×41 + desfoque), Otsu, margem de 2%,
   abertura 3×3 e endireitamento da inclinação (cisalhamento que maximiza a nitidez da projeção
   das colunas).
3. **Faixas por gabarito do modelo** (BSPII ou genérico; o modelo é entrada, como a escolha do
   guia): cada componente entra na faixa SIS/DIA/PULSO pelo centro vertical. Componentes fora do
   vão vertical dos dígitos (restos de "mmHg", moldura) são descartados. Pedaços que se sobrepõem
   em x viram um dígito, porque o "1" e o "7" do BSPII chegam partidos.
4. **Decodificação:** o "1" é uma barra estreita contínua. Nos demais dígitos, três linhas
   verticais na coluna central (a/g/d) e três horizontais em cada metade (f/b, e/c) precisam
   **concordar**; o padrão precisa estar na tabela de 0–9, com variantes comuns de 6, 7 e 9.
5. **Segurança:** o campo só recebe valor se tiver 2 ou 3 dígitos, todos decodificados, sem zero à
   esquerda e sem "tinta não explicada" do tamanho de um segmento dentro do campo. Caso contrário,
   fica incerto. Nenhuma faixa clínica, histórico ou ordem completa valores.

**Rodadas de ajuste, todas só no AJUSTE e motivadas por diagnóstico** (visualização das caixas
e das varreduras):

| Rodada | Mudança e motivo | Correto | Errado-válido | Par exato |
|---|---|---|---|---|
| 1 | Fechamento 7×7 + regiões fixas por segmento | 10/36 | **3** | 1/12 |
| 2 | Sem fechamento; faixa pelo centro do componente; agrupar pedaços por x; varredura de linhas com 3 linhas concordantes. Motivo: "1"/"7" partidos e fileiras vizinhas fundidas | 15/36 | 0 | 1/12 |
| 3 | Endireitar inclinação; remover traços finos na borda; filtrar componentes fora do vão vertical. Motivo: "mmHg" e moldura esticavam as caixas | 29/36 | 0 | 8/12 |
| 4 | Varredura vertical só na coluna central (0,46/0,50/0,54). Motivo: no "7" e em traço grosso, as linhas 0,42/0,58 cruzavam segmentos verticais | 33/36 | 0 | 10/12 |
| 4 + guarda | Regra de "tinta não explicada" (modo de falha: "1" de centena parcialmente apagado virar número de 2 dígitos) | 33/36 | 0 | 10/12 |

Quatro rodadas sobre 12 fotos trazem **risco de sobreajuste**. A AVALIAÇÃO reservada existe para
medir isso.

**Resultado congelado no AJUSTE.** Correto 33/36; errado-válido 0; troca 0; ausente 3; par exato
**10/12**; falso positivo 0 (a foto desligada fica com os três campos ausentes). **Passa** em S1 e
S2. A localização retornou um quadrilátero coerente nas 13 fotos do AJUSTE, conferido
visualmente. Tempo indicativo de 36 a 76 ms por foto no contêiner, em Python.

| Foto (condição do autor) | SIS | DIA | PULSO | Motivo da ausência |
|---|---|---|---|---|
| 03 ambiente, reflexo | C | C | C | — |
| 04 ambiente, reflexo | C | C | C | — |
| 05 desligado | – | – | – | 0 dígitos (correto: sem saída) |
| 06 artificial | C | – | C | varredura discordante |
| 07 artificial | C | C | C | — |
| 08 artificial, inclinado | C | C | – | varredura discordante |
| 09 ambiente, inclinado | C | C | C | — |
| 10 ambiente | C | C | C | — |
| 11 ambiente, corte à esquerda | – | C | C | varredura discordante (artefato no dígito) |
| 12 genérico | C | C | C | — |
| 13 ambiente, reflexo | C | C | C | — |
| 16 genérico | C | C | C | — |
| 17 ambiente, reflexo forte | C | C | C | — |

C = correto; – = ausente (campo vazio para o usuário preencher).

**Limites conhecidos antes da avaliação.** (i) O gabarito de layout é **por modelo**: um terceiro
aparelho exigiria outro gabarito, e o H-seg não lê aparelhos desconhecidos. (ii) Um "1" de centena
**totalmente** invisível (reflexo ou sombra cobrindo o dígito inteiro) é indistinguível de um
valor de 2 dígitos: a guarda só pega o apagamento parcial. É um modo de falha residual de
**errado-válido**. (iii) A localização depende de a carcaça ser mais clara que o LCD. (iv) Fotos
de divulgação (06–08) não representam o enquadramento real do app.
