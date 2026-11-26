/**
 * Verificação de acessibilidade da INTERFACE do relatório PDF (PDF-21), em Chromium local
 * (Playwright), com o componente REAL do bundle Web exportado — sem login, sem Firebase real e
 * com toda a rede externa bloqueada.
 *
 * Uso: node tools/pdf-relatorio/a11y-check.cjs <dist> [<pasta-de-saida>]
 * Requer Playwright + Chromium no ambiente (NÃO é dependência do projeto).
 *
 * Como monta o diálogo sem login: localiza no `entry` os módulos do `ExportPdfDialog`, do React e
 * do `react-dom/client` (por assinaturas do código minificado) e renderiza o diálogo numa raiz
 * própria, com callbacks que só registram eventos. Os dados da revisão são sintéticos.
 *
 * O que verifica (falha com código 1):
 *   - nomes acessíveis e papéis (radiogroup/radio com aria-checked, botões, alerta de cobertura);
 *   - ordem de foco por Tab/Shift+Tab sem sair do modal e operação por teclado (Enter nos rádios,
 *     Enter/Espaço nos botões, Esc fecha). Espaço NÃO marca rádio no react-native-web 0.21 (o
 *     PressResponder só trata Espaço em papel button/menuitem): registrado como limitação;
 *   - alvos de toque ≥ 48 × 48 px;
 *   - zoom de 200 % numa janela de 320 px CSS: sem sobreposição de textos nem rolagem horizontal.
 * NÃO mede contraste, leitor de tela real nem PDF marcado: isso não é declaração de AA completa.
 */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const [distArg, outArg] = process.argv.slice(2);

if (!distArg) {
  process.stderr.write('uso: node tools/pdf-relatorio/a11y-check.cjs <dist> [<saida>]\n');
  process.exit(2);
}

const distDir = path.resolve(distArg);
const outDir = path.resolve(outArg ?? path.join(distDir, '..', 'pdf-a11y-check'));
fs.mkdirSync(outDir, { recursive: true });

