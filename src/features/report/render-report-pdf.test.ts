/**
 * @jest-environment node
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TextDecoder as NodeTextDecoder } from 'node:util';

import { buildReportModel, type ReportModel, type ReportSourceReading } from '@/lib/report/report-model';
import { resolveReportPeriod, type ReportPeriodSelection } from '@/lib/report/report-period';

import { renderReportPdf, type PdfLibraries } from './render-report-pdf';

// O preset do Jest instala o TextDecoder do runtime "winter" do Expo, que só aceita UTF-8; o
// fast-png (dependência do jsPDF) cria `new TextDecoder('latin1')` ao carregar. Navegadores têm
// latin1 nativo — este teste representa a Web, então usa o TextDecoder completo do Node.
globalThis.TextDecoder = NodeTextDecoder as unknown as typeof globalThis.TextDecoder;

// As bibliotecas REAIS, injetadas por require: em produção quem carrega é `loadPdfLibraries`
// (import() dinâmico), que o Jest não executa sem --experimental-vm-modules.
// require (não import) para rodar DEPOIS da troca do TextDecoder acima — imports sobem ao topo.
const LIBRARIES: PdfLibraries = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- ver comentário acima
  jsPDF: (require('jspdf') as typeof import('jspdf')).jsPDF,
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- ver comentário acima
  autoTable: (require('jspdf-autotable') as typeof import('jspdf-autotable')).autoTable,
};

/**
 * Gera o PDF de verdade (jsPDF no ambiente node do Jest) com dados SINTÉTICOS e confere o texto
 * extraído pelo poppler (`pdftotext`). Sem poppler-utils na máquina, as conferências de texto são
 * puladas e só a estrutura é verificada. `AFERI_PDF_EVIDENCE_DIR` guarda PDFs e PNGs (`pdftoppm`)
 * para inspeção visual; por padrão vão para um diretório temporário.
 */

const TZ = 'America/Sao_Paulo';
const PREPARED_AT = new Date('2026-11-26T17:03:00.000Z');

