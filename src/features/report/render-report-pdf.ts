import { toWinAnsiText } from '@/lib/report/report-format';
import type { ReportModel, ReportTableRow } from '@/lib/report/report-model';

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

  // 3. Tabela completa, em ordem cronológica, cabeçalho repetido em cada página.
  section('Registros');
  let tableEnd = { page: doc.getNumberOfPages(), y };

  autoTable(doc, {
    head: [[...model.table.columns]],
    body: model.table.rows.map((row) => [...row]),
    startY: y,
    margin: { top: MARGIN_MM, right: MARGIN_MM, bottom: MARGIN_MM + FOOTER_HEIGHT_MM, left: MARGIN_MM },
    theme: 'grid',
    showHead: 'everyPage',
    // Cada registro fica inteiro numa página, junto dos próprios detalhes (observação ≤ 280 caracteres).
    rowPageBreak: 'avoid',
    styles: {
      font: 'helvetica',
      fontSize: TABLE_PT,
      textColor: TEXT_RGB,
      lineColor: BORDER_RGB,
      lineWidth: 0.2,
      cellPadding: 1.6,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: { fillColor: HEAD_FILL_RGB, textColor: TEXT_RGB, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 23 },
      1: { cellWidth: 14 },
      2: { cellWidth: 24, halign: 'right' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 'auto' },
    },
    didDrawPage: (data) => {
      tableEnd = { page: data.pageNumber, y: data.cursor?.y ?? MARGIN_MM };
    },
  });

  doc.setPage(Math.max(tableEnd.page, doc.getNumberOfPages()));
  doc.setTextColor(...TEXT_RGB);
  y = tableEnd.y + 2;

  // 4. Notas metodológicas.
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