function findModuleIds() {
  const webDir = path.join(distDir, '_expo/static/js/web');
  const entry = fs.readdirSync(webDir).find((name) => name.startsWith('entry-'));
  const source = fs.readFileSync(path.join(webDir, entry), 'utf8');
  const modules = new Map();

  for (const chunk of source.split('__d(').slice(1)) {
    const ends = [...chunk.matchAll(/\},(\d+),(\[|\{)/g)];
    if (ends.length > 0) modules.set(Number(ends[ends.length - 1][1]), chunk);
  }

  const pick = (label, predicate) => {
    const ids = [...modules].filter(([, chunk]) => predicate(chunk)).map(([id]) => id);
    if (ids.length !== 1) throw new Error(`módulo ${label}: ${ids.length} candidatos (${ids.join(', ')})`);
    return ids[0];
  };

  return {
    dialog: pick('ExportPdfDialog', (chunk) => /\.ExportPdfDialog=/.test(chunk)),
    react: pick('react', (chunk) => chunk.includes('react.transitional.element') && chunk.includes('.useState=function')),
    reactDomClient: pick('react-dom/client', (chunk) => chunk.includes('.createRoot=function') && chunk.includes('hydrateRoot')),
  };
}

function serve() {
  const server = http.createServer((request, response) => {
    let file = path.join(distDir, decodeURIComponent(new URL(request.url, 'http://local').pathname));
    if (!file.startsWith(distDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(distDir, 'index.html');
    const type = file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html';
    response.writeHead(200, { 'content-type': type });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const PARTIAL_REVIEW = {
  fileName: 'aferi-relatorio-2026-10-28_a_2026-11-26.pdf',
  previewUrl: 'blob:previa-sintetica',
  requestedPeriod: 'Últimos 30 dias — 28/10/2026 a 26/11/2026 (até o horário da geração)',
  coverageLines: ['Registros incluídos: 3', 'Dias com registro: 2'],
  averages: [
    { label: 'Sistólica média', value: '130,0 mmHg', denominator: 'N = 3 registros' },
    { label: 'Diastólica média', value: '90,0 mmHg', denominator: 'N = 3 registros' },
    { label: 'Pulso médio', value: '70,0 bpm', denominator: 'N = 2 de 3 registros com pulso informado' },
  ],
  isCoverageConfirmed: false,
  coverageStatement: 'Cobertura não confirmada: este relatório pode não conter todo o histórico do período (ver avisos).',
  warnings: ['Dados lidos do armazenamento local do aparelho, sem confirmação do servidor: o relatório pode não incluir todas as medições do período.'],
};

async function mountDialog(page, ids) {
  await page.evaluate((moduleIds) => {
    const React = globalThis.__r(moduleIds.react);
    const { createRoot } = globalThis.__r(moduleIds.reactDomClient);
    const { ExportPdfDialog } = globalThis.__r(moduleIds.dialog);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const events = [];
    globalThis.__a11y = {
      events,
      render: (props) =>
        root.render(
          React.createElement(ExportPdfDialog, {
            visible: true,
            stage: 'idle',
            review: null,
            error: null,
            onPrepare: (request) => events.push(`prepare:${request.kind}`),
            onSave: () => events.push('save'),
            onRetry: () => events.push('retry'),
            onChangePeriod: () => events.push('changePeriod'),
            onCancel: () => events.push('cancel'),
            ...props,
          }),
        ),
    };
    globalThis.__a11y.render({});
  }, ids);
  await page.getByText('Período do relatório').waitFor();
}

async function render(page, props) {
  await page.evaluate((nextProps) => globalThis.__a11y.render(nextProps), props);
}

async function events(page) {
  return page.evaluate(() => globalThis.__a11y.events.splice(0));
}

/** Descreve o elemento focado: papel + nome acessível (aria-label ou texto). */
async function focused(page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body) return '(corpo)';
    const role = element.getAttribute('role') ?? element.tagName.toLowerCase();
    const name = (element.getAttribute('aria-label') ?? element.textContent ?? '').trim().replace(/\s+/g, ' ');
    return `${role}: ${name.slice(0, 60)}`;
  });
}

/** Espera o Modal terminar de abrir: o foco inicial vai para dentro dele (focus trap do RNW). */
async function waitForFocusInsideDialog(page) {
  await page.waitForFunction(() => document.querySelector('[aria-modal="true"]')?.contains(document.activeElement) === true);
}

/** Percorre `steps` vezes com Tab (ou Shift+Tab) a partir do foco atual; marca o que sai do modal. */
async function tabOrder(page, steps, key = 'Tab') {
  const order = [await focused(page)];
  let leftDialog = false;
  for (let index = 0; index < steps; index += 1) {
    await page.keyboard.press(key);
    order.push(await focused(page));
    leftDialog ||= await page.evaluate(() => !document.querySelector('[aria-modal="true"]').contains(document.activeElement));
  }
  return { order, leftDialog };
}

async function targetSizes(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[aria-modal="true"]') ?? document.body;
    return [...dialog.querySelectorAll('[role="button"],[role="radio"],a[href],button')]
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const box = element.getBoundingClientRect();
        const name = (element.getAttribute('aria-label') ?? element.textContent ?? '').trim().slice(0, 40);
        return { name, width: Math.round(box.width), height: Math.round(box.height) };
      });
  });
}

/** Sobreposição entre folhas de texto e rolagem horizontal dentro do diálogo. */
async function layoutProblems(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[aria-modal="true"]');
    const leaves = [...dialog.querySelectorAll('*')].filter(
      (element) => element.children.length === 0 && element.textContent.trim() !== '' && element.getClientRects().length > 0,
    );
    const boxes = leaves.map((element) => ({ text: element.textContent.trim().slice(0, 30), box: element.getBoundingClientRect() }));
    const overlaps = [];

    for (let a = 0; a < boxes.length; a += 1) {
      for (let b = a + 1; b < boxes.length; b += 1) {
        const first = boxes[a].box;
        const second = boxes[b].box;
        const width = Math.min(first.right, second.right) - Math.max(first.left, second.left);
        const height = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
        if (width > 1 && height > 1) overlaps.push(`${boxes[a].text} × ${boxes[b].text}`);
      }
    }

    const clipped = leaves
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .map((element) => element.textContent.trim().slice(0, 30));
    const scroller = document.scrollingElement;

    return {
      textos: boxes.length,
      sobreposicoes: overlaps,
      textosCortados: clipped,
      rolagemHorizontalDaPagina: scroller.scrollWidth > scroller.clientWidth + 1,
    };
  });
}

