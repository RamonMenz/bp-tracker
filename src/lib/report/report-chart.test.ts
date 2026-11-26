import type { Reading } from '@/types/models';

import { buildReportChart, CHART_MAX_PANELS, civilDayIndex, computeDailyChartPoints } from './report-chart';

// Fuso SEMPRE explícito.
const TZ = 'America/Sao_Paulo';

function reading(isoInstant: string, systolic: number, diastolic: number): Reading {
  const measuredAt = new Date(isoInstant);
  return { systolic, diastolic, pulse: null, measuredAt, createdAt: measuredAt, note: null, source: 'manual', sessionReadings: null };
}

describe('computeDailyChartPoints', () => {
  it('um ponto por dia com dado: média POR REGISTRO do dia, sem arredondar', () => {
    const points = computeDailyChartPoints(
      [
        reading('2026-11-20T11:00:00.000Z', 120, 80),
        reading('2026-11-20T15:00:00.000Z', 121, 81),
        reading('2026-11-20T21:00:00.000Z', 121, 80),
        reading('2026-11-22T12:00:00.000Z', 140, 90),
      ],
      TZ,
    );

    expect(points).toHaveLength(2);
    expect(points[0].day).toEqual({ year: 2026, month: 11, day: 20 });
    expect(points[0].readingCount).toBe(3);
    expect(points[0].systolic).toBeCloseTo(120.6667, 4);
    expect(points[0].diastolic).toBeCloseTo(80.3333, 4);
    expect(points[1]).toMatchObject({ systolic: 140, diastolic: 90, readingCount: 1 });
  });

  it('agrupa pelo dia civil do fuso fixado, não pelo de UTC', () => {
    // 23:30 de 20/11 em São Paulo = 02:30 de 21/11 em UTC.
    const points = computeDailyChartPoints([reading('2026-11-21T02:30:00.000Z', 130, 85)], TZ);
    expect(points[0].day).toEqual({ year: 2026, month: 11, day: 20 });
  });

  it('média não é refeita a partir de valores arredondados: 120 e 121 dão 120,5', () => {
    const [point] = computeDailyChartPoints(
      [reading('2026-11-20T11:00:00.000Z', 120, 80), reading('2026-11-20T12:00:00.000Z', 121, 81)],
      TZ,
    );
    expect(point.systolic).toBe(120.5);
    expect(point.diastolic).toBe(80.5);
  });
});

