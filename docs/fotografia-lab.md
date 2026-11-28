# Fotografia — investigação experimental em laboratório

**Branch:** `exp/fotografia-lab`, criada de `origin/staging @ f8cfdee` em 28/11/2026.
**Natureza:** investigação de laboratório, retomada pelo autor após a pausa operacional
[D-001](relatorio/decisoes-e-evidencias.md). **Nada muda no produto**: `src/`, `app/`,
`native-modules/` e o `package.json` raiz não são alterados; nenhum motor é trocado nem
habilitado; toda abordagem nova é só **candidata comparativa**. Confirmação antes de salvar,
legado e privacidade ficam como estão. Este documento **não declara a fotografia concluída**.

## 0. Estado e retomada

### Parte 2 (branch `exp/fotografia-lab-2`, a partir de `staging @ eba7dbd`, depois do merge do #107)

**Regra de honestidade estatística:** as 20 fotos já foram vistas, e as 7 reservadas já foram
avaliadas uma vez na Parte 1. **Todo número novo sobre essas 20 fotos é de AJUSTE (dentro da
amostra), nunca validação.** A v1 do H-seg (Parte 1) está congelada e seus números não mudam. A
validação independente depende de **fotos novas** do autor (seção 11).

| Etapa da Parte 2 | Estado | Próximo passo |
|---|---|---|
| P2-1. Correção do `interpretPhoto` (dígito espúrio) | Feita (seção 10) | — |
| P2-2. Protocolo de validação independente | Pendente | — |
| P2-3. H-seg v2 (ajuste dentro da amostra) | Pendente | — |
| P2-4. Candidato TS em `src/domain/seven-segment/` | Pendente | — |
| P2-5. Demo Web experimental | Pendente | — |
| P2-6. Estudo Android | Pendente | — |
| P2-7. Consolidação | Pendente | — |

### Parte 1

| Etapa | Estado | Próximo passo |
|---|---|---|
| 1. Pré-registro (esta seção 1) | Registrado antes de qualquer execução | — |
| 2. Linha de base Tesseract.js | AJUSTE executado: **não passa** no critério (seção 2) | AVALIAÇÃO só no fim |
| 3. H-seg (Python, depois TS) | Congelado; AJUSTE **passa** no critério (seção 3); porte TS idêntico ao Python (seção 3.1) | AVALIAÇÃO só no fim |
| 4. Modelos Tesseract de sete segmentos | AJUSTE: `ssd_int` **não passa**; `7seg`/`ssd` incompatíveis com o núcleo WASM (seção 4) | AVALIAÇÃO só no fim |
| 5. Análise do ML Kit (documental) | Feita (seção 5) | Depende do aparelho |
| 6. Avaliação única do conjunto reservado | **Executada uma vez** no commit `75adad8` (seção 6) | Ver seção 9 |

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

**Emenda 3, registrada antes de rodar o substituto:** `7seg` e `ssd` são modelos de ponto
flutuante. No worker do projeto, as duas execuções abortaram com `engine-failed` em 92 de 100
tentativas por modelo. Um diagnóstico com tesseract.js direto no Node mostrou a causa:
`Aborted(missing function: tesseract::DotProductSSE)`. O núcleo WASM LSTM do tesseract.js 7.0.0
não traz a rotina flutuante, e o projeto usa o `eng` **inteiro** (`best_int`). As 8 tentativas
"bem-sucedidas" por modelo não reconheceram nenhuma linha. Por **incompatibilidade técnica**, e
não por resultado, entra `ssd_int.traineddata` (sha256 `55775938…91339339`), a versão inteira do
mesmo `ssd` publicada no mesmo repositório, nas mesmas cinco condições. `7seg` não tem versão
inteira publicada. Convertê-lo exigiria as ferramentas de treino do Tesseract, então ele fica
**inconclusivo**.

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

### 3.1 Porte em TypeScript puro e correção pós-congelamento

