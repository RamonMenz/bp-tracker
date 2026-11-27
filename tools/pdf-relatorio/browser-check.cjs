/**
 * Verificação local do relatório PDF no export Web, em Chromium (Playwright) — sem login, sem
 * Firebase real e com TODA a rede externa bloqueada. Dados sintéticos.
 *
 * Uso (na raiz do repositório, depois de `npx expo export -p web --output-dir <dist>`):
 *   node tools/pdf-relatorio/browser-check.cjs <dist> [<pasta-de-saida>]
 *
 * Requer Playwright + Chromium disponíveis no ambiente (NÃO é dependência do projeto).
 *
 * O que verifica (falha com código 1 se algo não bater):
 *   - PDF-01: nenhum chunk do relatório (pipeline/jsPDF) é requisitado na abertura do app;
 *   - PDF-11: durante a geração, só há requisições ao próprio servidor local (chunks do
 *     relatório); qualquer host externo tentado é listado por fase (abertura × geração);
 *   - PDF-17 (Web): a geração não grava nada no navegador (IndexedDB, Cache Storage, OPFS,
 *     localStorage, sessionStorage, service workers) e toda URL de objeto criada é revogada
 *     depois do atraso de consumo — o relógio da página é avançado em 61 s para conferir.
 *
 * Como chama o relatório sem login: localiza no `entry` o módulo do adaptador Web (pela
 * assinatura `openPreview:<x>}},<id>,`) e o executa pelo `__r` do runtime do Metro.
 */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const [distArg, outArg] = process.argv.slice(2);

if (!distArg) {
  process.stderr.write('uso: node tools/pdf-relatorio/browser-check.cjs <dist> [<saida>]\n');
  process.exit(2);
}

const distDir = path.resolve(distArg);
const outDir = path.resolve(outArg ?? path.join(distDir, '..', 'pdf-browser-check'));
fs.mkdirSync(outDir, { recursive: true });

function findPlatformModuleId() {
  const webDir = path.join(distDir, '_expo/static/js/web');
  const entry = fs.readdirSync(webDir).find((name) => name.startsWith('entry-'));
  const source = fs.readFileSync(path.join(webDir, entry), 'utf8');
  const match = /openPreview:[A-Za-z_$][\w$]*\}\},(\d+),/.exec(source);

  if (!match) {
    throw new Error('módulo do adaptador Web não encontrado no entry');
  }

  return Number(match[1]);
}

