import type { Reading } from '@/types/models';

import { formatCivilDate } from './report-format';
import { civilDateOf, type CivilDate } from './report-period';

/**
 * Gráfico de tendência do relatório PDF (spec-relatorio-pdf §3.3.3, §3.3.6–7). Puro: só pontos,
 * escala, painéis e marcas de eixo — o renderizador converte em coordenadas e desenha.
 *
 * Regras:
 * - um ponto por dia COM dados: média aritmética dos valores principais dos registros daquele dia
 *   (sessão de duas leituras = um registro), com precisão completa — nada é arredondado aqui;
 * - dia sem dado não tem ponto, zero nem interpolação; linhas só ligam dias CONSECUTIVOS, então
 *   toda lacuna fica visível como interrupção;
 * - um único dia com dado: só marcadores e uma explicação, sem linha de tendência;
 * - períodos longos viram painéis temporais com a MESMA escala de mmHg; nenhum ponto é omitido.
 *
 * Diferente de `computeDailyTrend` (gráfico legado do Histórico, janelas de 7/30 dias, valores
 * arredondados para inteiro), que continua intocado.
 */

export interface ChartDailyPoint {
  day: CivilDate;
  /** Dias desde 01/01/1970 no calendário civil — eixo X linear, imune a horário de verão. */
  dayIndex: number;
  systolic: number;
  diastolic: number;
  readingCount: number;
}

export interface ChartAxisTick {
  dayIndex: number;
  label: string;
}

export interface ChartPanel {
  firstDayIndex: number;
  lastDayIndex: number;
  caption: string;
  points: ChartDailyPoint[];
  /** Sequências de 2+ dias consecutivos com dado: as únicas ligadas por linha. */
  segments: ChartDailyPoint[][];
  xTicks: ChartAxisTick[];
}

export interface ReportChart {
  panels: ChartPanel[];
  yMin: number;
  yMax: number;
  yTicks: number[];
  pointCount: number;
  isSingleDay: boolean;
  /** Texto exibido junto ao gráfico quando a forma dos dados pede explicação; null caso contrário. */
  explanation: string | null;
}

/** Até ~um trimestre por painel mantém ~2 mm por dia na largura útil de um A4. */
export const CHART_PANEL_MIN_DAYS = 92;
/** Acima disso, cada painel cobre mais dias (mesma escala), em vez de multiplicar páginas. */
export const CHART_MAX_PANELS = 12;

const DAY_MS = 24 * 60 * 60 * 1000;
const Y_STEPS = [5, 10, 20, 25, 50] as const;
const MAX_Y_TICKS = 8;
const X_STEPS = [1, 2, 3, 7, 14, 30, 61, 91, 182, 365, 730] as const;
const MAX_X_TICKS = 7;

export function civilDayIndex(day: CivilDate): number {
  return Date.UTC(day.year, day.month - 1, day.day) / DAY_MS;
}

function civilDateFromIndex(dayIndex: number): CivilDate {
  const date = new Date(dayIndex * DAY_MS);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/** Média diária por registro, no fuso fixado; dias em ordem crescente. */
export function computeDailyChartPoints(readings: readonly Reading[], timeZone: string): ChartDailyPoint[] {
  const byDay = new Map<number, { day: CivilDate; systolic: number; diastolic: number; count: number }>();

  for (const reading of readings) {
    const day = civilDateOf(reading.measuredAt, timeZone);
    const dayIndex = civilDayIndex(day);
    const current = byDay.get(dayIndex) ?? { day, systolic: 0, diastolic: 0, count: 0 };
    current.systolic += reading.systolic;
    current.diastolic += reading.diastolic;
    current.count += 1;
    byDay.set(dayIndex, current);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dayIndex, sum]) => ({
      day: sum.day,
      dayIndex,
      systolic: sum.systolic / sum.count,
      diastolic: sum.diastolic / sum.count,
      readingCount: sum.count,
    }));
}

/** Escala única de mmHg para todos os painéis, com folga e marcas "redondas". */
function buildYScale(points: readonly ChartDailyPoint[]): Pick<ReportChart, 'yMin' | 'yMax' | 'yTicks'> {
  const low = Math.min(...points.map((point) => point.diastolic));
  const high = Math.max(...points.map((point) => point.systolic));

  for (const step of Y_STEPS) {
    const yMin = Math.max(0, Math.floor((low - step / 2) / step) * step);
    const yMax = Math.ceil((high + step / 2) / step) * step;

    if ((yMax - yMin) / step <= MAX_Y_TICKS || step === Y_STEPS[Y_STEPS.length - 1]) {
      const yTicks: number[] = [];
      for (let value = yMin; value <= yMax; value += step) {
        yTicks.push(value);
      }
      return { yMin, yMax, yTicks };
    }
  }

  // Inalcançável: o último passo sempre retorna acima.
  return { yMin: 0, yMax: 300, yTicks: [0, 50, 100, 150, 200, 250, 300] };
}