function hasCommand(command: string): boolean {
  try {
    execFileSync(command, ['-v'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const HAS_POPPLER = hasCommand('pdftotext') && hasCommand('pdftoppm');
const describeWithPoppler = HAS_POPPLER ? describe : describe.skip;
const EVIDENCE_DIR = process.env.AFERI_PDF_EVIDENCE_DIR ?? mkdtempSync(join(tmpdir(), 'aferi-pdf-'));
mkdirSync(EVIDENCE_DIR, { recursive: true });

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

function model(
  readings: ReportSourceReading[],
  selection: ReportPeriodSelection = { kind: 'all' },
  extra: { fromCache?: boolean; omittedCount?: number } = {},
): ReportModel {
  const period = resolveReportPeriod(selection, PREPARED_AT, TZ);

  if (!period.ok) {
    throw new Error(period.error);
  }

  const result = buildReportModel(
    { readings, fromCache: extra.fromCache ?? false, omittedCount: extra.omittedCount ?? 0 },
    period.period,
  );

  if (!result.ok) {
    throw new Error('esperava modelo');
  }

  return result.model;
}

async function renderToFile(name: string, reportModel: ReportModel): Promise<{ path: string; pageCount: number; raw: string }> {
  const { bytes, pageCount } = renderReportPdf(reportModel, LIBRARIES);
  const path = join(EVIDENCE_DIR, `${name}.pdf`);
  const buffer = Buffer.from(bytes);
  writeFileSync(path, buffer);
  return { path, pageCount, raw: buffer.toString('latin1') };
}

function pdfText(path: string, page?: number): string {
  const pageArgs = page === undefined ? [] : ['-f', String(page), '-l', String(page)];
  return execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', ...pageArgs, path, '-'], { encoding: 'utf8' });
}

const NOTE = '<script>alert("x")</script> <a href="https://exemplo.invalid/?a=1&b=2">link</a> \'aspas\' \\ (parênteses) % & ç ã é ô ú 😀';

const SPEC_READINGS = () => [
  reading({ systolic: 120, diastolic: 80, pulse: 60, measuredAt: new Date('2026-11-20T11:00:00.000Z') }),
  reading({
    systolic: 130,
    diastolic: 90,
    pulse: null,
    measuredAt: new Date('2026-11-20T21:30:00.000Z'),
    note: NOTE,
  }),
  reading({
    systolic: 140,
    diastolic: 100,
    pulse: 80,
    measuredAt: new Date('2026-11-22T12:15:00.000Z'),
    sessionReadings: [
      { systolic: 145, diastolic: 102, pulse: 82 },
      { systolic: 135, diastolic: 98, pulse: null },
    ],
  }),
];

describe('renderReportPdf — estrutura (sempre)', () => {
  it('gera um PDF A4 válido, sem identificador pessoal nos metadados', async () => {
    const { raw, pageCount } = await renderToFile('estrutura', model(SPEC_READINGS(), { kind: 'last7' }));

    expect(raw.startsWith('%PDF-')).toBe(true);
    // Cabeçalho, médias e gráfico na 1ª página; tabela e notas na 2ª.
    expect(pageCount).toBe(2);
    // A4 retrato em pontos.
    expect(raw).toMatch(/\/MediaBox \[0 0 595\.2799\d* 841\.8899\d*\]/);
    expect(raw).not.toMatch(/\/Author/);
    expect(raw).toMatch(/\/Creator \(Aferi\)/);
    // Nenhum recurso remoto, ação ou script embutido a partir do conteúdo da observação.
    expect(raw).not.toMatch(/\/URI|\/JavaScript|\/JS\b|\/Launch|\/SubmitForm/);
  });
});

describeWithPoppler('renderReportPdf — conteúdo conferido com pdftotext', () => {
  it('exemplo da spec: médias, N, acentos, observação literal e ordem cronológica', async () => {
    const { path, pageCount } = await renderToFile('exemplo-spec', model(SPEC_READINGS(), { kind: 'last7' }));
    const text = pdfText(path);

    expect(text).toContain('Aferi — Relatório de pressão arterial');
    expect(text).toContain('Período solicitado: Últimos 7 dias — 20/11/2026 a 26/11/2026 (até o horário da geração)');
    expect(text).toContain('Gerado em: 26/11/2026 14:03');
    expect(text).toContain('Fuso horário: America/Sao_Paulo');
    expect(text).toContain('Registros incluídos: 3');
    expect(text).toContain('Dias com registro: 2');
    expect(text).toContain('Sistólica média: 130,0 mmHg (N = 3 registros)');
    expect(text).toContain('Diastólica média: 90,0 mmHg (N = 3 registros)');
    expect(text).toContain('Pulso médio: 70,0 bpm (N = 2 de 3 registros com pulso informado)');
    expect(text).toContain('Notas metodológicas');
    expect(text).toContain('não substitui avaliação médica');
    expect(text).toContain(`Página 1 de ${pageCount}`);
    expect(text).toContain(`Página ${pageCount} de ${pageCount}`);

    // Observação literal: tags e URL aparecem como texto; o emoji vira "?" e a troca é declarada.
    const flat = text.replace(/\s+/g, ' ');
    expect(flat).toContain('<script>alert("x")</script>');
    expect(flat).toContain('https://exemplo.invalid/?a=1&b=2');
    expect(flat).toContain('\\ (parênteses) % & ç ã é ô ú ?');
    expect(flat).toContain('1 caractere sem suporte na fonte padrão do PDF foi substituído por “?” nas observações.');
    expect(flat).toContain('Média de sessão (2 leituras): 1ª 145/102, pulso 82; 2ª 135/98, pulso —');

    // Ordem cronológica crescente na tabela.
    const firstIndex = text.search(/20\/11\/2026\s+08:00\s+120\s+80\s+60/);
    const secondIndex = text.search(/20\/11\/2026\s+18:30\s+130\s+90\s+—/);
    const thirdIndex = text.search(/22\/11\/2026\s+09:15\s+140\s+100\s+80/);
    expect(firstIndex).toBeGreaterThan(-1);
    expect(secondIndex).toBeGreaterThan(firstIndex);
    expect(thirdIndex).toBeGreaterThan(secondIndex);
  });

  it('todos sem pulso: "Não informado" e "—" na tabela', async () => {
    const { path } = await renderToFile(
      'sem-pulso',
      model([
        reading({ measuredAt: new Date('2026-11-20T12:00:00.000Z') }),
        reading({ measuredAt: new Date('2026-11-21T12:00:00.000Z') }),
      ]),
    );
    const text = pdfText(path);

    expect(text).toContain('Pulso médio: Não informado (N = 0 de 2 registros com pulso informado)');
    expect(text).not.toMatch(/Pulso médio: 0/);
    expect(text.match(/—\s*—/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('cobertura não confirmada é declarada no documento', async () => {
    const { path } = await renderToFile(
      'cobertura-parcial',
      model([reading({ measuredAt: new Date('2026-11-20T12:00:00.000Z'), hasPendingWrites: true })], { kind: 'all' }, {
        fromCache: true,
        omittedCount: 2,
      }),
    );
    const flat = pdfText(path).replace(/\s+/g, ' ');

    expect(flat).toContain('Cobertura não confirmada');
    expect(flat).toContain('armazenamento local do aparelho, sem confirmação do servidor');
    expect(flat).toContain('2 registros do período não puderam ser lidos e foram omitidos');
    expect(flat).toContain('1 registro incluído ainda está pendente de sincronização com o servidor.');
  });

  it('muitos registros: várias páginas, cabeçalho repetido, numeração e nenhuma linha perdida', async () => {
    const readings: ReportSourceReading[] = [];
    const start = new Date('2025-01-01T11:00:00.000Z').getTime();

    for (let index = 0; index < 400; index += 1) {
      readings.push(
        reading({
          systolic: 100 + (index % 80),
          diastolic: 60 + (index % 30),
          pulse: index % 3 === 0 ? null : 60 + (index % 40),
          measuredAt: new Date(start + index * 8 * 60 * 60 * 1000),
          note: index % 25 === 0 ? `Observação longa ${index}: ${'medição após caminhada, sem café, braço esquerdo. '.repeat(5)}` : null,
        }),
      );
    }

    const { path, pageCount } = await renderToFile('muitos-registros', model(readings));

    expect(pageCount).toBeGreaterThan(5);

    let rowCount = 0;

    for (let page = 1; page <= pageCount; page += 1) {
      const pageText = pdfText(path, page);
      expect(pageText).toContain(`Página ${page} de ${pageCount}`);

      // Cabeçalho da tabela repetido em toda página que tem linhas da tabela.
      const rowsOnPage = pageText.match(/^\s*\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s+\d+\s+\d+\s+(\d+|—)/gm) ?? [];
      if (rowsOnPage.length > 0) {
        expect(pageText).toMatch(/Data\s+Hora\s+Sistólica/);
      }
      rowCount += rowsOnPage.length;
    }

    expect(rowCount).toBe(400);

    // Primeira e última página em PNG para inspeção visual.
    for (const page of [1, pageCount]) {
      execFileSync('pdftoppm', ['-png', '-r', '80', '-f', String(page), '-l', String(page), path, join(EVIDENCE_DIR, `muitos-registros-p${page}`)]);
    }
    execFileSync('pdftoppm', ['-png', '-r', '80', '-f', '1', '-l', '1', join(EVIDENCE_DIR, 'exemplo-spec.pdf'), join(EVIDENCE_DIR, 'exemplo-spec-p1')]);
  });
});

describeWithPoppler('renderReportPdf — gráfico de tendência e continuidade (P2)', () => {
  function rasterize(path: string, page: number, name: string): void {
    execFileSync('pdftoppm', ['-png', '-r', '90', '-f', String(page), '-l', String(page), path, join(EVIDENCE_DIR, name)]);
    execFileSync('pdftoppm', ['-png', '-gray', '-r', '90', '-f', String(page), '-l', String(page), path, join(EVIDENCE_DIR, `${name}-cinza`)]);
  }

  it('gráfico com legenda, escala em mmHg, datas reais e lacunas, antes da tabela', async () => {
    const readings = [
      reading({ systolic: 128, diastolic: 84, measuredAt: new Date('2026-11-20T11:00:00.000Z') }),
      reading({ systolic: 132, diastolic: 86, measuredAt: new Date('2026-11-20T22:00:00.000Z') }),
      reading({ systolic: 125, diastolic: 82, measuredAt: new Date('2026-11-21T12:00:00.000Z') }),
      // 22 e 23/11 sem medição
      reading({ systolic: 141, diastolic: 92, measuredAt: new Date('2026-11-24T12:00:00.000Z') }),
      reading({ systolic: 138, diastolic: 90, measuredAt: new Date('2026-11-25T12:00:00.000Z') }),
    ];
    const { path } = await renderToFile('grafico-7-dias', model(readings, { kind: 'last7' }));
    const flat = pdfText(path).replace(/\s+/g, ' ');

    expect(flat).toContain('Tendência (médias diárias)');
    expect(flat).toContain('Sistólica (média diária)');
    expect(flat).toContain('Diastólica (média diária)');
    expect(flat).toContain('mmHg');
    expect(flat).toContain('20/11/2026 a 26/11/2026');
    expect(flat).toMatch(/20\/11 .*26\/11/);
    expect(flat).toContain('não equivalem a pressão zero');
    // Ordem do documento: médias → gráfico → tabela → notas.
    expect(flat.indexOf('Médias do intervalo')).toBeLessThan(flat.indexOf('Tendência (médias diárias)'));
    const tableStart = flat.search(/Registros Data Hora/);
    expect(tableStart).toBeGreaterThan(-1);
    expect(flat.indexOf('Tendência (médias diárias)')).toBeLessThan(tableStart);
    expect(tableStart).toBeLessThan(flat.indexOf('Notas metodológicas'));
    // Médias diárias não aparecem como texto (nada arredondado é reprocessado no gráfico).
    expect(flat).not.toContain('130,0');

    rasterize(path, 1, 'grafico-7-dias-p1');
  });

  it('um único dia: explicação e nenhum texto de tendência fabricada', async () => {
    const { path } = await renderToFile(
      'grafico-um-dia',
      model([
        reading({ systolic: 120, diastolic: 80, measuredAt: new Date('2026-11-20T11:00:00.000Z') }),
        reading({ systolic: 130, diastolic: 90, measuredAt: new Date('2026-11-20T20:00:00.000Z') }),
      ]),
    );

    expect(pdfText(path).replace(/\s+/g, ' ')).toContain(
      'Há medições em apenas um dia: o gráfico mostra os pontos desse dia, sem linha de tendência.',
    );
    rasterize(path, 1, 'grafico-um-dia-p1');
  });

  it('período extenso: painéis com legenda única e nenhum registro perdido na tabela', async () => {
    const readings: ReportSourceReading[] = [];
    const start = new Date('2025-01-01T11:00:00.000Z').getTime();

    for (let day = 0; day < 400; day += 1) {
      if (day % 9 === 4) continue;
      readings.push(
        reading({ systolic: 115 + (day % 35), diastolic: 72 + (day % 18), measuredAt: new Date(start + day * 86_400_000) }),
      );
    }

    const { path, pageCount } = await renderToFile('grafico-extenso', model(readings));
    const flat = pdfText(path).replace(/\s+/g, ' ');

    expect(flat).toMatch(/Painel 1 de \d+: 01\/01\/2025 a /);
    expect((flat.match(/Painel \d+ de \d+/g) ?? []).length).toBeGreaterThan(1);

    let rows = 0;
    for (let page = 1; page <= pageCount; page += 1) {
      rows += (pdfText(path, page).match(/^\s*\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s+\d+\s+\d+\s+(\d+|—)/gm) ?? []).length;
    }
    expect(rows).toBe(readings.length);

    rasterize(path, 1, 'grafico-extenso-p1');
    rasterize(path, 2, 'grafico-extenso-p2');
  });

  it('observação muito longa: quebra de linha, marcas de continuidade e nenhum trecho perdido', async () => {
    const note = Array.from({ length: 60 }, (_, index) => `L${String(index + 1).padStart(2, '0')}`).join('\n');
    const readings = [
      reading({ systolic: 121, diastolic: 79, measuredAt: new Date('2026-11-20T11:00:00.000Z') }),
      reading({ systolic: 133, diastolic: 88, measuredAt: new Date('2026-11-20T21:00:00.000Z'), note }),
      reading({ systolic: 127, diastolic: 83, measuredAt: new Date('2026-11-21T12:00:00.000Z') }),
    ];
    const { path, pageCount } = await renderToFile('observacao-longa', model(readings));
    const text = pdfText(path);

    for (let index = 1; index <= 60; index += 1) {
      expect(text).toContain(`L${String(index).padStart(2, '0')}`);
    }
    expect(text).toContain('(continua)');
    expect(text).toContain('(continuação)');
    // Ordem preservada: L01 antes de L60 e o registro seguinte depois da observação inteira.
    expect(text.indexOf('L01')).toBeLessThan(text.indexOf('L60'));
    expect(text.indexOf('L60')).toBeLessThan(text.search(/21\/11\/2026\s+09:00\s+127/));
    // A continuação repete data e hora do registro, sem repetir valores.
    expect((text.match(/20\/11\/2026\s+18:00/g) ?? []).length).toBeGreaterThan(1);
    expect((text.match(/20\/11\/2026\s+18:00\s+133/g) ?? []).length).toBe(1);

    rasterize(path, pageCount > 1 ? 2 : 1, 'observacao-longa-p2');
  });
});