function serve() {
  const server = http.createServer((request, response) => {
    const urlPath = decodeURIComponent(new URL(request.url, 'http://local').pathname);
    let file = path.join(distDir, urlPath);

    if (!file.startsWith(distDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(distDir, 'index.html');
    }

    const type = file.endsWith('.js') ? 'application/javascript' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream';
    response.writeHead(200, { 'content-type': type });
    fs.createReadStream(file).pipe(response);
  });

  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** Fotografia do armazenamento persistente do navegador (onde um temporário poderia ficar). */
async function storageSnapshot(page) {
  return page.evaluate(async () => {
    let opfsEntries = 0;

    if (navigator.storage?.getDirectory) {
      const directory = await navigator.storage.getDirectory();
      for await (const entry of directory.keys()) {
        void entry;
        opfsEntries += 1;
      }
    }

    return {
      indexedDb: (await indexedDB.databases()).map((database) => database.name).sort(),
      cacheStorage: (await caches.keys()).sort(),
      opfsEntries,
      localStorageKeys: Object.keys(localStorage).sort(),
      sessionStorageKeys: Object.keys(sessionStorage).sort(),
      serviceWorkers: (await navigator.serviceWorker.getRegistrations()).length,
    };
  });
}

/** Conta URLs de objeto criadas e revogadas na página (instalado antes da geração). */
async function trackObjectUrls(page) {
  await page.evaluate(() => {
    const created = [];
    const revoked = [];
    const originalCreate = URL.createObjectURL.bind(URL);
    const originalRevoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (object) => {
      const url = originalCreate(object);
      created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      revoked.push(url);
      originalRevoke(url);
    };
    globalThis.__aferiObjectUrls = { created, revoked };
  });
}

async function objectUrlCounts(page) {
  return page.evaluate(() => {
    const { created, revoked } = globalThis.__aferiObjectUrls;
    return { criadas: created.length, revogadas: revoked.length, pendentes: created.filter((url) => !revoked.includes(url)).length };
  });
}

/** Gera um relatório sintético pelo adaptador Web real, dentro da página. */
async function generateInPage(page, platformModuleId) {
  return page.evaluate(async (moduleId) => {
    const platform = globalThis.__r(moduleId).reportPdfPlatform;
    const pipeline = await platform.loadPipeline();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const period = pipeline.resolvePeriod({ kind: 'all' }, new Date('2026-11-26T17:03:00Z'), timeZone);
    const reading = (id, systolic, diastolic, iso, note = null) => ({
      id, systolic, diastolic, pulse: 70, measuredAt: new Date(iso), createdAt: new Date(iso), note, source: 'manual',
      sessionReadings: null, hasPendingWrites: false,
    });
    const built = pipeline.buildModel(
      {
        readings: [
          reading('s1', 120, 80, '2026-11-20T11:00:00Z'),
          reading('s2', 130, 90, '2026-11-21T21:30:00Z', '<img src="https://exemplo.invalid/x.png"> observação sintética'),
          reading('s3', 140, 100, '2026-11-22T12:15:00Z'),
        ],
        fromCache: false,
        omittedCount: 0,
      },
      period.period,
    );
    const pdf = await pipeline.render(built.model);
    const preview = platform.openPreview(pdf);
    const previewBytes = (await (await fetch(preview.url)).arrayBuffer()).byteLength;
    preview.release();
    platform.deliver(built.model.fileName, pdf);
    return { fileName: built.model.fileName, type: pdf.type, size: pdf.size, previewBytes };
  }, platformModuleId);
}

async function main() {
  const platformModuleId = findPlatformModuleId();
  const server = await serve();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const failures = [];

  try {
    const context = await browser.newContext({ acceptDownloads: true, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' });
    let phase = 'abertura';
    const requests = { abertura: [], geracao: [] };
    const blocked = { abertura: [], geracao: [] };

    await context.route('**/*', (route) => {
      const url = route.request().url();

      if (url.startsWith(origin) || url.startsWith('blob:') || url.startsWith('data:')) {
        requests[phase].push(url.startsWith(origin) ? url.slice(origin.length) : url.split(':')[0] + ':');
        return route.continue();
      }

      blocked[phase].push(new URL(url).host);
      return route.abort();
    });

    const page = await context.newPage();
    // Relógio controlável: o tempo corre normalmente, mas pode ser adiantado para conferir a
    // revogação que acontece 60 s depois do consumo.
    await page.clock.install();
    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });

    const storageBefore = await storageSnapshot(page);
    await trackObjectUrls(page);
    phase = 'geracao';
    const downloadPromise = page.waitForEvent('download');
    const generated = await generateInPage(page, platformModuleId);
    const download = await downloadPromise;
    const saved = path.join(outDir, download.suggestedFilename());
    await download.saveAs(saved);

    const urlsRightAfter = await objectUrlCounts(page);
    await page.clock.fastForward('01:01');
    const urlsAfterDelay = await objectUrlCounts(page);
    const storageAfter = await storageSnapshot(page);

    const reportChunks = /report-pdf-pipeline|jspdf/;
    const openingReportRequests = requests.abertura.filter((url) => reportChunks.test(url));
    const generationNonLocal = blocked.geracao;
    const generationOther = requests.geracao.filter((url) => !reportChunks.test(url) && url !== 'blob:');

    if (openingReportRequests.length > 0) failures.push(`PDF-01: chunks do relatório na abertura: ${openingReportRequests.join(', ')}`);
    if (generationNonLocal.length > 0) failures.push(`PDF-11: host externo durante a geração: ${generationNonLocal.join(', ')}`);
    if (generated.type !== 'application/pdf') failures.push(`MIME inesperado: ${generated.type}`);
    if (download.suggestedFilename() !== generated.fileName) failures.push(`nome do download: ${download.suggestedFilename()}`);
    if (JSON.stringify(storageBefore) !== JSON.stringify(storageAfter)) failures.push('PDF-17: armazenamento do navegador mudou');
    if (urlsRightAfter.revogadas !== 0) failures.push('PDF-17: URL revogada antes do atraso de consumo');
    if (urlsAfterDelay.criadas === 0 || urlsAfterDelay.pendentes !== 0) failures.push('PDF-17: URL de objeto não revogada');

    const result = {
      platformModuleId,
      abertura: {
        requisicoesLocais: requests.abertura.length,
        chunksDoRelatorio: openingReportRequests,
        hostsExternosBloqueados: [...new Set(blocked.abertura)],
      },
      geracao: {
        chunksDoRelatorio: requests.geracao.filter((url) => reportChunks.test(url)),
        outrasRequisicoesLocais: generationOther,
        hostsExternosBloqueados: [...new Set(generationNonLocal)],
      },
      gerado: { ...generated, salvoEm: saved },
      temporariosWeb: {
        armazenamentoAntes: storageBefore,
        armazenamentoDepois: storageAfter,
        urlsLogoAposSalvar: urlsRightAfter,
        urlsApos61s: urlsAfterDelay,
      },
      falhas: failures,
    };

    fs.writeFileSync(path.join(outDir, 'browser-check.json'), `${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await browser.close();
    server.close();
  }

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`falhou: ${error.message}\n`);
  process.exit(1);
});