function splitSegments(points: readonly ChartDailyPoint[]): ChartDailyPoint[][] {
  const segments: ChartDailyPoint[][] = [];
  let run: ChartDailyPoint[] = [];

  for (const point of points) {
    if (run.length > 0 && point.dayIndex !== run[run.length - 1].dayIndex + 1) {
      if (run.length >= 2) segments.push(run);
      run = [];
    }
    run.push(point);
  }

  if (run.length >= 2) segments.push(run);
  return segments;
}

function shortLabel(dayIndex: number, withYear: boolean): string {
  const full = formatCivilDate(civilDateFromIndex(dayIndex));
  return withYear ? `${full.slice(0, 6)}${full.slice(8)}` : full.slice(0, 5);
}

function buildXTicks(firstDayIndex: number, lastDayIndex: number, withYear: boolean): ChartAxisTick[] {
  const span = lastDayIndex - firstDayIndex;
  const step = X_STEPS.find((candidate) => span / candidate < MAX_X_TICKS) ?? X_STEPS[X_STEPS.length - 1];
  const ticks: ChartAxisTick[] = [];

  for (let dayIndex = firstDayIndex; dayIndex <= lastDayIndex; dayIndex += step) {
    ticks.push({ dayIndex, label: shortLabel(dayIndex, withYear) });
  }

  return ticks;
}

/**
 * Monta o gráfico para o intervalo de dias [firstDay, lastDay] (o período inteiro, não só os dias
 * com dado). Sem registros, não há gráfico: o relatório inteiro não é gerado nesse caso.
 */
export function buildReportChart(
  readings: readonly Reading[],
  range: { firstDay: CivilDate; lastDay: CivilDate },
  timeZone: string,
): ReportChart | null {
  const points = computeDailyChartPoints(readings, timeZone);

  if (points.length === 0) {
    return null;
  }

  const firstIndex = Math.min(civilDayIndex(range.firstDay), points[0].dayIndex);
  const lastIndex = Math.max(civilDayIndex(range.lastDay), points[points.length - 1].dayIndex);
  const totalDays = lastIndex - firstIndex + 1;
  const panelDays =
    totalDays <= CHART_PANEL_MIN_DAYS ? totalDays : Math.max(CHART_PANEL_MIN_DAYS, Math.ceil(totalDays / CHART_MAX_PANELS));
  const panelCount = Math.ceil(totalDays / panelDays);
  const crossesYear = civilDateFromIndex(firstIndex).year !== civilDateFromIndex(lastIndex).year;

  const panels: ChartPanel[] = [];

  for (let panel = 0; panel < panelCount; panel += 1) {
    const panelFirst = firstIndex + panel * panelDays;
    const panelLast = Math.min(lastIndex, panelFirst + panelDays - 1);
    const panelPoints = points.filter((point) => point.dayIndex >= panelFirst && point.dayIndex <= panelLast);
    const range = `${formatCivilDate(civilDateFromIndex(panelFirst))} a ${formatCivilDate(civilDateFromIndex(panelLast))}`;

    panels.push({
      firstDayIndex: panelFirst,
      lastDayIndex: panelLast,
      caption: panelCount === 1 ? range : `Painel ${panel + 1} de ${panelCount}: ${range}`,
      points: panelPoints,
      segments: splitSegments(panelPoints),
      xTicks: buildXTicks(panelFirst, panelLast, crossesYear),
    });
  }

  const isSingleDay = points.length === 1;

  return {
    panels,
    ...buildYScale(points),
    pointCount: points.length,
    isSingleDay,
    explanation: isSingleDay
      ? 'Há medições em apenas um dia: o gráfico mostra os pontos desse dia, sem linha de tendência.'
      : null,
  };
}

/**
 * Posição horizontal de um dia no painel, de 0 (borda esquerda da área de plotagem) a 1 (direita):
 * cada dia ocupa uma faixa e o ponto fica no centro dela — datas reais, inclusive com um dia só.
 * É a fórmula do desenho jsPDF (`xOf` em render-report-pdf.ts); o SVG do Android a usa daqui.
 */
export function chartDayRatio(panel: Pick<ChartPanel, 'firstDayIndex' | 'lastDayIndex'>, dayIndex: number): number {
  const daySlots = panel.lastDayIndex - panel.firstDayIndex + 1;
  return (dayIndex - panel.firstDayIndex + 0.5) / daySlots;
}

/**
 * Posição vertical de um valor em mmHg, de 0 (topo, `yMax`) a 1 (base, `yMin`), na escala única de
 * todos os painéis. Mesma fórmula do `yOf` do desenho jsPDF.
 */
export function chartValueRatio(chart: Pick<ReportChart, 'yMin' | 'yMax'>, value: number): number {
  return (chart.yMax - value) / (chart.yMax - chart.yMin);
}
