/**
 * @jest-environment node
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildReportModel, type ReportModel, type ReportSourceReading } from '@/lib/report/report-model';
import { resolveReportPeriod, type ReportPeriodSelection } from '@/lib/report/report-period';

import { A4_HEIGHT_PT, A4_WIDTH_PT, buildReportHtml } from './report-html';

/**
 * APROXIMAÇÃO — NÃO equivale ao motor do Android. Renderiza o HTML do template no Chromium do
 * Playwright (`page.pdf`) e confere o PDF com o poppler. O `expo-print` usa o WebView do sistema
 * (`createPrintDocumentAdapter`), cuja versão, fontes e suporte a `@page` dependem do aparelho:
 * este teste só pega erros de template (conteúdo, escape, quebras grosseiras, rede), não valida o
 * Android. Ver docs/pdf-android.md.
 *
 * Opt-in: só roda com `AFERI_ANDROID_HTML_EVIDENCE_DIR` definido (PDFs e PNGs ficam lá). Exige
 * Playwright com Chromium e poppler-utils; nenhum dos dois é dependência do projeto.
 */

const EVIDENCE_DIR = process.env.AFERI_ANDROID_HTML_EVIDENCE_DIR;
const TZ = 'America/Sao_Paulo';
const PREPARED_AT = new Date('2026-11-26T17:03:00.000Z');

interface PlaywrightPage {
  route: (pattern: string, handler: (route: { request: () => { url: () => string }; abort: () => Promise<void> }) => void) => Promise<void>;
  setContent: (html: string, options: { waitUntil: 'load' }) => Promise<void>;
  pdf: (options: { path: string; format: 'A4'; preferCSSPageSize: boolean; printBackground: boolean }) => Promise<unknown>;
}

interface PlaywrightBrowser {
  newPage: () => Promise<PlaywrightPage>;
  close: () => Promise<void>;
}

function loadChromium(): { launch: () => Promise<PlaywrightBrowser> } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- ferramenta do ambiente, fora das dependências do projeto
  return (require('playwright') as { chromium: { launch: () => Promise<PlaywrightBrowser> } }).chromium;
}

const describeOptIn = EVIDENCE_DIR ? describe : describe.skip;

let nextId = 0;

function reading(overrides: Partial<ReportSourceReading> & Pick<ReportSourceReading, 'measuredAt'>): ReportSourceReading {
  nextId += 1;
  return {
    id: `synthetic-${String(nextId).padStart(4, '0')}`,
    systolic: 120,
    diastolic: 80,
    pulse: null,
    createdAt: overrides.measuredAt,
    note: null,
    source: 'manual',
    sessionReadings: null,
    hasPendingWrites: false,
    ...overrides,
  };
}

function model(readings: ReportSourceReading[], selection: ReportPeriodSelection = { kind: 'all' }): ReportModel {
  const period = resolveReportPeriod(selection, PREPARED_AT, TZ);

  if (!period.ok) {
    throw new Error(period.error);
  }

  const result = buildReportModel({ readings, fromCache: false, omittedCount: 0 }, period.period);

  if (!result.ok) {
    throw new Error('esperava modelo');
  }

  return result.model;
}

/** 400 registros sintéticos em ~133 dias, com observação longa, hostil e com acentos. */
function largeModel(): ReportModel {
  const start = Date.parse('2026-07-16T10:00:00.000Z');
  const readings = Array.from({ length: 400 }, (_, index) =>
    reading({
      measuredAt: new Date(start + Math.floor(index / 3) * 86_400_000 + (index % 3) * 4 * 3_600_000),
      systolic: 110 + (index % 35),
      diastolic: 70 + (index % 25),
      pulse: index % 4 === 0 ? null : 60 + (index % 30),
      note:
        index === 5
          ? `Observação longa: ${Array.from({ length: 140 }, (_, word) => `palavra${word + 1}`).join(' ')} FIM-DA-OBSERVAÇÃO`
          : index === 7
            ? '<img src="https://rastreador.invalido/p.png"> "aspas" & <b>negrito</b>'
            : index === 9
              ? 'Ação, coração, pressão, açúcar — “ok”'
              : null,
    }),
  );
  return model(readings, { kind: 'custom', startDay: { year: 2026, month: 7, day: 16 }, endDay: { year: 2026, month: 11, day: 26 } });
}

function pdftotext(path: string): string {
  return execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' });
}

