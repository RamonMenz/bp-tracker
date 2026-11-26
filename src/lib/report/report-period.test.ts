import { isWithinReportPeriod, resolveReportPeriod, type ReportPeriod } from './report-period';

// Fuso SEMPRE explícito: nada aqui depende do TZ do processo que roda o Jest.
const SAO_PAULO = 'America/Sao_Paulo';
const NEW_YORK = 'America/New_York';

function resolveOk(...args: Parameters<typeof resolveReportPeriod>): ReportPeriod {
  const result = resolveReportPeriod(...args);

  if (!result.ok) {
    throw new Error(`esperava período válido, obteve ${result.error}`);
  }

  return result.period;
}

describe('resolveReportPeriod — atalhos em dias civis', () => {
  // 26/11/2026 14:03 em São Paulo (UTC-3, sem horário de verão desde 2019).
  const preparedAt = new Date('2026-11-26T17:03:00.000Z');

  it('"Últimos 7 dias" = hoje e os 6 dias anteriores, do início do 1º dia até o instante da preparação', () => {
    const period = resolveOk({ kind: 'last7' }, preparedAt, SAO_PAULO);

    expect(period.firstDay).toEqual({ year: 2026, month: 11, day: 20 });
    expect(period.lastDay).toEqual({ year: 2026, month: 11, day: 26 });
    expect(period.startInclusive?.toISOString()).toBe('2026-11-20T03:00:00.000Z');
    // Hoje é limitado ao instante da preparação (inclusive).
    expect(period.endExclusive.toISOString()).toBe('2026-11-26T17:03:00.001Z');
    expect(period.timeZone).toBe(SAO_PAULO);
  });

  it('"Últimos 30 dias" = hoje e os 29 dias anteriores, atravessando a virada de mês', () => {
    const period = resolveOk({ kind: 'last30' }, preparedAt, SAO_PAULO);

    expect(period.firstDay).toEqual({ year: 2026, month: 10, day: 28 });
    expect(period.startInclusive?.toISOString()).toBe('2026-10-28T03:00:00.000Z');
  });

  it('"Tudo" não tem limite inferior e vai até o instante da preparação', () => {
    const period = resolveOk({ kind: 'all' }, preparedAt, SAO_PAULO);

    expect(period.firstDay).toBeNull();
    expect(period.startInclusive).toBeNull();
    expect(period.endExclusive.toISOString()).toBe('2026-11-26T17:03:00.001Z');
  });

  it('o "hoje" é o dia civil do fuso fixado, não o de UTC', () => {
    // 23:30 em São Paulo do dia 26 já é dia 27 em UTC.
    const lateEvening = new Date('2026-11-27T02:30:00.000Z');
    const period = resolveOk({ kind: 'last7' }, lateEvening, SAO_PAULO);

    expect(period.lastDay).toEqual({ year: 2026, month: 11, day: 26 });
    expect(period.firstDay).toEqual({ year: 2026, month: 11, day: 20 });
  });
});

