// Ponta a ponta do leitor de sete segmentos EXPERIMENTAL da demo (candidato NÃO habilitado no app).
// Requer o export Web em demos/web-capture/dist e o Chromium do Playwright. Sobe serve.mjs (CSP real),
// substitui getUserMedia por um stream de canvas com um visor SINTÉTICO encaixado na guia e confere:
// leitura, revisão em memória, cancelamento, descarte de câmera/canvas, zero requisições externas e
// zero IndexedDB/Cache/localStorage/sessionStorage/service worker.
//
// Uso:  node demos/web-capture/checks/seven-segment-e2e.mjs
// Local (NUNCA comitar entradas nem saídas): --lcd-dir <dir> --expected <gabarito.csv> usa LCDs reais
// já retificados (<id>-<modelo>-<L>x<A>.raw, de hseg_v2.py export) e imprime só categorias, sem valores.
import { spawn } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1]]);
  return pairs;
}, []));
const ORIGIN = 'http://127.0.0.1:8098';
const fail = message => { throw new Error(message); };

// Desenho do visor sintético e da guia, injetado na página (mesma geometria de seven-segment/guide.ts).
function pageHelpers() {
  const ASPECT = { gtech: 1.35, generic: 1.3 };
  const ROWS = { gtech: [[0.05, 0.3], [0.44, 0.3], [0.78, 0.19]], generic: [[0.14, 0.26], [0.47, 0.25], [0.79, 0.18]] };
  const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  window.__guide = (fw, fh, device) => {
    let w = 0.5 * fw, h = w * ASPECT[device];
    if (h > 0.9 * fh) { h = 0.9 * fh; w = h / ASPECT[device]; }
    return { x: (fw - w) / 2, y: (fh - h) / 2, width: w, height: h };
  };
  window.__drawLcd = (ctx, area, device, values) => {
    const lcdH = 400 * ASPECT[device], sx = area.width / 400, sy = area.height / lcdH;
    ctx.fillStyle = 'rgb(190,196,186)'; ctx.fillRect(area.x, area.y, area.width, area.height); ctx.fillStyle = 'rgb(48,52,48)';
    values.forEach((value, row) => {
      const [top, size] = ROWS[device][row], h = size * lcdH, w = 0.5 * h, t = 0.09 * h, gap = 2, half = h / 2, len = half - t / 2 - 2 * gap;
      [...value].reverse().forEach((ch, k) => {
        const x = 380 - (k + 1) * 0.62 * h, y = top * lcdH;
        const b = { a: [x + t / 2, y, w - t, t], g: [x + t / 2, y + half - t / 2, w - t, t], d: [x + t / 2, y + h - t, w - t, t],
          f: [x, y + t / 2 + gap, t, len], b: [x + w - t, y + t / 2 + gap, t, len], e: [x, y + half + gap, t, len], c: [x + w - t, y + half + gap, t, len] };
        for (const s of SEG[ch]) { const [rx, ry, rw, rh] = b[s]; ctx.fillRect(area.x + rx * sx, area.y + ry * sy, rw * sx, rh * sy); }
      });
    });
  };
  // Instrumentação: canvases criados pela demo e streams entregues.
  window.__check = { canvases: [], streams: [] };
  const create = document.createElement.bind(document);
  window.__createRaw = create;
  document.createElement = function (name, ...rest) {
    const element = create(name, ...rest);
    if (String(name).toLowerCase() === 'canvas') window.__check.canvases.push(element);
    return element;
  };
  // Câmera falsa: cena 1280×720 com o visor (sintético ou LCD cinza informado) dentro da guia.
  window.__scene = null;
  navigator.mediaDevices.getUserMedia = async () => {
    const scene = window.__scene ?? fail('sem-cena');
    const canvas = create('canvas'); canvas.width = 1280; canvas.height = 720;
    const ctx = canvas.getContext('2d');
    const draw = () => {
      ctx.fillStyle = 'rgb(225,226,228)'; ctx.fillRect(0, 0, 1280, 720);
      const area = window.__guide(1280, 720, scene.device);
      if (scene.values) window.__drawLcd(ctx, area, scene.device, scene.values);
      else ctx.drawImage(scene.bitmap, area.x, area.y, area.width, area.height);
    };
    draw();
    const stream = canvas.captureStream(15);
    const timer = setInterval(draw, 66);
    stream.getVideoTracks()[0].addEventListener('ended', () => clearInterval(timer));
    const stop = MediaStreamTrack.prototype.stop;
    for (const track of stream.getTracks()) track.stop = function () { clearInterval(timer); stop.call(this); };
    window.__check.streams.push(stream);
    return stream;
  };
  function fail(message) { throw new Error(message); }
}