async function main() {
  const ids = findModuleIds();
  const server = await serve();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const failures = [];
  const result = { modulos: ids };

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'pt-BR' });
    await context.route('**/*', (route) => (route.request().url().startsWith(origin) ? route.continue() : route.abort()));
    const page = await context.newPage();
    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
    await mountDialog(page, ids);

    // 1. Escolha do período: papéis, nomes, ordem de foco e teclado.
    const dialog = page.locator('[aria-modal="true"]');
    await waitForFocusInsideDialog(page);
    result.selecaoArvoreAcessivel = await dialog.ariaSnapshot();
    result.selecaoOrdemDeFoco = await tabOrder(page, 6);
    result.selecaoOrdemReversa = await tabOrder(page, 6, 'Shift+Tab');

    const expectedSelection = [
      'radio: Últimos 7 dias',
      'radio: Últimos 30 dias',
      'radio: Tudo',
      'radio: Personalizado',
      'button: Preparar relatório',
      'button: Cancelar',
      'radio: Últimos 7 dias',
    ];
    if (JSON.stringify(result.selecaoOrdemDeFoco.order) !== JSON.stringify(expectedSelection)) {
      failures.push(`ordem de foco da seleção: ${result.selecaoOrdemDeFoco.order.join(' → ')}`);
    }
    if (result.selecaoOrdemDeFoco.leftDialog || result.selecaoOrdemReversa.leftDialog) failures.push('foco saiu do diálogo');

    const radios = page.getByRole('radio');
    const radioNames = await radios.evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-label')));
    if (JSON.stringify(radioNames) !== JSON.stringify(['Últimos 7 dias', 'Últimos 30 dias', 'Tudo', 'Personalizado'])) {
      failures.push(`rádios: ${radioNames.join(', ')}`);
    }
    if ((await page.getByRole('radiogroup').count()) !== 1) failures.push('radiogroup ausente');

    await page.getByRole('radio', { name: 'Últimos 7 dias' }).focus();
    await page.keyboard.press('Space');
    const spaceChecks = await page.getByRole('radio', { name: 'Últimos 7 dias' }).getAttribute('aria-checked');
    await page.keyboard.press('Enter');
    const sevenChecked = await page.getByRole('radio', { name: 'Últimos 7 dias' }).getAttribute('aria-checked');
    await page.getByRole('radio', { name: 'Tudo' }).focus();
    await page.keyboard.press('Enter');
    const allChecked = await page.getByRole('radio', { name: 'Tudo' }).getAttribute('aria-checked');
    const sevenAfter = await page.getByRole('radio', { name: 'Últimos 7 dias' }).getAttribute('aria-checked');
    await page.getByRole('button', { name: 'Preparar relatório' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Cancelar' }).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('Escape');
    result.selecaoTeclado = {
      espacoMarcaRadio_limitacaoConhecida: spaceChecks,
      enterMarca7Dias: sevenChecked,
      enterMarcaTudo: allChecked,
      seteDesmarcadoDepois: sevenAfter,
      eventos: await events(page),
    };

    // aria-checked precisa existir (o RNW ignora accessibilityState) e Enter precisa marcar.
    if (sevenChecked !== 'true' || allChecked !== 'true' || sevenAfter !== 'false') failures.push('rádio não opera por Enter ou não expõe aria-checked');
    if (!result.selecaoTeclado.eventos.includes('prepare:all')) failures.push('Enter em "Preparar relatório" não aciona');
    if (!result.selecaoTeclado.eventos.includes('cancel')) failures.push('Espaço em "Cancelar" não aciona');

    result.selecaoAlvos = await targetSizes(page);
    await page.screenshot({ path: path.join(outDir, 'selecao-100.png') });

    // Durante a preparação: "Preparar" indisponível e anunciado como tal; "Cancelar" continua ativo.
    await render(page, { stage: 'preparing' });
    await page.getByText('Preparando o relatório…').waitFor();
    result.preparando = {
      prepararAriaDisabled: await page.getByRole('button', { name: /Preparar relatório/ }).getAttribute('aria-disabled'),
      cancelarAriaDisabled: await page.getByRole('button', { name: 'Cancelar' }).getAttribute('aria-disabled'),
    };
    if (result.preparando.prepararAriaDisabled !== 'true') failures.push('"Preparar" desabilitado sem aria-disabled');
    if (result.preparando.cancelarAriaDisabled === 'true') failures.push('"Cancelar" desabilitado durante a preparação');

    // 2. Revisão com cobertura não confirmada (aviso ANTES de salvar).
    await render(page, { stage: 'review', review: PARTIAL_REVIEW });
    await page.getByText('Revisar relatório').waitFor();
    result.revisaoArvoreAcessivel = await dialog.ariaSnapshot();
    await page.getByRole('button', { name: 'Salvar recorte parcial em PDF' }).focus();
    result.revisaoOrdemDeFoco = await tabOrder(page, 4);

    const expectedReview = [
      'button: Salvar recorte parcial em PDF',
      'button: Tentar novamente',
      'button: Alterar período',
      'button: Cancelar',
      'button: Salvar recorte parcial em PDF',
    ];
    if (JSON.stringify(result.revisaoOrdemDeFoco.order) !== JSON.stringify(expectedReview)) {
      failures.push(`ordem de foco da revisão: ${result.revisaoOrdemDeFoco.order.join(' → ')}`);
    }
    if (result.revisaoOrdemDeFoco.leftDialog) failures.push('foco saiu do diálogo na revisão');

    const alert = page.getByRole('alert');
    if ((await alert.count()) !== 1) failures.push('aviso de cobertura sem role="alert"');
    else if (!(await alert.textContent()).includes('Cobertura não confirmada')) failures.push('alerta sem o texto do aviso');

    for (const [name, event] of [
      ['Salvar recorte parcial em PDF', 'save'],
      ['Tentar novamente', 'retry'],
      ['Alterar período', 'changePeriod'],
    ]) {
      await page.getByRole('button', { name }).focus();
      await page.keyboard.press('Enter');
      const fired = await events(page);
      if (!fired.includes(event)) failures.push(`Enter em "${name}" não aciona ${event}`);
    }

    result.revisaoAlvos = await targetSizes(page);
    await page.screenshot({ path: path.join(outDir, 'revisao-100.png'), fullPage: true });

    for (const target of [...result.selecaoAlvos, ...result.revisaoAlvos]) {
      if (target.width < 48 || target.height < 48) failures.push(`alvo < 48 px: ${target.name} (${target.width}×${target.height})`);
    }

    // 3. Zoom de 200 % numa janela de 640 px = 320 px CSS (reflow): sem sobreposição nem corte.
    await page.setViewportSize({ width: 640, height: 900 });
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2';
    });
    result.zoom200Revisao = await layoutProblems(page);
    await page.screenshot({ path: path.join(outDir, 'revisao-zoom200.png'), fullPage: true });
    await render(page, { stage: 'idle', review: null });
    await page.getByText('Período do relatório').waitFor();
    result.zoom200Selecao = await layoutProblems(page);
    await page.screenshot({ path: path.join(outDir, 'selecao-zoom200.png'), fullPage: true });

    for (const [label, problems] of [
      ['seleção', result.zoom200Selecao],
      ['revisão', result.zoom200Revisao],
    ]) {
      if (problems.sobreposicoes.length > 0) failures.push(`zoom 200 % (${label}): sobreposição ${problems.sobreposicoes.join('; ')}`);
      if (problems.textosCortados.length > 0) failures.push(`zoom 200 % (${label}): texto cortado ${problems.textosCortados.join('; ')}`);
      if (problems.rolagemHorizontalDaPagina) failures.push(`zoom 200 % (${label}): rolagem horizontal`);
    }
  } finally {
    await browser.close();
    server.close();
  }

  result.falhas = failures;
  fs.writeFileSync(path.join(outDir, 'a11y-check.json'), `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`falhou: ${error.message}\n`);
  process.exit(1);
});
