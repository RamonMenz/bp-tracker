# Laboratório de fotografia do display — fora do produto

Scripts da investigação registrada em [`docs/fotografia-lab.md`](../../docs/fotografia-lab.md).
**Nada aqui é dependência do app**: nenhum script é importado por `src/` ou `app/`, nenhuma
dependência entra no `package.json` raiz, nenhum motor é trocado ou habilitado.

## Privacidade

- Fotos, gabarito (valores esperados) e todas as saídas ficam **fora do repositório**, num
  diretório temporário. Os scripts recebem os caminhos como argumento e nunca gravam imagens.
- As saídas de `run-ocr.mjs` e `hseg.py decode` contêm texto bruto de OCR e valores lidos. Não as
  comite. `score.py` imprime somente categorias (correto, errado, ausente, troca), sem valores.
- Nenhum serviço remoto: o servidor de `run-ocr.mjs` escuta só em `127.0.0.1` e aborta a execução
  se a página tentar qualquer outra origem.

## Preparação (uma vez, fora do repositório)

```bash
LAB=/caminho/temporario          # fora do repositório
# Python/OpenCV (somente laboratório)
python3 -m venv "$LAB/venv"
"$LAB/venv/bin/pip" install opencv-python-headless==4.10.0.84 numpy==2.1.3
# Assets Tesseract.js fixados no lock de demos/web-capture (7.0.0, eng 4.0.0_best_int)
mkdir -p "$LAB/ocr-assets" && cp demos/web-capture/ocr-assets/package*.json "$LAB/ocr-assets/"
(cd "$LAB/ocr-assets" && npm ci --ignore-scripts)
# esbuild só para empacotar o harness
mkdir -p "$LAB/labnode" && (cd "$LAB/labnode" && npm init -y && npm i esbuild@0.24.0)
```

As fotos ficam em `$LAB/photos/NN.jpg` (NN = ID do gabarito). O gabarito `$LAB/expected.csv`
tem as colunas `id,sis,dia,pul,device,...`, com `sis` vazio para o aparelho desligado e
`device` = `gtech`, `gtech-off` ou `generic`.

## Scripts

| Script | O que faz |
|---|---|
| `hseg.py locate` | Localiza o LCD (H-seg) e grava os ROIs normalizados (`crop` = só o LCD; `croplab` = LCD + faixa à direita com os rótulos) |
| `ocr/run-ocr.mjs` | Empacota `ocr/entry.ts`, que importa sem alteração o adaptador Web do projeto (`tesseract-worker.web.ts` + `interpretPhoto`), e o roda no Chromium local em condições fixas |
| `hseg.py decode` | H-seg: decodificação de sete segmentos por lógica pura, com gabarito de layout por modelo |
| `score.py` | Pontua contra o gabarito e imprime só categorias e agregados |
| `evaluate.py` | Validação independente em um comando: aplica uma versão congelada do H-seg (verifica o sha256) e imprime métricas e veredito pré-registrados, sem valores (docs, seção 11) |
| `hseg-ts/hseg.ts` | Porte em TypeScript puro (sem I/O, DOM ou dependências) da decodificação do H-seg, a partir de um LCD já retificado em tons de cinza |
| `hseg-ts/check-hseg.mts` | Verificações com visores 100% sintéticos (`hseg-ts/synthetic.ts`); nome sem `.test` para não entrar no Jest do app |

```bash
python3 -I tools/lab-fotografia/hseg.py locate --photos "$LAB/photos" --out "$LAB/out/rois.json"
node tools/lab-fotografia/ocr/run-ocr.mjs --photos "$LAB/photos" --assets "$LAB/ocr-assets" \
  --esbuild "$LAB/labnode/node_modules/.bin/esbuild" --roi "$LAB/out/rois.json" --out "$LAB/out/tess.json"
"$LAB/venv/bin/python" -I tools/lab-fotografia/hseg.py decode --photos "$LAB/photos" \
  --expected "$LAB/expected.csv" --out "$LAB/out/hseg.json" --ids 03,04
"$LAB/venv/bin/python" -I tools/lab-fotografia/score.py --expected "$LAB/expected.csv" \
  --results "$LAB/out/hseg.json" --ids 03,04
```

```bash
node --test tools/lab-fotografia/hseg-ts/check-hseg.mts      # Node 22.18+ (remoção nativa de tipos)
npx tsc -p tools/lab-fotografia/hseg-ts/tsconfig.json        # tipos estritos do porte
```

`run-ocr.mjs --model <arquivo.traineddata.gz>` serve outro modelo no lugar de
`eng.traineddata.gz`, sem mudar o worker do projeto (seção 4 do documento).
`hseg.py decode` lê do gabarito apenas a coluna `device`, que simula a escolha do guia de
enquadramento pelo usuário. Os valores esperados não entram na decodificação.
