import type { ChartPanel, ReportChart } from '@/lib/report/report-chart';
import { toWinAnsiText } from '@/lib/report/report-format';
import type { ReportModel, ReportTableRow } from '@/lib/report/report-model';
import { splitDetailLines } from '@/lib/report/report-table';

/**
 * Renderizador Web do relatório (spec-relatorio-pdf §7.1/§7.2): jsPDF + jspdf-autotable, desenho
 * vetorial e texto selecionável — nada de rasterizar HTML. Só desenha o `ReportModel`; nenhum
 * cálculo clínico aqui.
 *
 * As duas bibliotecas entram por `import()` em `loadPdfLibraries`: nada é carregado nem
 * inicializado antes de o usuário pedir o relatório (PDF-01). Este módulo só é alcançável pelo
 * adaptador `.web.ts` — o bundle Android nunca o vê.
 *
 * Fonte: a Helvetica padrão do PDF (WinAnsiEncoding) cobre todos os acentos do pt-BR e a
 * pontuação usada aqui (—, “ ”, …). O que ela não desenha (emoji, setas, CJK) numa observação vira
 * "?" e o documento declara quantos caracteres foram trocados — ver `toWinAnsiText`.
 */

export interface PdfLibraries {
  jsPDF: typeof import('jspdf').jsPDF;
  autoTable: typeof import('jspdf-autotable').autoTable;
}

/**
 * Único ponto que carrega jsPDF/AutoTable: `import()` dinâmico, chamado só quando o usuário pede o
 * relatório. Separado de `renderReportPdf` para que o teste injete as bibliotecas reais via
 * `require` (o Jest não executa `import()` nativo sem `--experimental-vm-modules`).
 */
export async function loadPdfLibraries(): Promise<PdfLibraries> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  return { jsPDF, autoTable };
}

export interface RenderedReportPdf {
  bytes: ArrayBuffer;
  pageCount: number;
}

const MARGIN_MM = 15;
const FOOTER_HEIGHT_MM = 10;
const PT_TO_MM = 25.4 / 72;
const LINE_HEIGHT_FACTOR = 1.25;

const TITLE_PT = 16;
const SECTION_PT = 13;
const BODY_PT = 11;
const TABLE_PT = 10;
const FOOTER_PT = 9;
const CHART_CAPTION_PT = 10;
const CHART_TICK_PT = 9;

/** Larguras fixas da tabela (somam a largura útil de 180 mm): o fatiamento dos detalhes depende delas. */
const COLUMN_WIDTHS_MM = [23, 14, 24, 24, 18, 77] as const;
const CELL_PADDING_MM = 1.6;
/** Um bloco de detalhe com até 12 linhas cabe folgado numa página; acima disso vira continuação. */
const DETAIL_MAX_LINES = 12;

const PANEL_HEIGHT_MM = 67;
const PLOT_HEIGHT_MM = 44;
const Y_LABEL_WIDTH_MM = 12;

/** Cores das séries + traço/marcador distintos: a distinção sobrevive à impressão em cinza. */
const SYSTOLIC_RGB: [number, number, number] = [29, 78, 216];
const DIASTOLIC_RGB: [number, number, number] = [180, 83, 9];
const GRID_RGB: [number, number, number] = [203, 213, 225];
const DIASTOLIC_DASH = [1.6, 1.1];

/** Texto quase preto e bordas médias: legível em impressão em escala de cinza (PDF-10). */
const TEXT_RGB: [number, number, number] = [15, 23, 42];
const MUTED_RGB: [number, number, number] = [51, 65, 85];
const BORDER_RGB: [number, number, number] = [100, 116, 139];
const HEAD_FILL_RGB: [number, number, number] = [226, 232, 240];

interface SanitizedReport {
  model: ReportModel;
  replacedCount: number;
}

/** Aplica `toWinAnsiText` em todo texto do modelo e soma as trocas. */
function sanitizeForStandardFont(model: ReportModel): SanitizedReport {
  let replacedCount = 0;

  function safe(value: string): string {
    const result = toWinAnsiText(value);
    replacedCount += result.replacedCount;
    return result.text;
  }

  const sanitized: ReportModel = {
    ...model,
    header: {
      title: safe(model.header.title),
      requestedPeriod: safe(model.header.requestedPeriod),
      generatedAt: safe(model.header.generatedAt),
      timeZone: safe(model.header.timeZone),
    },
    coverage: { ...model.coverage, lines: model.coverage.lines.map(safe), statement: safe(model.coverage.statement) },
    averages: model.averages.map((line) => ({
      label: safe(line.label),
      value: safe(line.value),
      denominator: safe(line.denominator),
    })),
    warnings: model.warnings.map(safe),
    table: {
      columns: model.table.columns.map(safe),
      rows: model.table.rows.map((row) => row.map(safe) as ReportTableRow),
    },
    notes: model.notes.map(safe),
  };

  return { model: sanitized, replacedCount };
}

