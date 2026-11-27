import { chartDayRatio, chartValueRatio, type ChartPanel, type ReportChart } from '@/lib/report/report-chart';
import type { ReportModel, ReportTableRow } from '@/lib/report/report-model';
import { splitDetailLines, wrapTextByChars } from '@/lib/report/report-table';

/**
 * Template do relatório para o Android (spec-relatorio-pdf §7.1/§7.2): HTML/CSS autocontido que o
 * `expo-print` converte em PDF pelo WebView do sistema. Só desenha o `ReportModel` — o mesmo
 * modelo do jsPDF na Web —, sem nenhum cálculo clínico.
 *
 * Regras de segurança do template (PDF-11/12):
 * - todo texto variável passa por `escapeHtml`: observação com HTML, URL ou aspas vira texto
 *   literal;
 * - nenhum recurso remoto, fonte externa, imagem, `url(...)` nem script; a política de conteúdo
 *   `default-src 'none'` bloqueia qualquer carga mesmo se algo escapar (defesa em profundidade);
 * - o gráfico é SVG inline, calculado pelas mesmas funções de geometria (`chartDayRatio`,
 *   `chartValueRatio`) e pelo mesmo `ReportChart` do desenho Web.
 *
 * Fonte: `sans-serif` do sistema (Roboto no Android), local e com cobertura Unicode — não há a
 * troca por "?" da Helvetica padrão do jsPDF. Tipografia igual à Web: título 16 pt, seções 13 pt,
 * texto 11 pt, tabela 10 pt, rodapé 9 pt.
 */

/** A4 retrato em pontos (72 por polegada): é a unidade de `width`/`height` do `printToFileAsync`. */
export const A4_WIDTH_PT = 595;
export const A4_HEIGHT_PT = 842;

/** Larguras da tabela iguais às da Web (somam a largura útil de 180 mm). */
const COLUMN_WIDTHS_MM = [23, 14, 24, 24, 18, 77] as const;
/**
 * Caracteres por linha da coluna de detalhes, estimados para baixo (73,8 mm úteis a 10 pt cabem
 * ~42 caracteres médios): a estimativa só decide onde fatiar observações longas em blocos.
 */
const DETAIL_CHARS_PER_LINE = 38;
/** Mesmo limite da Web: um bloco de até 12 linhas cabe folgado numa página. */
const DETAIL_MAX_LINES = 12;

const CONTENT_WIDTH_MM = 180;
const PANEL_HEIGHT_MM = 67;
const PLOT_TOP_MM = 10;
const PLOT_HEIGHT_MM = 44;
const Y_LABEL_WIDTH_MM = 12;
const PLOT_LEFT_MM = Y_LABEL_WIDTH_MM;
const PLOT_RIGHT_MM = CONTENT_WIDTH_MM - 2;
const PT_TO_MM = 25.4 / 72;

/** Cores das séries iguais à Web, com traço e marcador distintos (legível em cinza, PDF-10). */
const SYSTOLIC = 'rgb(29, 78, 216)';
const DIASTOLIC = 'rgb(180, 83, 9)';
const GRID = 'rgb(203, 213, 225)';
const TEXT = 'rgb(15, 23, 42)';
const MUTED = 'rgb(51, 65, 85)';
const BORDER = 'rgb(100, 116, 139)';
const HEAD_FILL = 'rgb(226, 232, 240)';
const DIASTOLIC_DASH = '1.6 1.1';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapa texto para conteúdo E atributo HTML. Controles invisíveis (exceto quebra de linha) são
 * removidos: não são conteúdo e alguns quebram o parser.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * Texto dentro de uma string CSS (`content: "..."` do rodapé): só letras, dígitos e pontuação
 * inofensiva passam; o resto vira escape hexadecimal do CSS. Impede fechar a string ou a regra.
 */
function escapeCssString(value: string): string {
  return [...value]
    .map((char) => (/^[\p{L}\p{N} /:._,()+-]$/u.test(char) ? char : `\\${(char.codePointAt(0) ?? 0).toString(16)} `))
    .join('');
}

function mm(value: number): string {
  return value.toFixed(2);
}

