import { useMemo } from 'react';

import type { Reading } from '@/types/models';

import { useReadings } from './useReadings';

export type TrendWindow = 7 | 30;

export interface TrendPoint {
  dateKey: string;
  label: string;
  averageSystolic: number;
  averageDiastolic: number;
}

type TrendReadingInput = Pick<Reading, 'measuredAt' | 'systolic' | 'diastolic'>;

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shortLabel(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function average(values: number[]): number {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/**
 * Média diária de sistólica/diastólica na janela de `windowDays` dias terminando em `from`
 * (inclusive). Pura e sem I/O — testável sem Firestore.
 *
 * Dias sem nenhuma medição não entram no resultado (sem preenchimento de lacuna). Chave de
 * agrupamento e ordenação usam o dia LOCAL do aparelho (não UTC) — a mesma convenção já usada no
 * agrupamento por dia do histórico, para não fatiar o dia errado perto da meia-noite.
 */
export function computeDailyTrend(
  readings: readonly TrendReadingInput[],
  windowDays: TrendWindow,
  from: Date = new Date(),
): TrendPoint[] {
  const windowEnd = from;
  const windowStart = startOfDay(from);
  windowStart.setDate(windowStart.getDate() - (windowDays - 1));

  const groups = new Map<string, { systolic: number[]; diastolic: number[]; date: Date }>();

  for (const reading of readings) {
    if (reading.measuredAt < windowStart || reading.measuredAt > windowEnd) {
      continue;
    }

    const key = dayKey(reading.measuredAt);
    const group = groups.get(key);

    if (group === undefined) {
      groups.set(key, {
        systolic: [reading.systolic],
        diastolic: [reading.diastolic],
        date: reading.measuredAt,
      });
    } else {
      group.systolic.push(reading.systolic);
      group.diastolic.push(reading.diastolic);
    }
  }

  return [...groups.entries()]
    .sort(([keyA], [keyB]) => (keyA < keyB ? -1 : keyA > keyB ? 1 : 0))
    .map(([key, group]) => ({
      dateKey: key,
      label: shortLabel(group.date),
      averageSystolic: average(group.systolic),
      averageDiastolic: average(group.diastolic),
    }));
}

export interface UseReadingsTrendResult {
  trend7d: TrendPoint[];
  trend30d: TrendPoint[];
  isLoading: boolean;
  error: string | null;
}

/** Deriva de useReadings — nenhum listener novo, reaproveita o mesmo isLoading/error. */
export function useReadingsTrend(): UseReadingsTrendResult {
  const { readings, isLoading, error } = useReadings();

  const trend7d = useMemo(() => computeDailyTrend(readings, 7), [readings]);
  const trend30d = useMemo(() => computeDailyTrend(readings, 30), [readings]);

  return { trend7d, trend30d, isLoading, error };
}