const server = spawn(process.execPath, [new URL('../serve.mjs', import.meta.url).pathname], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => {
  server.stdout.once('data', resolve);
  server.once('exit', code => reject(new Error(`serve.mjs saiu (${code}); rode o export Web antes`)));
});
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const results = { synthetic: null, camera: [], cancel: null, confirmInMemory: null, real: null };
try {
  const context = await browser.newContext({ viewport: { width: 900, height: 1400 } });
  const requests = [];
  context.on('request', request => requests.push({ url: request.url(), method: request.method() }));
  await context.addInitScript(pageHelpers);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', () => errors.push('runtime-exception'));
  await page.goto(`${ORIGIN}/`);
  const button = name => page.getByRole('button', { name, exact: true });
  const radio = name => page.getByRole('radio', { name, exact: true });
  const read = async () => Promise.all(['Sistólica', 'Diastólica', 'Pulso'].map(label => page.locator(`input[aria-label="${label}"]`).inputValue()));
  const waitReview = () => page.locator('input[aria-label="Sistólica"]').waitFor({ timeout: 30000 });
  const waitText = text => page.getByText(text, { exact: false }).first().waitFor({ timeout: 30000 });

  await radio('Leitor de sete segmentos (experimental)').click();
  await waitText('Candidato de laboratório, NÃO habilitado no Aferi');

  // 1) Visor sintético sem câmera.
  await button('Testar com visor sintético (sem câmera)').click();
  await waitReview();
  results.synthetic = await read();
  if (results.synthetic.join('/') !== '120/80/72') fail('sintetico-sem-camera');

  // 2) Câmera falsa com visor sintético encaixado na guia, nos dois modelos.
  for (const [device, label, values] of [['gtech', 'G-Tech BSPII', ['135', '85', '64']],
    ['generic', 'Aparelho genérico (o das fotos de teste)', ['142', '91', '77']]]) {
    await radio(label).click();
    await page.evaluate(scene => { window.__scene = scene; }, { device, values });
    await button('Iniciar câmera (sete segmentos)').click();
    await waitText('Encaixe o visor na guia e toque em Capturar.');
    await button('Capturar e ler segmentos').click();
    await waitText('Confira os candidatos abaixo.');
    await waitReview();
    const got = await read();
    const released = await page.evaluate(() => ({
      tracksEnded: window.__check.streams.every(s => s.getTracks().every(t => t.readyState === 'ended')),
      videoCleared: document.querySelector('video').srcObject === null,
      canvasesCleared: window.__check.canvases.every(c => c.width === 0 && c.height === 0),
    }));
    results.camera.push({ device, ok: got.join('/') === values.join('/'), ...released });
    if (got.join('/') !== values.join('/') || !Object.values(released).every(Boolean)) fail(`camera-${device}`);
  }

  // 3) Confirmação apenas em memória.
  await button('Confirmar revisão em memória').click();
  await waitText('Confirmação demonstrada somente em memória.');
  results.confirmInMemory = true;

  // 4) Cancelar com a câmera aberta: libera tudo e não devolve resultado.
  await radio('G-Tech BSPII').click();
  await page.evaluate(() => { window.__scene = { device: 'gtech', values: ['120', '80', '72'] }; });
  await button('Iniciar câmera (sete segmentos)').click();
  await waitText('Encaixe o visor na guia e toque em Capturar.');
  await button('Cancelar captura').click();
  await waitText('Tentativa cancelada.');
  await page.waitForTimeout(800);
  results.cancel = await page.evaluate(() => ({
    tracksEnded: window.__check.streams.every(s => s.getTracks().every(t => t.readyState === 'ended')),
    videoCleared: document.querySelector('video').srcObject === null,
    noReview: !document.querySelector('input[aria-label="Sistólica"]'),
  }));
  if (!Object.values(results.cancel).every(Boolean)) fail('cancelamento');

  // 5) Opcional, só local: LCDs reais retificados (não comitar). Imprime só categorias.
  if (args['lcd-dir']) {
    const rows = Object.fromEntries((await readFile(args.expected, 'utf8')).trim().split('\n').slice(1)
      .map(line => line.split(',')).map(([id, sis, dia, pul]) => [id, [sis, dia, pul]]));
    const files = (await readdir(args['lcd-dir'])).filter(name => name.endsWith('.raw')).sort();
    const summary = { fotos: 0, campos: 0, correto: 0, errado_valido: 0, ausente: 0, par_exato: 0, falso_positivo: 0, por_foto: [] };
    for (const name of files) {
      const [id, device, size] = name.slice(0, -4).split('-');
      const [width, height] = size.split('x').map(Number);
      const gray = await readFile(join(args['lcd-dir'], name));
      await radio(device === 'generic' ? 'Aparelho genérico (o das fotos de teste)' : 'G-Tech BSPII').click();
      await page.evaluate(async ({ device: d, width: w, height: h, base64 }) => {
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const rgba = new Uint8ClampedArray(w * h * 4);
        for (let i = 0; i < w * h; i++) { rgba[4 * i] = rgba[4 * i + 1] = rgba[4 * i + 2] = bytes[i]; rgba[4 * i + 3] = 255; }
        window.__scene = { device: d, bitmap: await createImageBitmap(new ImageData(rgba, w, h)) };
      }, { device, width, height, base64: gray.toString('base64') });
      await button('Iniciar câmera (sete segmentos)').click();
      await waitText('Encaixe o visor na guia e toque em Capturar.');
      await button('Capturar e ler segmentos').click();
      await waitText('Confira os candidatos abaixo.');
      await waitReview();
      const got = await read();
      const expected = rows[id];
      const off = expected.every(v => v === '');
      const cats = got.map((value, i) => value === '' ? '-' : off ? 'FP' : value === expected[i] ? 'C' : 'E');
      if (!off) {
        summary.fotos++; summary.campos += 3;
        summary.correto += cats.filter(c => c === 'C').length; summary.errado_valido += cats.filter(c => c === 'E').length;
        summary.ausente += cats.filter(c => c === '-').length; summary.par_exato += cats[0] === 'C' && cats[1] === 'C';
      } else summary.falso_positivo += cats.filter(c => c === 'FP').length;
      summary.por_foto.push(`${id}:${cats.join('/')}`);
      await button('Cancelar').click();
    }
    results.real = summary;
  }

  const storage = await page.evaluate(async () => ({ indexedDb: (await indexedDB.databases()).length, caches: (await caches.keys()).length,
    serviceWorkers: (await navigator.serviceWorker.getRegistrations()).length, localStorage: localStorage.length, sessionStorage: sessionStorage.length }));
  const external = requests.filter(r => !r.url.startsWith(ORIGIN) && !r.url.startsWith('blob:') && !r.url.startsWith('data:'));
  const writes = requests.filter(r => !['GET', 'HEAD'].includes(r.method));
  if (Object.values(storage).some(Boolean)) fail('armazenamento');
  if (external.length || writes.length) fail('rede');
  if (errors.length) fail('excecao-de-runtime');
  process.stdout.write(JSON.stringify({ ...results, storage, externalRequests: external.length, writeRequests: writes.length,
    runtimeErrors: errors.length, physicalCamera: 'not-tested', note: 'Câmera substituída por stream de canvas; não é teste de aparelho.' }) + '\n');
} finally {
  await browser.close();
  server.kill();
}