function paragraph(text: string, className?: string): string {
  return `<p${className ? ` class="${className}"` : ''}>${escapeHtml(text)}</p>`;
}

function legendSwatch(series: 'systolic' | 'diastolic'): string {
  const color = series === 'systolic' ? SYSTOLIC : DIASTOLIC;
  const dash = series === 'diastolic' ? ` stroke-dasharray="${DIASTOLIC_DASH}"` : '';

  return (
    `<svg class="swatch" width="10mm" height="4mm" viewBox="0 0 10 4" aria-hidden="true">` +
    `<line x1="0" y1="2" x2="10" y2="2" stroke="${color}" stroke-width="0.5"${dash}/>` +
    marker(series, 5, 2) +
    `</svg>`
  );
}

/** Círculo cheio (sistólica) × quadrado vazado (diastólica): distinção que não depende de cor. */
function marker(series: 'systolic' | 'diastolic', x: number, y: number): string {
  if (series === 'systolic') {
    return `<circle cx="${mm(x)}" cy="${mm(y)}" r="0.9" fill="${SYSTOLIC}"/>`;
  }

  return `<rect x="${mm(x - 0.9)}" y="${mm(y - 0.9)}" width="1.8" height="1.8" fill="#fff" stroke="${DIASTOLIC}" stroke-width="0.35"/>`;
}

function svgText(x: number, y: number, text: string, attributes: string): string {
  return `<text x="${mm(x)}" y="${mm(y)}" ${attributes}>${escapeHtml(text)}</text>`;
}

function panelSvg(chart: ReportChart, panel: ChartPanel): string {
  const xOf = (dayIndex: number) => PLOT_LEFT_MM + chartDayRatio(panel, dayIndex) * (PLOT_RIGHT_MM - PLOT_LEFT_MM);
  const yOf = (value: number) => PLOT_TOP_MM + chartValueRatio(chart, value) * PLOT_HEIGHT_MM;
  const plotBottom = PLOT_TOP_MM + PLOT_HEIGHT_MM;
  const tickSize = `font-size="${mm(9 * PT_TO_MM)}" fill="${MUTED}"`;
  const parts: string[] = [];

  parts.push(svgText(0, 3.6, panel.caption, `font-size="${mm(10 * PT_TO_MM)}" font-weight="bold" fill="${TEXT}"`));
  parts.push(svgText(PLOT_LEFT_MM - 1.5, PLOT_TOP_MM - 2.2, 'mmHg', `text-anchor="end" ${tickSize}`));

  for (const tick of chart.yTicks) {
    const tickY = yOf(tick);
    parts.push(
      `<line x1="${mm(PLOT_LEFT_MM)}" y1="${mm(tickY)}" x2="${mm(PLOT_RIGHT_MM)}" y2="${mm(tickY)}" stroke="${GRID}" stroke-width="0.2"/>`,
    );
    parts.push(svgText(PLOT_LEFT_MM - 1.5, tickY + 1.1, String(tick), `text-anchor="end" ${tickSize}`));
  }

  parts.push(
    `<path d="M ${mm(PLOT_LEFT_MM)} ${mm(PLOT_TOP_MM)} V ${mm(plotBottom)} H ${mm(PLOT_RIGHT_MM)}" fill="none" stroke="${BORDER}" stroke-width="0.3"/>`,
  );

  for (const tick of panel.xTicks) {
    const tickX = xOf(tick.dayIndex);
    parts.push(
      `<line x1="${mm(tickX)}" y1="${mm(plotBottom)}" x2="${mm(tickX)}" y2="${mm(plotBottom + 1.2)}" stroke="${BORDER}" stroke-width="0.3"/>`,
    );
    parts.push(svgText(tickX, plotBottom + 5, tick.label, `text-anchor="middle" ${tickSize}`));
  }

  if (panel.points.length === 0) {
    parts.push(
      svgText((PLOT_LEFT_MM + PLOT_RIGHT_MM) / 2, PLOT_TOP_MM + PLOT_HEIGHT_MM / 2, 'Sem medições neste intervalo.', `text-anchor="middle" ${tickSize}`),
    );
  }

  // Linhas só dentro de sequências de dias consecutivos: lacunas ficam visíveis (PDF-08).
  for (const segment of panel.segments) {
    const systolic = segment.map((point) => `${mm(xOf(point.dayIndex))},${mm(yOf(point.systolic))}`).join(' ');
    const diastolic = segment.map((point) => `${mm(xOf(point.dayIndex))},${mm(yOf(point.diastolic))}`).join(' ');
    parts.push(`<polyline points="${systolic}" fill="none" stroke="${SYSTOLIC}" stroke-width="0.5"/>`);
    parts.push(
      `<polyline points="${diastolic}" fill="none" stroke="${DIASTOLIC}" stroke-width="0.5" stroke-dasharray="${DIASTOLIC_DASH}"/>`,
    );
  }

  for (const point of panel.points) {
    parts.push(marker('systolic', xOf(point.dayIndex), yOf(point.systolic)));
    parts.push(marker('diastolic', xOf(point.dayIndex), yOf(point.diastolic)));
  }

  const label = `Gráfico de tendência, ${panel.caption}: ${panel.points.length} ${panel.points.length === 1 ? 'dia' : 'dias'} com medição.`;

  return (
    `<svg class="panel" role="img" aria-label="${escapeHtml(label)}" width="${CONTENT_WIDTH_MM}mm" height="${PANEL_HEIGHT_MM}mm" ` +
    `viewBox="0 0 ${CONTENT_WIDTH_MM} ${PANEL_HEIGHT_MM}" font-family="sans-serif">${parts.join('')}</svg>`
  );
}