describeOptIn('APROXIMAÇÃO em Chromium (não é o WebView do Android)', () => {
  const directory = EVIDENCE_DIR ?? '';
  let browser: PlaywrightBrowser;
  const requests: string[] = [];

  beforeAll(async () => {
    mkdirSync(directory, { recursive: true });
    browser = await loadChromium().launch();
  });

  afterAll(async () => {
    await browser?.close();
  });

  async function renderToPdf(name: string, reportModel: ReportModel): Promise<string> {
    const html = buildReportHtml(reportModel);
    const page = await browser.newPage();
    await page.route('**/*', (route) => {
      requests.push(route.request().url());
      void route.abort();
    });
    await page.setContent(html, { waitUntil: 'load' });
    const path = join(directory, `${name}.pdf`);
    writeFileSync(join(directory, `${name}.html`), html);
    await page.pdf({ path, format: 'A4', preferCSSPageSize: true, printBackground: true });
    execFileSync('pdftoppm', ['-png', '-r', '60', path, join(directory, `${name}-cor`)]);
    execFileSync('pdftoppm', ['-png', '-gray', '-r', '60', path, join(directory, `${name}-cinza`)]);
    return path;
  }

  it('exemplo da spec: médias, N, pulso e paginação no PDF', async () => {
    const path = await renderToPdf(
      'android-aprox-exemplo-spec',
      model([
        reading({ measuredAt: new Date('2026-11-20T11:00:00.000Z'), systolic: 120, diastolic: 80, pulse: 60 }),
        reading({ measuredAt: new Date('2026-11-20T20:00:00.000Z'), systolic: 130, diastolic: 90, pulse: null }),
        reading({ measuredAt: new Date('2026-11-22T12:00:00.000Z'), systolic: 140, diastolic: 100, pulse: 80 }),
      ]),
    );
    const text = pdftotext(path);

    expect(text).toContain('130,0 mmHg (N = 3 registros)');
    expect(text).toContain('90,0 mmHg (N = 3 registros)');
    expect(text).toContain('70,0 bpm (N = 2 de 3 registros com pulso informado)');
    expect(text).toMatch(/Página 1 de \d/);
    expect(text).toContain('Aferi — gerado em 26/11/2026 14:03 (America/Sao_Paulo)');
  });

  it('400 registros: A4, cabeçalho repetido, todas as linhas, observação longa contínua, acentos e escape', async () => {
    const path = await renderToPdf('android-aprox-400', largeModel());
    const info = execFileSync('pdfinfo', [path], { encoding: 'utf8' });
    const pages = Number(info.match(/Pages:\s+(\d+)/)?.[1]);
    const size = info.match(/Page size:\s+([\d.]+) x ([\d.]+) pts/);
    const text = pdftotext(path);
    const perPage = text.split('\f').filter((page) => page.trim() !== '');

    expect(Math.round(Number(size?.[1]))).toBe(A4_WIDTH_PT);
    expect(Math.round(Number(size?.[2]))).toBe(A4_HEIGHT_PT);
    expect(pages).toBeGreaterThan(5);
    expect(text).toContain(`Página ${pages} de ${pages}`);
    // Cabeçalho da tabela em toda página que tem linhas da tabela.
    perPage
      .filter((page) => /\d{2}\/\d{2}\/2026\s+\d{2}:\d{2}\s+\d{3}/.test(page))
      .forEach((page) => expect(page).toMatch(/Data\s+Hora\s+Sistólica\s+Diastólica\s+Pulso/));
    // Toda linha de registro aparece (data + hora + sistólica), sem perder nenhuma.
    expect(text.match(/\d{2}\/\d{2}\/2026\s+\d{2}:\d{2}\s+1[1-4]\d\s+[7-9]\d\s/g)?.length).toBe(400);
    expect(text).toContain('(continua)');
    expect(text).toContain('(continuação)');
    // Texto corrido (as observações quebram linha dentro da célula).
    const flat = text.replace(/\s+/g, ' ');
    expect(flat).toContain('FIM-DA-OBSERVAÇÃO');
    expect(flat).toContain('Ação, coração, pressão, açúcar — “ok”');
    expect(flat).toMatch(/<img src="https:\/\/rastreador\.invalido\/p\.png"> "aspas" & <b>negrito<\/b>/);
  });

  it('nenhuma requisição de rede foi feita durante as renderizações', () => {
    expect(requests).toEqual([]);
  });
});
