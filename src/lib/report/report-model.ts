import type { Reading, SessionReadingValues } from '@/types/models';

import { buildReportChart, type ReportChart } from './report-chart';
import {
  formatCivilDate,
  formatDateInZone,
  formatDateTimeInZone,
  formatIsoCivilDate,
  formatOneDecimal,
  formatTimeInZone,
} from './report-format';
import { civilDateOf, compareCivilDates, isWithinReportPeriod, type ReportPeriod } from './report-period';

/**
 * Modelo puro do relatório PDF (spec-relatorio-pdf §3.3, §7.2): um único retrato dos registros
 * vira médias, contagens e linhas JÁ FORMATADAS. Os renderizadores (jsPDF na Web, futuramente
 * HTML no Android) só desenham este modelo — nenhum cálculo clínico mora neles.
 */

/** Registro validado como sai da leitura do relatório: com id (desempate) e pendência. */
export interface ReportSourceReading extends Reading {
  id: string;
  hasPendingWrites: boolean;
}

export interface ReportSourceSnapshot {
  readings: readonly ReportSourceReading[];
  /** true quando o conjunto veio do cache local, sem confirmação do servidor. */
  fromCache: boolean;
  /** Documentos do período que não passaram pelo schema e ficaram de fora. */
  omittedCount: number;
}

export interface MeanStat {
  /** Média com precisão completa; null quando N = 0. */
  mean: number | null;
  n: number;
}

export interface ReportStats {
  systolic: MeanStat;
  diastolic: MeanStat;
  pulse: MeanStat;
}

export interface ReportAverageLine {
  label: string;
  value: string;
  denominator: string;
}

export const REPORT_TITLE = 'Aferi — Relatório de pressão arterial';

/**
 * Limite explícito de volume do relatório (spec §7.4, PDF-22). Acima dele o relatório NÃO é
 * gerado — nunca truncado: o usuário escolhe um período menor. 3.000 registros ≈ 2,7 anos com 3
 * medições por dia; a renderização roda na thread principal da Web (ver docs/pdf-relatorio.md).
 */
export const MAX_REPORT_READINGS = 3000;
export const NOT_INFORMED = 'Não informado';
export const MISSING_VALUE = '—';

export const REPORT_TABLE_COLUMNS = [
  'Data',
  'Hora',
  'Sistólica (mmHg)',
  'Diastólica (mmHg)',
  'Pulso (bpm)',
  'Sessão e observação',
] as const;

export type ReportTableRow = [string, string, string, string, string, string];

export interface ReportModel {
  header: {
    title: string;
    requestedPeriod: string;
    generatedAt: string;
    timeZone: string;
  };
  coverage: {
    lines: string[];
    /** true só com leitura do servidor e nenhum documento omitido. */
    isConfirmed: boolean;
    statement: string;
  };
  stats: ReportStats;
  chart: ReportChart;
  averages: ReportAverageLine[];
  warnings: string[];
  table: {
    columns: readonly string[];
    rows: ReportTableRow[];
  };
  notes: string[];
  fileName: string;
}

export type BuildReportResult =
  | { ok: true; model: ReportModel }
  | { ok: false; reason: 'empty'; fromCache: boolean; omittedCount: number }
  | { ok: false; reason: 'too-many'; readingCount: number; limit: number };

function mean(values: readonly number[]): MeanStat {
  if (values.length === 0) {
    return { mean: null, n: 0 };
  }

  // Soma inteira, uma divisão só: nada de arredondar a cada parcela (spec §3.3.4).
  return { mean: values.reduce((sum, value) => sum + value, 0) / values.length, n: values.length };
}

/**
 * Médias do intervalo POR REGISTRO: cada documento salvo pesa igual, usando os campos principais
 * (numa sessão de duas leituras, a média já salva — `sessionReadings` é detalhe e não entra). Pulso
 * `null` sai do denominador; nunca vira zero. Nunca é média de médias diárias.
 */
export function computeReportStats(readings: readonly Reading[]): ReportStats {
  return {
    systolic: mean(readings.map((reading) => reading.systolic)),
    diastolic: mean(readings.map((reading) => reading.diastolic)),
    pulse: mean(readings.flatMap((reading) => (reading.pulse === null ? [] : [reading.pulse]))),
  };
}