function chartSection(chart: ReportChart): string {
  const legend =
    `<div class="legend">` +
    `<span class="legend-item">${legendSwatch('systolic')} Sistólica (média diária)</span>` +
    `<span class="legend-item">${legendSwatch('diastolic')} Diastólica (média diária)</span>` +
    `</div>`;
  const explanation = chart.explanation === null ? '' : paragraph(chart.explanation);

  return legend + explanation + chart.panels.map((panel) => panelSvg(chart, panel)).join('');
}

function cell(text: string, className?: string): string {
  return `<td${className ? ` class="${className}"` : ''}>${escapeHtml(text)}</td>`;
}

/**
 * Uma linha por registro; detalhes longos viram blocos de até 12 linhas estimadas, cada um numa
 * linha da tabela que não quebra entre páginas, com "(continua)"/"(continuação)" — igual à Web. A
 * continuação repete data e hora (associação ao registro) e não repete os valores.
 */
function tableRows(rows: readonly ReportTableRow[]): string {
  const html: string[] = [];

  for (const [date, time, systolic, diastolic, pulse, details] of rows) {
    const estimatedLines = wrapTextByChars(details, DETAIL_CHARS_PER_LINE);
    // Cabe num bloco: o texto original segue inteiro e o motor quebra as linhas pela fonte real.
    const chunks =
      estimatedLines.length <= DETAIL_MAX_LINES ? [[details]] : splitDetailLines(estimatedLines, DETAIL_MAX_LINES);

    chunks.forEach((chunk, index) => {
      const values = index === 0 ? [systolic, diastolic, pulse] : ['', '', ''];
      html.push(
        `<tr${index > 0 ? ' class="continuation"' : ''}>` +
          cell(date) +
          cell(time) +
          values.map((value) => cell(value, 'num')).join('') +
          cell(chunk.join('\n'), 'details') +
          `</tr>`,
      );
    });
  }

  return html.join('');
}