describe('resolveReportPeriod — personalizado', () => {
  const preparedAt = new Date('2026-11-26T17:03:00.000Z');

  it('início do primeiro dia inclusivo e início do dia seguinte ao último exclusivo', () => {
    const period = resolveOk(
      { kind: 'custom', startDay: { year: 2026, month: 10, day: 1 }, endDay: { year: 2026, month: 10, day: 23 } },
      preparedAt,
      SAO_PAULO,
    );

    expect(period.startInclusive?.toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(period.endExclusive.toISOString()).toBe('2026-10-24T03:00:00.000Z');
  });

  it('aceita início e fim no mesmo dia', () => {
    const day = { year: 2026, month: 11, day: 10 };
    expect(resolveReportPeriod({ kind: 'custom', startDay: day, endDay: day }, preparedAt, SAO_PAULO).ok).toBe(true);
  });

  it('bloqueia data final anterior à inicial', () => {
    expect(
      resolveReportPeriod(
        { kind: 'custom', startDay: { year: 2026, month: 11, day: 10 }, endDay: { year: 2026, month: 11, day: 9 } },
        preparedAt,
        SAO_PAULO,
      ),
    ).toEqual({ ok: false, error: 'end-before-start' });
  });

  it('bloqueia dias futuros', () => {
    expect(
      resolveReportPeriod(
        { kind: 'custom', startDay: { year: 2026, month: 11, day: 20 }, endDay: { year: 2026, month: 11, day: 27 } },
        preparedAt,
        SAO_PAULO,
      ),
    ).toEqual({ ok: false, error: 'future-day' });
  });

  it('recusa data inexistente', () => {
    expect(
      resolveReportPeriod(
        { kind: 'custom', startDay: { year: 2026, month: 2, day: 30 }, endDay: { year: 2026, month: 3, day: 1 } },
        preparedAt,
        SAO_PAULO,
      ),
    ).toEqual({ ok: false, error: 'invalid-date' });
  });

  it('com o último dia sendo hoje, o fim é o instante da preparação', () => {
    const period = resolveOk(
      { kind: 'custom', startDay: { year: 2026, month: 11, day: 1 }, endDay: { year: 2026, month: 11, day: 26 } },
      preparedAt,
      SAO_PAULO,
    );

    expect(period.endExclusive.toISOString()).toBe('2026-11-26T17:03:00.001Z');
  });

  it('fuso inválido não produz período', () => {
    expect(resolveReportPeriod({ kind: 'all' }, preparedAt, 'Fuso/Inexistente')).toEqual({
      ok: false,
      error: 'invalid-time-zone',
    });
  });
});

describe('resolveReportPeriod — horário de verão', () => {
  it('São Paulo, 04/11/2018: a meia-noite não existiu; o dia começa à 01:00 local', () => {
    const period = resolveOk(
      { kind: 'custom', startDay: { year: 2018, month: 11, day: 4 }, endDay: { year: 2018, month: 11, day: 4 } },
      new Date('2018-12-01T12:00:00.000Z'),
      SAO_PAULO,
    );

    // 01:00 em UTC-2 (horário de verão) = 03:00 UTC; dia seguinte começa à 00:00 UTC-2 = 02:00 UTC.
    expect(period.startInclusive?.toISOString()).toBe('2018-11-04T03:00:00.000Z');
    expect(period.endExclusive.toISOString()).toBe('2018-11-05T02:00:00.000Z');
  });

  it('Nova York, fim do horário de verão (03/11/2024): o dia tem 25 h e nenhuma leitura se perde', () => {
    const period = resolveOk(
      { kind: 'custom', startDay: { year: 2024, month: 11, day: 3 }, endDay: { year: 2024, month: 11, day: 3 } },
      new Date('2024-12-01T12:00:00.000Z'),
      NEW_YORK,
    );

    expect(period.startInclusive?.toISOString()).toBe('2024-11-03T04:00:00.000Z');
    expect(period.endExclusive.toISOString()).toBe('2024-11-04T05:00:00.000Z');
    expect(period.endExclusive.getTime() - (period.startInclusive?.getTime() ?? 0)).toBe(25 * 60 * 60 * 1000);
    // 01:30 da segunda passagem (EST) ainda é dia 03.
    expect(isWithinReportPeriod(new Date('2024-11-03T06:30:00.000Z'), period)).toBe(true);
  });

  it('"Últimos 7 dias" atravessando o início do horário de verão conta 7 dias civis, não 7 × 24 h', () => {
    // 12/03/2024 12:00 em Nova York (EDT). O DST começou em 10/03.
    const period = resolveOk({ kind: 'last7' }, new Date('2024-03-12T16:00:00.000Z'), NEW_YORK);

    expect(period.firstDay).toEqual({ year: 2024, month: 3, day: 6 });
    // 06/03 00:00 EST = 05:00 UTC, uma hora a mais que o deslocamento em vigor no fim do período.
    expect(period.startInclusive?.toISOString()).toBe('2024-03-06T05:00:00.000Z');
  });
});

describe('isWithinReportPeriod — bordas', () => {
  const period = resolveOk(
    { kind: 'custom', startDay: { year: 2026, month: 10, day: 1 }, endDay: { year: 2026, month: 10, day: 23 } },
    new Date('2026-11-26T17:03:00.000Z'),
    SAO_PAULO,
  );

  it('inclui o primeiro instante do primeiro dia', () => {
    expect(isWithinReportPeriod(new Date('2026-10-01T03:00:00.000Z'), period)).toBe(true);
  });

  it('exclui o último milissegundo do dia anterior', () => {
    expect(isWithinReportPeriod(new Date('2026-10-01T02:59:59.999Z'), period)).toBe(false);
  });

  it('inclui 23:59:59.999 do último dia', () => {
    expect(isWithinReportPeriod(new Date('2026-10-24T02:59:59.999Z'), period)).toBe(true);
  });

  it('exclui a meia-noite do dia seguinte', () => {
    expect(isWithinReportPeriod(new Date('2026-10-24T03:00:00.000Z'), period)).toBe(false);
  });
});