`tools/lab-fotografia/hseg-ts/hseg.ts` porta a decodificação (LCD retificado em tons de cinza →
binarização → campos) **sem dependências, I/O ou DOM**. A localização e a retificação (bordas,
contornos, homografia) não foram portadas: no app, o recorte viria do guia de enquadramento, e
esse porte exigiria um trabalho de visão computacional que fica fora do escopo de laboratório.
Fechamento, abertura, desfoque gaussiano, Otsu, componentes conexos e o cisalhamento foram
reimplementados à mão.

**Verificações executadas:**

- `node --test tools/lab-fotografia/hseg-ts/check-hseg.mts`: **7 de 7** verificações com visores
  100% sintéticos. Cobrem os dígitos 0–9 nos três campos e nos dois gabaritos, dígitos itálicos,
  sombra suave, visor apagado sem candidatos, "1" de centena parcialmente apagado deixando o campo
  incerto, mancha no meio de um dígito deixando o campo incerto, zero à esquerda e quantidade
  inválida de dígitos;
- `tsc` estrito (`hseg-ts/tsconfig.json`) e ESLint do projeto sem erros;
- **paridade com o Python congelado:** saída idêntica nos três campos em **13 de 13** LCDs
  retificados do AJUSTE e nos sintéticos.

**Defeito encontrado pelos sintéticos e corrigido antes da avaliação reservada:** o Otsu do
OpenCV trata como claro só o que fica **acima** do limiar, mas a binarização usava `< limiar` para
o escuro. Os pixels exatamente no limiar sumiam. Num sintético perfeitamente bimodal, metade dos
segmentos desaparecia; nas fotos reais, de distribuição contínua, o efeito é marginal. Corrigido
para `<=` no Python e no TS. O AJUSTE foi reexecutado: **sem mudança** (33/36, 0 errado-válido,
10/12 pares). A correção foi motivada pelo teste sintético, não por resultado nas fotos.

**Premissas de geometria expostas pelos sintéticos** (limites do algoritmo, não ajustados):
(i) os segmentos horizontais precisam avançar em x sobre os verticais, como nas pontas
chanfradas dos LCDs reais, senão um dígito vira três grupos; (ii) o "1" precisa ter pelo menos
85% da altura dos outros dígitos do campo, o que vale para segmentos verticais longos, como nos
dois aparelhos. Visores com outras proporções exigem revisar esses limiares.

## 4. OCR com modelo de sete segmentos — Tesseract (família "OCR especializado")

