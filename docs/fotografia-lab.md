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
| 2. Linha de base Tesseract.js | Pendente | Harness em `tools/lab-fotografia/` |
| 3. H-seg (Python, depois TS) | Pendente | — |
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

A análise da causa do fracasso do ML Kit é documental (seção 6) e não conta como família.

### 1.6 Condições de parada

(a) plano completo; (b) **duas famílias seguidas** sem passar no critério de ajuste: as famílias
seguintes não são executadas, a AVALIAÇÃO é rodada uma vez para as já executadas e o resultado
é reportado; (c) limite de uso da sessão. Não há varredura cega de parâmetros. Cada ajuste
aplicado no H-seg é registrado com o motivo.
