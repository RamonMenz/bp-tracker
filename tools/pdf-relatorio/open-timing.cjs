/**
 * Tempo de abertura do app Web exportado, em Chromium local (Playwright), comparando dois builds
 * (ex.: antes e depois do relatório PDF). Rede externa bloqueada nos dois; execuções alternadas
 * (A, B, A, B…) para diluir variação da máquina. Sem login: o Histórico exige conta, então o que
 * se mede é a abertura do app até a tela de entrada ("Entrar com Google") — o mesmo `entry` que
 * carrega o Histórico.
 *
 * Uso: node tools/pdf-relatorio/open-timing.cjs <distA> <rotuloA> <distB> <rotuloB> [execucoes=15]
 * Requer Playwright + Chromium no ambiente (NÃO é dependência do projeto).
 */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const [distA, labelA, distB, labelB, runsArg] = process.argv.slice(2);

if (!distA || !labelA || !distB || !labelB) {
  process.stderr.write('uso: node tools/pdf-relatorio/open-timing.cjs <distA> <rotuloA> <distB> <rotuloB> [execucoes]\n');
  process.exit(2);
}

const RUNS = Number(runsArg ?? 15);

function serve(distDir) {
  const root = path.resolve(distDir);
  const server = http.createServer((request, response) => {
    let file = path.join(root, decodeURIComponent(new URL(request.url, 'http://local').pathname));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
    const type = file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html';
    response.writeHead(200, { 'content-type': type });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function measure(browser, origin) {
  const context = await browser.newContext({ timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' });
  const scripts = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (!url.startsWith(origin)) return route.abort();
    if (url.endsWith('.js')) scripts.push(url.slice(origin.length));
    return route.continue();
  });
  const page = await context.newPage();
  await page.goto(`${origin}/`, { waitUntil: 'commit' });
  await page.getByText('Entrar com Google').first().waitFor({ state: 'visible', timeout: 30000 });
  const timing = await page.evaluate(() => {
    const [navigation] = performance.getEntriesByType('navigation');
    const paint = performance.getEntriesByName('first-contentful-paint')[0];
    return {
      telaDeEntradaMs: performance.now(),
      domContentLoadedMs: navigation.domContentLoadedEventEnd,
      fcpMs: paint ? paint.startTime : null,
      heapUsadoMb: performance.memory ? performance.memory.usedJSHeapSize / 1e6 : null,
    };
  });
  await context.close();
  return { ...timing, scripts };
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return { mediana: Math.round(at(0.5)), p90: Math.round(at(0.9)), min: Math.round(sorted[0]), max: Math.round(sorted[sorted.length - 1]) };
}

async function main() {
  const servers = [await serve(distA), await serve(distB)];
  const origins = servers.map((server) => `http://127.0.0.1:${server.address().port}`);
  const browser = await chromium.launch();
  const samples = { [labelA]: [], [labelB]: [] };

  try {
    // Aquecimento (cache de disco do SO/V8) descartado.
    await measure(browser, origins[0]);
    await measure(browser, origins[1]);

    for (let run = 0; run < RUNS; run += 1) {
      samples[labelA].push(await measure(browser, origins[0]));
      samples[labelB].push(await measure(browser, origins[1]));
    }
  } finally {
    await browser.close();
    servers.forEach((server) => server.close());
  }

  const summary = {};
  for (const [label, runs] of Object.entries(samples)) {
    summary[label] = {
      execucoes: runs.length,
      telaDeEntradaMs: stats(runs.map((run) => run.telaDeEntradaMs)),
      domContentLoadedMs: stats(runs.map((run) => run.domContentLoadedMs)),
      fcpMs: stats(runs.filter((run) => run.fcpMs !== null).map((run) => run.fcpMs)),
      heapUsadoMb: stats(runs.filter((run) => run.heapUsadoMb !== null).map((run) => run.heapUsadoMb)),
      scriptsCarregados: runs[0].scripts,
    };
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`falhou: ${error.message}\n`);
  process.exit(1);
});