export function renderReportPdf(source: ReportModel, { jsPDF, autoTable }: PdfLibraries): RenderedReportPdf {
  const { model, replacedCount } = sanitizeForStandardFont(source);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });

  // Metadados sem identificador pessoal: nada de autor, e-mail, nome ou UID (spec §3.1.4).
  doc.setProperties({
    title: model.header.title,
    subject: 'Medições de pressão arterial registradas no Aferi',
    creator: 'Aferi',
  });
  doc.setLanguage('pt-BR');
  doc.setTextColor(...TEXT_RGB);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - 2 * MARGIN_MM;
  const bottomLimit = pageHeight - MARGIN_MM - FOOTER_HEIGHT_MM;
  let y = MARGIN_MM;

  function lineHeight(sizePt: number): number {
    return sizePt * PT_TO_MM * LINE_HEIGHT_FACTOR;
  }

  function write(text: string, sizePt: number, style: 'normal' | 'bold' = 'normal', gapAfterMm = 0): void {
    doc.setFont('helvetica', style);
    doc.setFontSize(sizePt);
    const lines = doc.splitTextToSize(text, contentWidth) as string[];

    for (const line of lines) {
      if (y + lineHeight(sizePt) > bottomLimit) {
        doc.addPage();
        y = MARGIN_MM;
      }

      doc.text(line, MARGIN_MM, y, { baseline: 'top' });
      y += lineHeight(sizePt);
    }

    y += gapAfterMm;
  }

  function section(title: string): void {
    // Não deixa um título órfão no pé da página.
    if (y + lineHeight(SECTION_PT) + lineHeight(BODY_PT) * 2 > bottomLimit) {
      doc.addPage();
      y = MARGIN_MM;
    }

    y += 2;
    write(title, SECTION_PT, 'bold', 1);
  }

  function buildTableBody(rows: readonly ReportTableRow[]): string[][] {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(TABLE_PT);
    const detailWidth = COLUMN_WIDTHS_MM[5] - 2 * CELL_PADDING_MM;
    const body: string[][] = [];

    for (const [date, time, systolic, diastolic, pulse, details] of rows) {
      const lines = doc.splitTextToSize(details, detailWidth) as string[];
      splitDetailLines(lines, DETAIL_MAX_LINES).forEach((chunk, index) => {
        // Continuação repete data e hora (associação ao registro) e não repete os valores.
        body.push(index === 0 ? [date, time, systolic, diastolic, pulse, chunk.join('\n')] : [date, time, '', '', '', chunk.join('\n')]);
      });
    }

    return body;
  }

  function drawLegend(top: number): void {
    const items = [
      { label: 'Sistólica (média diária)', rgb: SYSTOLIC_RGB, dashed: false },
      { label: 'Diastólica (média diária)', rgb: DIASTOLIC_RGB, dashed: true },
    ];
    let x = MARGIN_MM;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(CHART_CAPTION_PT);

    for (const item of items) {
      doc.setDrawColor(...item.rgb);
      doc.setLineWidth(0.5);
      doc.setLineDashPattern(item.dashed ? DIASTOLIC_DASH : [], 0);
      doc.line(x, top + 2, x + 10, top + 2);
      doc.setLineDashPattern([], 0);
      drawMarker(item.dashed ? 'diastolic' : 'systolic', x + 5, top + 2);
      doc.setTextColor(...TEXT_RGB);
      doc.text(item.label, x + 12, top + 2, { baseline: 'middle' });
      x += 12 + doc.getTextWidth(item.label) + 8;
    }
  }

  function drawMarker(series: 'systolic' | 'diastolic', x: number, markerY: number): void {
    doc.setLineWidth(0.35);

    if (series === 'systolic') {
      doc.setFillColor(...SYSTOLIC_RGB);
      doc.circle(x, markerY, 0.9, 'F');
      return;
    }

    // Quadrado vazado: forma diferente do círculo cheio, legível sem cor.
    doc.setDrawColor(...DIASTOLIC_RGB);
    doc.setFillColor(255, 255, 255);
    doc.rect(x - 0.9, markerY - 0.9, 1.8, 1.8, 'FD');
  }

  function drawPanel(chart: ReportChart, panel: ChartPanel, top: number): void {
    const plotLeft = MARGIN_MM + Y_LABEL_WIDTH_MM;
    const plotRight = MARGIN_MM + contentWidth - 2;
    const plotTop = top + 10;
    const plotBottom = plotTop + PLOT_HEIGHT_MM;
    const daySlots = panel.lastDayIndex - panel.firstDayIndex + 1;
    // Cada dia ocupa uma faixa e o ponto fica no centro dela: datas reais, inclusive com 1 dia.
    const xOf = (dayIndex: number) => plotLeft + ((dayIndex - panel.firstDayIndex + 0.5) / daySlots) * (plotRight - plotLeft);
    const yOf = (value: number) => plotTop + ((chart.yMax - value) / (chart.yMax - chart.yMin)) * PLOT_HEIGHT_MM;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(CHART_CAPTION_PT);
    doc.setTextColor(...TEXT_RGB);
    doc.text(panel.caption, MARGIN_MM, top, { baseline: 'top' });

    // Grade e escala numérica em mmHg.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(CHART_TICK_PT);
    doc.setTextColor(...MUTED_RGB);
    doc.text('mmHg', plotLeft - 1.5, plotTop - 2.2, { align: 'right' });

    for (const tick of chart.yTicks) {
      const tickY = yOf(tick);
      doc.setDrawColor(...GRID_RGB);
      doc.setLineWidth(0.2);
      doc.line(plotLeft, tickY, plotRight, tickY);
      doc.text(String(tick), plotLeft - 1.5, tickY, { align: 'right', baseline: 'middle' });
    }

    doc.setDrawColor(...BORDER_RGB);
    doc.setLineWidth(0.3);
    doc.line(plotLeft, plotTop, plotLeft, plotBottom);
    doc.line(plotLeft, plotBottom, plotRight, plotBottom);

    for (const tick of panel.xTicks) {
      const tickX = xOf(tick.dayIndex);
      doc.line(tickX, plotBottom, tickX, plotBottom + 1.2);
      doc.text(tick.label, tickX, plotBottom + 2, { align: 'center', baseline: 'top' });
    }

    if (panel.points.length === 0) {
      doc.setTextColor(...TEXT_RGB);
      doc.text('Sem medições neste intervalo.', (plotLeft + plotRight) / 2, (plotTop + plotBottom) / 2, {
        align: 'center',
        baseline: 'middle',
      });
      return;
    }

    // Linhas só dentro de sequências de dias consecutivos: lacunas ficam visíveis.
    for (const segment of panel.segments) {
      for (let index = 1; index < segment.length; index += 1) {
        const previous = segment[index - 1];
        const current = segment[index];

        doc.setLineWidth(0.5);
        doc.setDrawColor(...SYSTOLIC_RGB);
        doc.setLineDashPattern([], 0);
        doc.line(xOf(previous.dayIndex), yOf(previous.systolic), xOf(current.dayIndex), yOf(current.systolic));

        doc.setDrawColor(...DIASTOLIC_RGB);
        doc.setLineDashPattern(DIASTOLIC_DASH, 0);
        doc.line(xOf(previous.dayIndex), yOf(previous.diastolic), xOf(current.dayIndex), yOf(current.diastolic));
        doc.setLineDashPattern([], 0);
      }
    }

    for (const point of panel.points) {
      drawMarker('systolic', xOf(point.dayIndex), yOf(point.systolic));
      drawMarker('diastolic', xOf(point.dayIndex), yOf(point.diastolic));
    }
  }

  function drawChart(chart: ReportChart): void {
    if (y + 6 + PANEL_HEIGHT_MM > bottomLimit) {
      doc.addPage();
      y = MARGIN_MM;
    }

    drawLegend(y);
    y += 7;

    if (chart.explanation !== null) {
      write(chart.explanation, BODY_PT, 'normal', 1);
    }

    chart.panels.forEach((panel) => {
      if (y + PANEL_HEIGHT_MM > bottomLimit) {
        doc.addPage();
        y = MARGIN_MM;
      }

      drawPanel(chart, panel, y);
      y += PANEL_HEIGHT_MM;
    });

    doc.setTextColor(...TEXT_RGB);
    doc.setDrawColor(...BORDER_RGB);
    doc.setLineWidth(0.2);
  }

  // 1. Identificação do relatório e período.
  write(model.header.title, TITLE_PT, 'bold', 2);
  write(`Período solicitado: ${model.header.requestedPeriod}`, BODY_PT);
  write(`Gerado em: ${model.header.generatedAt}`, BODY_PT);
  write(`Fuso horário: ${model.header.timeZone}`, BODY_PT, 'normal', 1);

  // 2. Cobertura, avisos e médias.
  section('Cobertura');
  model.coverage.lines.forEach((line) => write(line, BODY_PT));
  write(model.coverage.statement, BODY_PT, model.coverage.isConfirmed ? 'normal' : 'bold');

  if (model.warnings.length > 0) {
    section('Avisos');
    model.warnings.forEach((warning) => write(`• ${warning}`, BODY_PT));
  }

  section('Médias do intervalo');
  model.averages.forEach((line) => write(`${line.label}: ${line.value} (${line.denominator})`, BODY_PT));

  // 3. Gráfico de tendência: primitivas vetoriais, mesmo retrato dos dados.
  section('Tendência (médias diárias)');
  drawChart(model.chart);

  // 4. Tabela completa, em ordem cronológica, cabeçalho repetido em cada página.
  section('Registros');
  let tableEnd = { page: doc.getNumberOfPages(), y };

  autoTable(doc, {
    head: [[...model.table.columns]],
    body: buildTableBody(model.table.rows),
    startY: y,
    margin: { top: MARGIN_MM, right: MARGIN_MM, bottom: MARGIN_MM + FOOTER_HEIGHT_MM, left: MARGIN_MM },
    theme: 'grid',
    showHead: 'everyPage',
    // Nenhuma linha é cortada entre páginas; detalhes longos já chegam fatiados em blocos com
    // "(continua)"/"(continuação)" e data/hora repetidas, mantendo a associação com o registro.
    rowPageBreak: 'avoid',
    styles: {
      font: 'helvetica',
      fontSize: TABLE_PT,
      textColor: TEXT_RGB,
      lineColor: BORDER_RGB,
      lineWidth: 0.2,
      cellPadding: CELL_PADDING_MM,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: { fillColor: HEAD_FILL_RGB, textColor: TEXT_RGB, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: COLUMN_WIDTHS_MM[0] },
      1: { cellWidth: COLUMN_WIDTHS_MM[1] },
      2: { cellWidth: COLUMN_WIDTHS_MM[2], halign: 'right' },
      3: { cellWidth: COLUMN_WIDTHS_MM[3], halign: 'right' },
      4: { cellWidth: COLUMN_WIDTHS_MM[4], halign: 'right' },
      5: { cellWidth: COLUMN_WIDTHS_MM[5] },
    },
    didDrawPage: (data) => {
      tableEnd = { page: data.pageNumber, y: data.cursor?.y ?? MARGIN_MM };
    },
  });

  doc.setPage(Math.max(tableEnd.page, doc.getNumberOfPages()));
  doc.setTextColor(...TEXT_RGB);
  y = tableEnd.y + 2;

  // 5. Notas metodológicas.
  section('Notas metodológicas');
  model.notes.forEach((note) => write(`• ${note}`, BODY_PT));

  if (replacedCount > 0) {
    write(
      `• ${replacedCount} ${replacedCount === 1 ? 'caractere sem suporte' : 'caracteres sem suporte'} na fonte padrão do PDF ${replacedCount === 1 ? 'foi substituído' : 'foram substituídos'} por “?” nas observações.`,
      BODY_PT,
    );
  }

  // Rodapé: título curto, geração e "Página X de Y" em todas as páginas.
  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FOOTER_PT);
    doc.setTextColor(...MUTED_RGB);
    const footerY = pageHeight - MARGIN_MM;
    doc.text(`Aferi — gerado em ${model.header.generatedAt} (${model.header.timeZone})`, MARGIN_MM, footerY);
    doc.text(`Página ${page} de ${pageCount}`, pageWidth - MARGIN_MM, footerY, { align: 'right' });
  }

  return { bytes: doc.output('arraybuffer'), pageCount };
}