describe('buildReportChart', () => {
  const range = (first: [number, number, number], last: [number, number, number]) => ({
    firstDay: { year: first[0], month: first[1], day: first[2] },
    lastDay: { year: last[0], month: last[1], day: last[2] },
  });

  it('dia sem dado: sem ponto, sem zero, e a linha é interrompida na lacuna', () => {
    const chart = buildReportChart(
      [
        reading('2026-11-20T12:00:00.000Z', 120, 80),
        reading('2026-11-21T12:00:00.000Z', 125, 82),
        // 22/11 sem medição
        reading('2026-11-23T12:00:00.000Z', 130, 85),
        reading('2026-11-24T12:00:00.000Z', 128, 84),
      ],
      range([2026, 11, 20], [2026, 11, 26]),
      TZ,
    );

    expect(chart).not.toBeNull();
    const [panel] = chart?.panels ?? [];
    expect(panel.points.map((point) => point.day.day)).toEqual([20, 21, 23, 24]);
    expect(panel.points.every((point) => point.systolic > 0 && point.diastolic > 0)).toBe(true);
    expect(panel.segments.map((segment) => segment.map((point) => point.day.day))).toEqual([
      [20, 21],
      [23, 24],
    ]);
    // O eixo cobre o período inteiro, inclusive os dias finais sem dado.
    expect(panel.firstDayIndex).toBe(civilDayIndex({ year: 2026, month: 11, day: 20 }));
    expect(panel.lastDayIndex).toBe(civilDayIndex({ year: 2026, month: 11, day: 26 }));
    expect(chart?.isSingleDay).toBe(false);
    expect(chart?.explanation).toBeNull();
  });

  it('pontos isolados (sem dias consecutivos) não ganham linha', () => {
    const chart = buildReportChart(
      [reading('2026-11-20T12:00:00.000Z', 120, 80), reading('2026-11-25T12:00:00.000Z', 130, 85)],
      range([2026, 11, 20], [2026, 11, 26]),
      TZ,
    );

    expect(chart?.panels[0].points).toHaveLength(2);
    expect(chart?.panels[0].segments).toEqual([]);
  });

  it('um único dia: marcadores e explicação, sem linha de tendência', () => {
    const chart = buildReportChart(
      [reading('2026-11-20T11:00:00.000Z', 120, 80), reading('2026-11-20T20:00:00.000Z', 130, 90)],
      range([2026, 11, 20], [2026, 11, 20]),
      TZ,
    );

    expect(chart?.isSingleDay).toBe(true);
    expect(chart?.pointCount).toBe(1);
    expect(chart?.panels[0].segments).toEqual([]);
    expect(chart?.explanation).toMatch(/apenas um dia/);
    expect(chart?.panels[0].points[0]).toMatchObject({ systolic: 125, diastolic: 85, readingCount: 2 });
  });

  it('escala única em mmHg, com folga, englobando todos os pontos', () => {
    const chart = buildReportChart(
      [reading('2026-11-20T12:00:00.000Z', 162, 101), reading('2026-11-21T12:00:00.000Z', 118, 72)],
      range([2026, 11, 20], [2026, 11, 21]),
      TZ,
    );

    expect(chart?.yMin).toBeLessThan(72);
    expect(chart?.yMax).toBeGreaterThan(162);
    expect(chart?.yTicks[0]).toBe(chart?.yMin);
    expect(chart?.yTicks[chart.yTicks.length - 1]).toBe(chart?.yMax);
    expect(chart?.yTicks.length).toBeLessThanOrEqual(9);
  });

  it('período extenso: painéis com a mesma escala, sem omitir nenhum ponto', () => {
    const readings: Reading[] = [];
    const start = Date.UTC(2024, 0, 1, 12);

    for (let day = 0; day < 1000; day += 1) {
      if (day % 5 === 3) continue; // lacunas
      readings.push(reading(new Date(start + day * 86_400_000).toISOString(), 110 + (day % 50), 70 + (day % 20)));
    }

    const chart = buildReportChart(readings, range([2024, 1, 1], [2026, 9, 26]), TZ);
    const panels = chart?.panels ?? [];

    expect(panels.length).toBeGreaterThan(1);
    expect(panels.length).toBeLessThanOrEqual(CHART_MAX_PANELS);
    expect(panels.reduce((sum, panel) => sum + panel.points.length, 0)).toBe(readings.length);
    expect(chart?.pointCount).toBe(readings.length);
    // Painéis contíguos, sem sobreposição nem buraco entre eles.
    for (let index = 1; index < panels.length; index += 1) {
      expect(panels[index].firstDayIndex).toBe(panels[index - 1].lastDayIndex + 1);
    }
    expect(panels[0].caption).toMatch(/^Painel 1 de \d+: 01\/01\/2024 a /);
    // Atravessa anos: marcas do eixo com ano abreviado.
    expect(panels[0].xTicks[0].label).toBe('01/01/24');
    expect(panels[0].xTicks.length).toBeLessThanOrEqual(7);
  });

  it('período curto: um painel só, marcas dd/mm', () => {
    const chart = buildReportChart(
      [reading('2026-11-20T12:00:00.000Z', 120, 80)],
      range([2026, 10, 28], [2026, 11, 26]),
      TZ,
    );

    expect(chart?.panels).toHaveLength(1);
    expect(chart?.panels[0].caption).toBe('28/10/2026 a 26/11/2026');
    expect(chart?.panels[0].xTicks[0].label).toBe('28/10');
  });

  it('sem registros não há gráfico', () => {
    expect(buildReportChart([], range([2026, 11, 20], [2026, 11, 26]), TZ)).toBeNull();
  });
});
