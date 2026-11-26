import { DateTime } from 'luxon';

/**
 * Período do relatório PDF em DIAS CIVIS no fuso fixado no início da operação
 * (spec-relatorio-pdf §3.2). Puro: `preparedAt` e `timeZone` são sempre parâmetros.
 *
 * Diferente do CSV de propósito (spec §4): o CSV subtrai 7/30 períodos de 24 h; aqui "Últimos 7
 * dias" é hoje + os 6 dias civis anteriores, do início do primeiro dia (inclusivo) ao início do dia
 * seguinte ao último (exclusivo), limitado ao instante de preparação. O CSV não muda.
 */

/** Dia civil, sem hora nem fuso. `month` vai de 1 a 12. */
export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

export type ReportPeriodKind = 'last7' | 'last30' | 'all' | 'custom';

export type ReportPeriodSelection =
  | { kind: 'last7' }
  | { kind: 'last30' }
  | { kind: 'all' }
  | { kind: 'custom'; startDay: CivilDate; endDay: CivilDate };

export interface ReportPeriod {
  kind: ReportPeriodKind;
  /** Fuso IANA fixado para consulta, agrupamento e apresentação durante toda a geração. */
  timeZone: string;
  preparedAt: Date;
  /** Primeiro dia solicitado; null em "Tudo" (sem limite inferior). */
  firstDay: CivilDate | null;
  /** Último dia solicitado (hoje nos atalhos e em "Tudo"). */
  lastDay: CivilDate;
  /** Início do primeiro dia, inclusivo; null em "Tudo". */
  startInclusive: Date | null;
  /** O menor entre o início do dia seguinte ao último e o instante de preparação (inclusive). Exclusivo. */
  endExclusive: Date;
}

export type ReportPeriodError = 'invalid-time-zone' | 'invalid-date' | 'end-before-start' | 'future-day';

export type ReportPeriodResult = { ok: true; period: ReportPeriod } | { ok: false; error: ReportPeriodError };

const SHORTCUT_DAYS: Record<'last7' | 'last30', number> = { last7: 7, last30: 30 };

function toCivilDate(value: DateTime): CivilDate {
  return { year: value.year, month: value.month, day: value.day };
}

/** O dia civil em que `date` cai no fuso informado. */
export function civilDateOf(date: Date, timeZone: string): CivilDate {
  return toCivilDate(DateTime.fromJSDate(date, { zone: timeZone }));
}

export function compareCivilDates(a: CivilDate, b: CivilDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

function isValidCivilDate(value: CivilDate, timeZone: string): boolean {
  return DateTime.fromObject({ ...value }, { zone: timeZone }).isValid;
}

/**
 * Primeiro instante do dia civil no fuso. Quando a meia-noite não existe (início de horário de
 * verão à 00:00, como em America/Sao_Paulo até 2018), o luxon avança para o primeiro horário
 * válido do dia (01:00) — que é exatamente o início do dia.
 */
export function startOfCivilDay(value: CivilDate, timeZone: string): Date {
  return DateTime.fromObject({ ...value, hour: 0, minute: 0, second: 0, millisecond: 0 }, { zone: timeZone }).toJSDate();
}

function addCivilDays(value: CivilDate, days: number): CivilDate {
  // Aritmética de calendário em UTC: imune a horário de verão, que só afeta instantes, não datas.
  return toCivilDate(DateTime.fromObject({ ...value }, { zone: 'utc' }).plus({ days }));
}

function buildPeriod(
  kind: ReportPeriodKind,
  firstDay: CivilDate | null,
  lastDay: CivilDate,
  preparedAt: Date,
  timeZone: string,
): ReportPeriod {
  const nextDayStart = startOfCivilDay(addCivilDays(lastDay, 1), timeZone);
  // "Hoje é limitado ao instante de preparação" (spec §3.2.3): +1 ms torna o instante inclusivo
  // num limite que é exclusivo.
  const preparedLimit = new Date(preparedAt.getTime() + 1);
  const endExclusive = nextDayStart.getTime() < preparedLimit.getTime() ? nextDayStart : preparedLimit;

  return {
    kind,
    timeZone,
    preparedAt,
    firstDay,
    lastDay,
    startInclusive: firstDay === null ? null : startOfCivilDay(firstDay, timeZone),
    endExclusive,
  };
}

export function resolveReportPeriod(
  selection: ReportPeriodSelection,
  preparedAt: Date,
  timeZone: string,
): ReportPeriodResult {
  const now = DateTime.fromJSDate(preparedAt, { zone: timeZone });

  if (!now.isValid || Number.isNaN(preparedAt.getTime())) {
    return { ok: false, error: 'invalid-time-zone' };
  }

  const today = toCivilDate(now);

  if (selection.kind === 'all') {
    return { ok: true, period: buildPeriod('all', null, today, preparedAt, timeZone) };
  }

  if (selection.kind === 'custom') {
    const { startDay, endDay } = selection;

    if (!isValidCivilDate(startDay, timeZone) || !isValidCivilDate(endDay, timeZone)) {
      return { ok: false, error: 'invalid-date' };
    }

    if (compareCivilDates(endDay, startDay) < 0) {
      return { ok: false, error: 'end-before-start' };
    }

    if (compareCivilDates(endDay, today) > 0) {
      return { ok: false, error: 'future-day' };
    }

    return { ok: true, period: buildPeriod('custom', startDay, endDay, preparedAt, timeZone) };
  }

  const firstDay = addCivilDays(today, -(SHORTCUT_DAYS[selection.kind] - 1));
  return { ok: true, period: buildPeriod(selection.kind, firstDay, today, preparedAt, timeZone) };
}

/** Predicado das bordas: início inclusivo, fim exclusivo. */
export function isWithinReportPeriod(date: Date, period: ReportPeriod): boolean {
  const time = date.getTime();

  if (period.startInclusive !== null && time < period.startInclusive.getTime()) {
    return false;
  }

  return time < period.endExclusive.getTime();
}