**Origem e licença:** [`Shreeshrii/tessdata_ssd`](https://github.com/Shreeshrii/tessdata_ssd),
Apache-2.0 (compatível com o tesseract.js, Apache-2.0), commit `e493a10`, de 18/04/2019. É um
ajuste fino de `tessdata_best/eng` feito pela autora com texto numérico e três fontes de sete
segmentos sintéticas. O README declara que é uma prova de conceito. **Nada disso entra no
produto**: os modelos ficaram só no diretório temporário e foram servidos ao worker do projeto
no lugar do `eng`.

| Modelo | Execução no worker do projeto | Correto | Errado-válido | Par exato | Teto do OCR | Com dígito ASCII | Com rótulo |
|---|---|---|---|---|---|---|---|
| `7seg` (flutuante) | **abortou** em 92/100 (`DotProductSSE` ausente no núcleo WASM) | 0/36 | 0 | 0/12 | 0/36 | — | — |
| `ssd` (flutuante) | **abortou** em 92/100 (mesma causa) | 0/36 | 0 | 0/12 | 0/36 | — | — |
| `ssd_int` (inteiro; emenda 3) | 100/100 sem erro | 0/36 | 0 | 0/12 | **1/36** (só no LCD cru) | 9–12/12 | 0/12 |

Os números são do AJUSTE, nas cinco condições da emenda 2 (melhor condição de cada coluna).
Nenhuma condição do `ssd_int` produziu candidato: o modelo só reconhece números e pontuação,
então não lê SIS/DIA/PULSO, e `interpretPhoto` não tem âncora. O teto mostra que o problema não
é só de associação: mesmo como texto livre, o número esperado apareceu em 1 de 36 campos.
Também não houve falso positivo na foto desligada.

**Veredito no AJUSTE: não passa** (S2 com 0/12 pares). `7seg` e `ssd` ficam **inconclusivos**
neste ambiente: não rodam no núcleo WASM do projeto sem conversão para inteiro. Não se sabe como
se sairiam no Tesseract nativo. Família 1 reprovou, família 2 passou e família 3 reprovou, então
a condição de parada (b), de duas reprovações seguidas, não se aplicou.

## 5. Por que o ML Kit não emitiu dígitos — análise documental

Base: [E-015](relatorio/decisoes-e-evidencias.md), [resultado do ROI591](task-09-etapa-4-resultado-roi591.md),
[viabilidade](task-09-etapa-6-viabilidade-roi591.md), [visor real](task-09-diagnostico-visor-real.md),
os [cartões sintéticos](../tools/task09/cartoes-ocr.html) e as medições de laboratório deste
documento. Nada foi executado no aparelho. Não se propõe repetir o ROI591 nem varrer parâmetros
do ML Kit.

Fatos de partida: no Samsung, o cartão A (fonte comum) teve os três valores corretos, e o cartão B
(sete segmentos em CSS, mesmo layout, alto contraste) não teve **nenhum dígito ASCII** nos níveis
`Text`, `TextBlock` e `Line` do SDK, mesmo com os rótulos presentes depois do ROI. No BSPII real
houve ausência de campos; com o visor desligado, os rótulos chegaram. Neste laboratório, com
outro motor (Tesseract `eng`), o padrão se repetiu nas fotos reais: rótulos lidos, nenhum valor do
visor no texto. Sobre os dígitos saíram **letras ou símbolos** (letras em 6 a 10 das 12 fotos só
do LCD). Já o H-seg, sem nenhum aprendizado, extraiu 33 de 36 valores das mesmas fotos, inclusive
das de baixa resolução.

| Hipótese | A favor | O que enfraquece | Só o aparelho responde |
|---|---|---|---|
| **H1 — glifo fora da distribuição:** o reconhecedor latino geral não mapeia dígitos de segmentos separados para 0–9 | A e B diferem só no formato dos dígitos; outro motor geral (Tesseract `eng`) falha igual nas fotos reais e troca os dígitos por letras e símbolos; o modelo de sete segmentos do Tesseract também falhou, então o problema não é "falta de fonte" no treino de uma rede só | Cartão CSS ≠ LCD real; uma captura por cartão; não se sabe o que o ML Kit escreveu nas linhas de B | Classe dos caracteres (letra, dígito, pontuação) das linhas **sobre a região dos dígitos**, sem o texto |
| **H2 — a detecção não propõe linhas sobre os dígitos:** segmentos separados não formam uma "linha de texto" para o detector | "Linhas presentes" em B pode vir só dos rótulos; segmentos são componentes desconexos | No Tesseract, a detecção propôs linhas sobre o LCD, então lá isso não aconteceu; o ML Kit tem outro detector | Caixas das linhas comparadas com a região dos dígitos (só sobreposição, sem conteúdo) |
| **H3 — captura: escala, foco, borrão ou exposição do quadro de análise** | O quadro de análise tem 960×720; a câmera em movimento borra | ROI591 ampliou 2× sem ganho; B tem alto contraste; aqui, fotos de 431×670 px são decodificáveis pelo H-seg, então a informação existe mesmo em baixa resolução | Nitidez e tamanho em pixels dos dígitos no buffer real (métrica numérica, sem imagem) |
| **H4 — a bridge ou os filtros descartam os dígitos** | — | `bridge-2` mostrou ausência de ASCII já antes dos filtros (E-015) | — (enfraquecida pelo próprio histórico) |
| **H5 — interpretação ou associação** | — | Nenhum dígito chegou ao interpretador; o `interpretPhoto` lê os cartões A | — (descartada como causa primária) |
| **H6 — confusão com letras (ex.: segmentos lidos como I, l, \|, B, S)** | É o que o Tesseract fez aqui; o indicador "sem ASCII" não exclui letras | Não observado no ML Kit | Mesma contagem por classe de caractere da H1 |

**Leitura.** H1 e H6 são as mais compatíveis com o conjunto de evidências: o problema parece ser
o **tipo de glifo** para modelos de texto geral, e não a captura (H3 enfraquecida pelo H-seg nas
mesmas condições) nem o código do projeto (H4 e H5 enfraquecidas). Isso **não está demonstrado
para o ML Kit**: falta saber o que o SDK escreveu sobre a região dos dígitos. Um único ensaio com
o cartão B, que devolvesse só a contagem de caracteres por classe (letra, dígito, pontuação) e a
sobreposição das caixas com a região dos dígitos, distinguiria H1/H6 de H2 sem expor conteúdo.
Esse ensaio **não foi pedido nem executado**, e decidir fazê-lo cabe ao autor.

Consequência prática, condicionada a H1/H6: nenhum ajuste de pré-processamento para o ML Kit
transforma segmentos em dígitos. Uma etapa de decodificação de segmentos (como o H-seg) ou um
modelo treinado em LCD seria necessária, e qualquer das duas é uma **mudança de abordagem** que
depende da governança (seção 8).

## 6. Avaliação única do conjunto reservado

Executada **uma vez**, com tudo congelado (commit `75adad8`): localizador, H-seg (já com a
correção de Otsu da seção 3.1), condições do Tesseract e ROIs. Nenhum parâmetro mudou depois.
A inspeção visual posterior serviu só para explicar as falhas.

**Correção de contagem do pré-registro:** a seção 1.4 fala em "6 fotos ligadas, 18 campos", mas
a AVALIAÇÃO tem **7 fotos ligadas** (6 BSPII + 1 genérico) e **21 campos**. O sorteio estava
correto; a conta no texto, não. A regra geral se mantém: S1 com 0 errado-válido e 0 troca; S2 com
par exato em ≥ 60% das fotos ligadas, ou seja, **≥ 5 de 7** (mais exigente que o "4 de 6"
escrito).

| Abordagem | Correto | Errado-válido | Troca | Ausente | Par exato | Teto do OCR | Veredito pré-registrado |
|---|---|---|---|---|---|---|---|
| Tesseract.js `eng`, melhor de 9 condições | 0/21 | 0 (1 na foto inteira crua) | 0 | 20–21 | 0/7 | 0/21 | **não funcionou** |
| Tesseract.js `ssd_int`, 5 condições | 0/21 | 0 | 0 | 21 | 0/7 | ≤ 1/21 | **não funcionou** |
| Tesseract.js `7seg` / `ssd` | — | — | — | — | — | — | **inconclusivo** (abortam no núcleo WASM inteiro) |
| **H-seg** (Python; TS idêntico em 7/7) | **16/21** | **0** | **0** | 5 | **6/7** | — | **funcionou** no critério do laboratório |

H-seg por campo: SIS 6/7, DIA 7/7, **PULSO 3/7**. Por aparelho: BSPII com 5/6 pares e genérico
com 1/1.

| Foto (condição do autor) | SIS | DIA | PULSO | Causa observada da ausência |
|---|---|---|---|---|
| 01 ambiente, reflexo | C | C | – | Borda inferior detectada acima da real cortou o pulso; guarda de tinta |
| 02 luz forte, reflexo | C | C | – | Idem |
| 14 sombra no topo | C | C | – | Idem; varredura discordante |
| 15 ambiente, reflexo | C | C | C | — |
| 18 mão à esquerda | – | C | C | Sombra da borda superior fundida aos dígitos do SIS; guarda de tinta |
| 19 reflexo forte dividindo o visor | C | C | C | — |
| 20 genérico | C | C | – | Borda inferior cortou o pulso; guarda de tinta |

Tesseract `eng` por foto: todos os campos ausentes em todas as condições, exceto **18, foto
inteira crua: PULSO errado-válido**. `ssd_int`: todos ausentes.

**Somando AJUSTE e AVALIAÇÃO, H-seg:** 49/57 campos corretos, **0/57 errado-válido**, 0 troca,
16/19 pares e 0 falso positivo no visor desligado. Pela "regra de três", 0 erro em 57 campos dá
um limite superior de 95% de cerca de **5%** para a taxa de errado-válido nessas condições. Só
na AVALIAÇÃO (0 em 21), o limite fica em cerca de **14%**. O pulso cai do AJUSTE para a AVALIAÇÃO
(10/12 → 3/7), o que mostra que a borda inferior do localizador é o ponto mais frágil e que o
sobreajuste não é desprezível.

## 7. Vereditos por abordagem

| Abordagem | Veredito | Em uma frase |
|---|---|---|
| Tesseract.js `eng` do projeto (motor Web decidido), foto inteira e recortes, com e sem pré-processamento | **Não funcionou** | Lê os rótulos impressos, mas nunca o número do LCD (teto 0/57). Na foto desligada e em duas fotos ligadas, `interpretPhoto` transformou um dígito espúrio na linha do rótulo em candidato |
| Tesseract.js com modelos de sete segmentos (`ssd_int`) | **Não funcionou** | Emite dígitos, mas não os do visor (teto de no máximo 2/57 somando a melhor condição de cada conjunto) e não lê rótulos para a associação |
| Tesseract.js `7seg` e `ssd` (flutuantes) | **Inconclusivo** | Incompatíveis com o núcleo WASM inteiro do projeto; exigiriam conversão |
| H-seg, decodificação de segmentos por lógica pura com gabarito por modelo | **Funcionou no critério do laboratório**, com ressalvas | 0 errado-válido em 57 campos e 6/7 pares na avaliação, mas com amostra pequena, um autor, dois aparelhos, pulso frágil e gabarito por modelo; **não testado no aparelho** |
| ML Kit (análise documental) | **Inconclusivo quanto à causa** | H1/H6 (glifo fora da distribuição ou confusão com letras) são as mais compatíveis; só um ensaio no aparelho distingue |

## 8. Limites, o que só o aparelho decide e o que depende da orientadora

**Limites desta investigação.**

- 20 fotos de um único autor, de dois aparelhos, sem variação controlada de foco, distância ou
  ângulo. Três delas têm aspecto de imagem de divulgação. Não há acurácia representativa nem
  p50/p95 de latência.
- O assistente viu todas as fotos ao recebê-las e fez quatro rodadas de ajuste do H-seg com 12
  fotos. A AVALIAÇÃO reduz esse viés, mas tem 7 fotos.
- O H-seg depende de um **gabarito de layout por modelo**: não lê aparelhos desconhecidos e exige
  que o usuário escolha o modelo (ou um guia por modelo). Um "1" de centena **totalmente** oculto
  continua sendo um modo residual de errado-válido.
- O localizador automático **não é** o guia de enquadramento: no app, o recorte viria do guia, e a
  correspondência guia↔quadro tem as dificuldades já documentadas na TASK-09.
- Os tempos (Tesseract de 150 a 520 ms para reconhecer; H-seg de 36 a 76 ms em Python) são do
  contêiner, não de um celular. O porte TS não foi medido em navegador móvel.
- O Tesseract foi testado com a configuração do projeto (PSM 6, `eng` best_int, LSTM). Outras
  configurações não foram varridas, por desenho.

**O que só o aparelho decide.** (1) Se H1/H6 explicam o ML Kit: classe dos caracteres e
sobreposição das caixas sobre os dígitos, sem conteúdo. (2) Se o quadro da câmera do app (preview,
movimento, foco automático, reflexo ao vivo) preserva o que as fotos preservaram. (3) Latência,
memória e o tamanho que o H-seg acrescentaria em Android e no navegador móvel. (4) Se o guia de
enquadramento entrega um recorte estável o bastante para a borda inferior, onde o H-seg falhou.
(5) Toda a privacidade em tempo de execução (FOT-10/11/12), que este laboratório não toca.

**O que dependeria de aprovação da orientadora para virar produto.** A spec (§6.1–6.2) e o
congelamento da decisão técnica (TAP P103, encaminhamento P02) fixam ML Kit no Android e
Tesseract.js na Web e vedam OpenCV operacional. Levar o H-seg ao produto seria **mudança de
abordagem**: uma etapa de decodificação própria no lugar ou ao lado do OCR, um gabarito por
modelo de aparelho e um guia de enquadramento por modelo. Isso exige decisão formal (Q-001,
P117, P106, P048) e não foi feito nem proposto como adotado. O falso positivo de `interpretPhoto`
com Tesseract (seção 2) é uma **observação sobre o produto**: mudar o interpretador também passa
pelo fluxo normal de revisão, e nada foi alterado aqui.

## 9. Registro para o relatório final

- **Data e base:** 28/11/2026; branch `exp/fotografia-lab` a partir de `staging @ f8cfdee`;
  avaliação no commit `75adad8`.
- **Dados:** 20 fotos do autor (16 do G-Tech BSPII ligado, 1 desligado, 3 de um segundo aparelho
  genérico), mantidas só na sessão, nunca comitadas. Divisão sorteada: 13 para AJUSTE e 7 para
  AVALIAÇÃO reservada.
- **Pré-registro** antes de qualquer execução (commit `327a30b`), com três emendas registradas
  antes das execuções correspondentes e uma correção de contagem declarada.
- **Resultado principal:** o motor Web decidido (Tesseract.js `eng`) **não lê** o LCD de sete
  segmentos real em nenhuma das 9 condições testadas (0 de 57 valores aparecem no texto), mas lê
  os rótulos impressos, o mesmo padrão observado no ML Kit. Modelos Tesseract de sete segmentos
  de terceiros também não resolveram (`ssd_int`) ou não rodam no núcleo WASM do projeto
  (`7seg`, `ssd`).
- **Candidata comparativa:** uma decodificação de sete segmentos por lógica pura (H-seg), com
  gabarito por modelo, atingiu na avaliação reservada 16/21 campos, 6/7 pares SIS/DIA e **0
  valor errado apresentado como válido**. No total (57 campos), 0 errado-válido, com limite
  superior de 95% de cerca de 5%. O pulso é o ponto fraco (borda inferior do recorte).
- **Achado de segurança no produto (sem alteração):** com o Tesseract, `interpretPhoto` aceitou
  como candidato um dígito espúrio na linha de um rótulo. Isso aconteceu na foto do aparelho
  desligado (pulso) e em duas fotos ligadas.
- **Não demonstrado:** nada foi executado em celular; o H-seg não está no produto; a causa do
  fracasso do ML Kit não foi comprovada; a fotografia **não está concluída**.

---

# Parte 2 — 28/11/2026

## 10. Correção do `interpretPhoto`: dígito espúrio na linha do rótulo

**Defeito (Parte 1, seção 2):** com o Tesseract, um dígito isolado (pedaço de segmento, barra
colorida ou ícone) na mesma linha de um rótulo virava candidato pela regra rótulo + valor. Isso
aconteceu em 3 fotos, uma delas com o aparelho desligado.

**Testes primeiro (`src/domain/interpret-photo.test.ts`, textos sintéticos):** dígito isolado
antes ou depois do rótulo ("7 PULSO", "PULSO 7", "/ 5 DIA", "SIS : 4 mmHg"); visor apagado com
ruído da carcaça; fragmento de um dígito em caixa separada ao lado do rótulo (layout); memória e
hora junto do rótulo; dois dígitos fora da faixa continuam candidatos. Antes da correção, **6 de
54** testes falharam (os de dígito isolado, visor apagado e layout). Os de memória e hora já
passavam.

**Correção mínima (`valueOf`):** um inteiro de **um único dígito** junto a um rótulo, na linha ou
por layout, fica `unreadable` (campo vazio). É uma **regra de forma, não de faixa**: nenhum campo
de pressão ou pulso de display tem um dígito. Nada é completado, trocado ou escolhido, e valores
de dois ou mais dígitos fora da faixa continuam candidatos para a validação da revisão, como
antes. Documentado também em [task-09-interpretacao-fotografia.md](task-09-interpretacao-fotografia.md).

**Verificação:** 439 testes de `src/domain`, `src/services/recognition` e
`src/features/assisted-entry` passaram (os 54 do interpretador incluídos). Reexecutando o
Tesseract.js do projeto nas fotos inteiras (crua, Otsu e Otsu invertido) com o interpretador
corrigido, as 20 fotos tiveram **0 errado-válido e 0 falso positivo** (antes: 2 errado-válido e
o falso positivo da foto desligada). É uma verificação **dentro da amostra**: as mesmas fotos
que revelaram o defeito. A leitura continua 0/57, porque a correção não faz o Tesseract ler
segmentos.