/** Ordem cronológica crescente; desempate estável pelo id interno (que não é impresso). */
export function sortReportReadings<T extends { id: string; measuredAt: Date }>(readings: readonly T[]): T[] {
  return [...readings].sort((a, b) => {
    const byTime = a.measuredAt.getTime() - b.measuredAt.getTime();

    if (byTime !== 0) {
      return byTime;
    }

    if (a.id === b.id) {
      return 0;
    }

    return a.id < b.id ? -1 : 1;
  });
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function formatPulse(pulse: number | null): string {
  return pulse === null ? MISSING_VALUE : String(pulse);
}

function formatSessionEntry(entry: SessionReadingValues, ordinal: string): string {
  return `${ordinal} ${entry.systolic}/${entry.diastolic}, pulso ${formatPulse(entry.pulse)}`;
}

function buildDetails(reading: ReportSourceReading): string {
  const parts: string[] = [];

  if (reading.sessionReadings !== null) {
    const [first, second] = reading.sessionReadings;
    parts.push(
      `Média de sessão (2 leituras): ${formatSessionEntry(first, '1ª')}; ${formatSessionEntry(second, '2ª')}`,
    );
  }

  if (reading.note !== null && reading.note.trim() !== '') {
    // Texto literal: o renderizador desenha a string como está, sem interpretar HTML ou links.
    parts.push(`Observação: ${reading.note}`);
  }

  if (reading.hasPendingWrites) {
    parts.push('Pendente de sincronização');
  }

  return parts.length === 0 ? MISSING_VALUE : parts.join('\n');
}

const PERIOD_LABEL: Record<ReportPeriod['kind'], string> = {
  last7: 'Últimos 7 dias',
  last30: 'Últimos 30 dias',
  all: 'Tudo',
  custom: 'Personalizado',
};

function describeRequestedPeriod(period: ReportPeriod): string {
  const generatedAt = formatDateTimeInZone(period.preparedAt, period.timeZone);

  if (period.firstDay === null) {
    return `${PERIOD_LABEL.all} — todos os registros disponíveis até ${generatedAt}`;
  }

  const range = `${formatCivilDate(period.firstDay)} a ${formatCivilDate(period.lastDay)}`;
  const includesToday = compareCivilDates(period.lastDay, civilDateOf(period.preparedAt, period.timeZone)) === 0;

  return `${PERIOD_LABEL[period.kind]} — ${range}${includesToday ? ' (até o horário da geração)' : ''}`;
}

function buildWarnings(snapshot: ReportSourceSnapshot, pendingCount: number): string[] {
  const warnings: string[] = [];

  if (snapshot.fromCache) {
    warnings.push(
      'Dados lidos do armazenamento local do aparelho, sem confirmação do servidor: o relatório pode não incluir todas as medições do período.',
    );
  }

  if (snapshot.omittedCount > 0) {
    warnings.push(
      `${plural(snapshot.omittedCount, 'registro do período não pôde ser lido e foi omitido', 'registros do período não puderam ser lidos e foram omitidos')}; contagens e médias não o${snapshot.omittedCount === 1 ? '' : 's'} incluem.`,
    );
  }

  if (pendingCount > 0) {
    warnings.push(
      `${plural(pendingCount, 'registro incluído ainda está pendente', 'registros incluídos ainda estão pendentes')} de sincronização com o servidor.`,
    );
  }

  return warnings;
}

function buildAverages(stats: ReportStats, readingCount: number): ReportAverageLine[] {
  const pressureDenominator = `N = ${stats.systolic.n} ${stats.systolic.n === 1 ? 'registro' : 'registros'}`;

  return [
    {
      label: 'Sistólica média',
      value: stats.systolic.mean === null ? NOT_INFORMED : `${formatOneDecimal(stats.systolic.mean)} mmHg`,
      denominator: pressureDenominator,
    },
    {
      label: 'Diastólica média',
      value: stats.diastolic.mean === null ? NOT_INFORMED : `${formatOneDecimal(stats.diastolic.mean)} mmHg`,
      denominator: pressureDenominator,
    },
    {
      label: 'Pulso médio',
      value: stats.pulse.mean === null ? NOT_INFORMED : `${formatOneDecimal(stats.pulse.mean)} bpm`,
      denominator: `N = ${stats.pulse.n} de ${readingCount} ${readingCount === 1 ? 'registro' : 'registros'} com pulso informado`,
    },
  ];
}

function buildNotes(timeZone: string): string[] {
  return [
    'Médias do intervalo: média aritmética dos valores principais de cada registro; todos os registros têm o mesmo peso (não é média de médias diárias).',
    'Sessão de duas leituras: o registro salvo (média da sessão) conta uma vez nas contagens e médias; as leituras individuais aparecem só como detalhe.',
    `Pulso ausente aparece como “${MISSING_VALUE}” e não entra no denominador da média de pulso.`,
    'Gráfico: cada ponto é a média diária dos valores principais dos registros do dia; dias sem medição não têm ponto (não equivalem a pressão zero) e as linhas só ligam dias consecutivos.',
    'Valores arredondados para uma casa decimal apenas na apresentação.',
    `Datas em dd/mm/aaaa e horários em HH:mm no fuso ${timeZone}.`,
    'Este documento organiza medições registradas pelo próprio usuário e não substitui avaliação médica.',
  ];
}

/**
 * Monta o modelo a partir de um único retrato. Registros fora do período (bordas inclusiva/
 * exclusiva) não pertencem ao relatório e são descartados aqui também, de forma determinística;
 * a consulta já os exclui. Sem registros, não há modelo — nunca um PDF vazio com médias zero.
 */
export function buildReportModel(snapshot: ReportSourceSnapshot, period: ReportPeriod): BuildReportResult {
  const readings = sortReportReadings(snapshot.readings.filter((reading) => isWithinReportPeriod(reading.measuredAt, period)));

  if (readings.length === 0) {
    return { ok: false, reason: 'empty', fromCache: snapshot.fromCache, omittedCount: snapshot.omittedCount };
  }

  if (readings.length > MAX_REPORT_READINGS) {
    return { ok: false, reason: 'too-many', readingCount: readings.length, limit: MAX_REPORT_READINGS };
  }

  const { timeZone } = period;
  const first = readings[0];
  const last = readings[readings.length - 1];
  const dayCount = new Set(readings.map((reading) => formatIsoCivilDate(civilDateOf(reading.measuredAt, timeZone)))).size;
  const pendingCount = readings.filter((reading) => reading.hasPendingWrites).length;
  const stats = computeReportStats(readings);
  const warnings = buildWarnings(snapshot, pendingCount);
  const isConfirmed = !snapshot.fromCache && snapshot.omittedCount === 0;

  const fileStart = period.firstDay ?? civilDateOf(first.measuredAt, timeZone);
  const fileEnd = period.firstDay === null ? civilDateOf(last.measuredAt, timeZone) : period.lastDay;
  // O gráfico cobre o período solicitado inteiro; em "Tudo", do primeiro ao último registro.
  const chart = buildReportChart(readings, { firstDay: fileStart, lastDay: fileEnd }, timeZone);

  if (chart === null) {
    // Inalcançável com readings.length > 0; mantém o tipo honesto sem asserção.
    return { ok: false, reason: 'empty', fromCache: snapshot.fromCache, omittedCount: snapshot.omittedCount };
  }

  return {
    ok: true,
    model: {
      header: {
        title: REPORT_TITLE,
        requestedPeriod: describeRequestedPeriod(period),
        generatedAt: formatDateTimeInZone(period.preparedAt, timeZone),
        timeZone,
      },
      coverage: {
        lines: [
          `Registros incluídos: ${readings.length}`,
          `Dias com registro: ${dayCount}`,
          `Primeiro registro incluído: ${formatDateTimeInZone(first.measuredAt, timeZone)}`,
          `Último registro incluído: ${formatDateTimeInZone(last.measuredAt, timeZone)}`,
        ],
        isConfirmed,
        statement: isConfirmed
          ? 'Leitura confirmada pelo servidor no momento da geração; nenhum registro do período foi omitido.'
          : 'Cobertura não confirmada: este relatório pode não conter todo o histórico do período (ver avisos).',
      },
      stats,
      chart,
      averages: buildAverages(stats, readings.length),
      warnings,
      table: {
        columns: REPORT_TABLE_COLUMNS,
        rows: readings.map((reading) => [
          formatDateInZone(reading.measuredAt, timeZone),
          formatTimeInZone(reading.measuredAt, timeZone),
          String(reading.systolic),
          String(reading.diastolic),
          formatPulse(reading.pulse),
          buildDetails(reading),
        ]),
      },
      notes: buildNotes(timeZone),
      fileName: `aferi-relatorio-${formatIsoCivilDate(fileStart)}_a_${formatIsoCivilDate(fileEnd)}.pdf`,
    },
  };
}
