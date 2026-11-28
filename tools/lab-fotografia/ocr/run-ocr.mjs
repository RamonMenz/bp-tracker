// LABORATÓRIO — roda o adaptador Tesseract.js do projeto no Chromium local sobre fotos locais.
// Nada é enviado para fora de 127.0.0.1; requisições externas abortam a execução.
// Uso:
//   node tools/lab-fotografia/ocr/run-ocr.mjs --photos <dir com NN.jpg> --assets <node_modules
//     de demos/web-capture/ocr-assets> --esbuild <caminho do binário esbuild> --out <arquivo.json>
//     [--roi <rois.json>] [--model <arquivo .traineddata.gz>] [--conditions full-raw,crop-otsu,...]
// A saída contém texto bruto de OCR: grave-a SOMENTE fora do repositório.
import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile, mkdtemp } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1]]);
  return pairs;
}, []));
for (const required of ['photos', 'assets', 'esbuild', 'out']) {
  if (!args[required]) throw new Error(`argumento obrigatório ausente: --${required}`);
}
const repo = resolve(import.meta.dirname, '../../..');
const require = createRequire(join(resolve(args.assets), 'package.json'));
const pinned = [['tesseract.js', '7.0.0'], ['tesseract.js-core', '7.0.0'], ['@tesseract.js-data/eng', '1.0.0']];
for (const [name, version] of pinned) {
  if (require(`${name}/package.json`).version !== version) throw new Error('versao-de-asset-divergente');
}
const core = dirname(require.resolve('tesseract.js-core/package.json'));
const files = new Map([
  ['/ocr/safe-worker.js', join(repo, 'demos/web-capture/scripts/safe-worker.js')],
  ['/ocr/worker.min.js', require.resolve('tesseract.js/dist/worker.min.js')],
  ['/ocr/eng.traineddata.gz', args.model ? resolve(args.model)
    : require.resolve('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz')],
]);
for (const stem of ['tesseract-core-lstm', 'tesseract-core-simd-lstm', 'tesseract-core-relaxedsimd-lstm']) {
  for (const extension of ['.wasm', '.wasm.js']) files.set(`/ocr/${stem}${extension}`, join(core, stem + extension));
}

const build = await mkdtemp(join(tmpdir(), 'lab-ocr-'));
execFileSync(resolve(args.esbuild), [join(import.meta.dirname, 'entry.ts'), '--bundle', '--format=iife',
  `--outfile=${join(build, 'bundle.js')}`, `--alias:@=${join(repo, 'src')}`, '--log-level=warning', '--tsconfig-raw={}']);
files.set('/bundle.js', join(build, 'bundle.js'));
const page = '<!doctype html><meta charset="utf-8"><script src="/bundle.js"></script>';

const photos = (await readdir(resolve(args.photos))).filter(name => /^\d{2}\.jpe?g$/i.test(name)).sort();
for (const name of photos) files.set(`/img/${name}`, join(resolve(args.photos), name));
const types = { '.js': 'text/javascript', '.wasm': 'application/wasm', '.gz': 'application/octet-stream', '.jpg': 'image/jpeg' };
const server = createServer(async (request, response) => {
  const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  if (path === '/') { response.writeHead(200, { 'content-type': 'text/html' }); response.end(page); return; }
  const file = files.get(path);
  if (!file) { response.writeHead(404); response.end(); return; }
  const extension = path.slice(path.lastIndexOf('.'));
  response.writeHead(200, { 'content-type': types[extension] ?? 'application/octet-stream' });
  response.end(await readFile(file));
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;

const rois = args.roi ? JSON.parse(await readFile(resolve(args.roi), 'utf8')) : {};
// full = foto inteira; crop = só o LCD; croplab = LCD + faixa à direita com os rótulos impressos.
const all = ['full', 'crop', 'croplab'].flatMap(region => ['raw', 'otsu', 'otsu-inv'].map(p => `${region}-${p}`));
const conditions = args.conditions ? args.conditions.split(',') : all.filter(c => c.startsWith('full') || args.roi);

const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const context = await browser.newContext();
const external = [];
await context.route('**/*', route => {
  if (route.request().url().startsWith(origin)) return route.continue();
  external.push(route.request().url());
  return route.abort();
});
const tab = await context.newPage();
await tab.goto(origin);
const results = [];
for (const name of photos) {
  const id = basename(name).slice(0, 2);
  for (const condition of conditions) {
    const [region, ...rest] = condition.split('-');
    const preprocess = rest.join('-') === 'raw' ? 'none' : rest.join('-');
    const roi = region === 'full' ? null : rois[id]?.[region] ?? null;
    if (region !== 'full' && !roi) { results.push({ id, condition, error: 'roi-ausente' }); continue; }
    const result = await tab.evaluate(job => globalThis.runLabJob(job), { url: `/img/${name}`, roi, preprocess });
    results.push({ id, condition, ...result });
    process.stdout.write(`${id} ${condition} ${result.error ?? 'ok'}\n`);
  }
}
await browser.close();
server.close();
if (external.length) throw new Error(`requisicao-externa-bloqueada: ${external.length}`);
await writeFile(resolve(args.out), JSON.stringify({ model: args.model ? basename(args.model) : 'eng-4.0.0_best_int', results }, null, 1));
process.stdout.write(`resultados gravados; requisicoes externas: ${external.length}\n`);