function styles(footerLeft: string): string {
  return `
@page {
  size: A4 portrait;
  margin: 15mm 15mm 20mm 15mm;
  @bottom-left { content: "${escapeCssString(footerLeft)}"; font-family: sans-serif; font-size: 9pt; color: ${MUTED}; }
  @bottom-right { content: "Página " counter(page) " de " counter(pages); font-family: sans-serif; font-size: 9pt; color: ${MUTED}; }
}
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; -webkit-text-size-adjust: 100%; }
body { margin: 0; font-family: sans-serif; font-size: 11pt; line-height: 1.25; color: ${TEXT}; background: #fff; }
h1 { font-size: 16pt; margin: 0 0 2mm; }
h2 { font-size: 13pt; margin: 4mm 0 1mm; break-after: avoid; page-break-after: avoid; }
p { margin: 0; }
.strong { font-weight: bold; }
ul { margin: 0; padding-left: 5mm; }
.legend { margin: 1mm 0 2mm; }
.legend-item { margin-right: 8mm; font-size: 10pt; white-space: nowrap; }
.swatch { vertical-align: middle; }
.panel { display: block; break-inside: avoid; page-break-inside: avoid; }
table { width: ${CONTENT_WIDTH_MM}mm; border-collapse: collapse; table-layout: fixed; font-size: 10pt; }
col.c0 { width: ${COLUMN_WIDTHS_MM[0]}mm; } col.c1 { width: ${COLUMN_WIDTHS_MM[1]}mm; }
col.c2 { width: ${COLUMN_WIDTHS_MM[2]}mm; } col.c3 { width: ${COLUMN_WIDTHS_MM[3]}mm; }
col.c4 { width: ${COLUMN_WIDTHS_MM[4]}mm; } col.c5 { width: ${COLUMN_WIDTHS_MM[5]}mm; }
thead { display: table-header-group; }
tr { break-inside: avoid; page-break-inside: avoid; }
th, td { border: 0.2mm solid ${BORDER}; padding: 1.6mm; vertical-align: top; text-align: left; }
th { background: ${HEAD_FILL}; font-weight: bold; }
td.num, th.num { text-align: right; }
td.details { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
`;
}

/**
 * HTML completo do relatório, na ordem da spec §3.3.2: identificação e período → cobertura, avisos
 * e médias → gráfico → tabela → notas metodológicas. Rodapé com "Página X de Y" pelas caixas de
 * margem do `@page`, quando o motor as suporta (validar no WebView do aparelho).
 */
export function buildReportHtml(model: ReportModel): string {
  const { header, coverage, averages, warnings, chart, table, notes } = model;
  const footerLeft = `Aferi — gerado em ${header.generatedAt} (${header.timeZone})`;

  const body = [
    `<h1>${escapeHtml(header.title)}</h1>`,
    paragraph(`Período solicitado: ${header.requestedPeriod}`),
    paragraph(`Gerado em: ${header.generatedAt}`),
    paragraph(`Fuso horário: ${header.timeZone}`),

    `<h2>Cobertura</h2>`,
    ...coverage.lines.map((line) => paragraph(line)),
    paragraph(coverage.statement, coverage.isConfirmed ? undefined : 'strong'),

    ...(warnings.length > 0
      ? [`<h2>Avisos</h2>`, `<ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>`]
      : []),

    `<h2>Médias do intervalo</h2>`,
    ...averages.map((line) => paragraph(`${line.label}: ${line.value} (${line.denominator})`)),

    `<h2>Tendência (médias diárias)</h2>`,
    chartSection(chart),

    `<h2>Registros</h2>`,
    `<table><colgroup>${COLUMN_WIDTHS_MM.map((_, index) => `<col class="c${index}">`).join('')}</colgroup>`,
    `<thead><tr>${table.columns
      .map((column, index) => `<th${index >= 2 && index <= 4 ? ' class="num"' : ''}>${escapeHtml(column)}</th>`)
      .join('')}</tr></thead>`,
    `<tbody>${tableRows(table.rows)}</tbody></table>`,

    `<h2>Notas metodológicas</h2>`,
    `<ul>${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>`,
  ].join('\n');

  return [
    '<!DOCTYPE html>',
    '<html lang="pt-BR">',
    '<head>',
    '<meta charset="utf-8">',
    // Nada externo pode carregar, nem por engano: só o estilo inline e o SVG do próprio documento.
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">`,
    `<title>${escapeHtml(header.title)}</title>`,
    `<style>${styles(footerLeft)}</style>`,
    '</head>',
    `<body>\n${body}\n</body>`,
    '</html>',
  ].join('\n');
}
