import type { SessionReadings } from '@/types/models';

import {
  buildReportModel,
  computeReportStats,
  MAX_REPORT_READINGS,
  type ReportModel,
  type ReportSourceReading,
} from './report-model';
import { resolveReportPeriod, type ReportPeriod, type ReportPeriodSelection } from './report-period';

const TZ = 'America/Sao_Paulo';
const PREPARED_AT = new Date('2026-11-26T17:03:00.000Z'); // 26/11/2026 14:03 em São Paulo

function period(selection: ReportPeriodSelection = { kind: 'all' }): ReportPeriod {
  const result = resolveReportPeriod(selection, PREPARED_AT, TZ);

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.period;
}

let nextId = 0;

function reading(overrides: Partial<ReportSourceReading> & Pick<ReportSourceReading, 'measuredAt'>): ReportSourceReading {
  nextId += 1;
  return {
    id: `synthetic-${String(nextId).padStart(3, '0')}`,
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

function buildOk(readings: ReportSourceReading[], selection?: ReportPeriodSelection, extra?: { fromCache?: boolean; omittedCount?: number }): ReportModel {
  const result = buildReportModel(
    { readings, fromCache: extra?.fromCache ?? false, omittedCount: extra?.omittedCount ?? 0 },
    period(selection),
  );

  if (!result.ok) {
    throw new Error('esperava modelo');
  }

  return result.model;
}

function averageValues(model: ReportModel): string[] {
  return model.averages.map((line) => `${line.label}: ${line.value} (${line.denominator})`);
}

const SPEC_EXAMPLE = [
  { systolic: 120, diastolic: 80, pulse: 60 },
  { systolic: 130, diastolic: 90, pulse: null },
  { systolic: 140, diastolic: 100, pulse: 80 },
];

describe('médias do relatório — exemplo da spec §3.3.5', () => {
  it('três registros em dias distintos: 130,0/90,0 mmHg (N=3) e pulso 70,0 bpm (N=2)', () => {
    const model = buildOk(
      SPEC_EXAMPLE.map((values, index) =>
        reading({ ...values, measuredAt: new Date(`2026-11-2${index}T12:00:00.000Z`) }),
      ),
    );

    expect(averageValues(model)).toEqual([
      'Sistólica média: 130,0 mmHg (N = 3 registros)',
      'Diastólica média: 90,0 mmHg (N = 3 registros)',
      'Pulso médio: 70,0 bpm (N = 2 de 3 registros com pulso informado)',
    ]);
  });

  it('com os dois primeiros no mesmo dia a média global continua 130,0/90,0 (não é média de médias diárias)', () => {
    const model = buildOk([
      reading({ ...SPEC_EXAMPLE[0], measuredAt: new Date('2026-11-20T11:00:00.000Z') }),
      reading({ ...SPEC_EXAMPLE[1], measuredAt: new Date('2026-11-20T21:00:00.000Z') }),
      reading({ ...SPEC_EXAMPLE[2], measuredAt: new Date('2026-11-22T12:00:00.000Z') }),
    ]);

    // Média de médias diárias daria (125 + 140) / 2 = 132,5 — o valor errado que não pode aparecer.
    expect(model.stats.systolic).toEqual({ mean: 130, n: 3 });
    expect(model.stats.diastolic).toEqual({ mean: 90, n: 3 });
    expect(model.averages[0].value).toBe('130,0 mmHg');
    expect(model.coverage.lines).toContain('Dias com registro: 2');
  });

  it('arredonda só na apresentação, uma casa, vírgula', () => {
    const stats = computeReportStats([
      reading({ systolic: 120, diastolic: 80, measuredAt: new Date('2026-11-20T12:00:00.000Z') }),
      reading({ systolic: 121, diastolic: 80, measuredAt: new Date('2026-11-21T12:00:00.000Z') }),
      reading({ systolic: 121, diastolic: 81, measuredAt: new Date('2026-11-22T12:00:00.000Z') }),
    ]);

    expect(stats.systolic.mean).toBeCloseTo(120.6667, 4);
    const model = buildOk([
      reading({ systolic: 120, diastolic: 80, measuredAt: new Date('2026-11-20T12:00:00.000Z') }),
      reading({ systolic: 121, diastolic: 80, measuredAt: new Date('2026-11-21T12:00:00.000Z') }),
      reading({ systolic: 121, diastolic: 81, measuredAt: new Date('2026-11-22T12:00:00.000Z') }),
    ]);
    expect(model.averages[0].value).toBe('120,7 mmHg');
    expect(model.averages[1].value).toBe('80,3 mmHg');
  });
});

describe('pulso ausente', () => {
  it('todos sem pulso: "Não informado", nunca zero, e "—" na tabela', () => {
    const model = buildOk([
      reading({ measuredAt: new Date('2026-11-20T12:00:00.000Z') }),
      reading({ measuredAt: new Date('2026-11-21T12:00:00.000Z') }),
    ]);

    expect(model.stats.pulse).toEqual({ mean: null, n: 0 });
    expect(model.averages[2].value).toBe('Não informado');
    expect(model.averages[2].denominator).toBe('N = 0 de 2 registros com pulso informado');
    expect(model.table.rows.map((row) => row[4])).toEqual(['—', '—']);
    expect(model.averages[2].value).not.toMatch(/\d/);
  });
});

describe('sessão de duas leituras', () => {
  const session: SessionReadings = [
    { systolic: 150, diastolic: 95, pulse: 72 },
    { systolic: 120, diastolic: 80, pulse: null },
  ];

  it('o documento salvo conta UMA vez; as leituras individuais são só detalhe', () => {
    const model = buildOk([
      reading({ systolic: 135, diastolic: 88, pulse: 72, sessionReadings: session, measuredAt: new Date('2026-11-20T12:00:00.000Z') }),
      reading({ systolic: 125, diastolic: 82, pulse: 68, measuredAt: new Date('2026-11-21T12:00:00.000Z') }),
    ]);

    expect(model.table.rows).toHaveLength(2);
    expect(model.coverage.lines).toContain('Registros incluídos: 2');
    expect(model.stats.systolic).toEqual({ mean: 130, n: 2 });
    expect(model.stats.pulse).toEqual({ mean: 70, n: 2 });
    expect(model.table.rows[0][5]).toBe('Média de sessão (2 leituras): 1ª 150/95, pulso 72; 2ª 120/80, pulso —');
    expect(model.table.rows[1][5]).toBe('—');
  });
});

describe('período, ordem e cobertura', () => {
  it('ordem cronológica crescente com desempate estável pelo id', () => {
    const sameInstant = new Date('2026-11-21T12:00:00.000Z');
    const model = buildOk([
      reading({ id: 'b', systolic: 131, diastolic: 80, measuredAt: sameInstant }),
      reading({ id: 'c', systolic: 140, diastolic: 80, measuredAt: new Date('2026-11-22T12:00:00.000Z') }),
      reading({ id: 'a', systolic: 130, diastolic: 80, measuredAt: sameInstant }),
      reading({ id: 'z', systolic: 110, diastolic: 70, measuredAt: new Date('2026-11-19T12:00:00.000Z') }),
    ]);

    expect(model.table.rows.map((row) => row[2])).toEqual(['110', '130', '131', '140']);
  });

  it('bordas: inclui 00:00 do primeiro dia e 23:59 do último; exclui o dia anterior e o seguinte', () => {
    const model = buildOk(
      [
        reading({ systolic: 101, diastolic: 70, measuredAt: new Date('2026-10-01T02:59:59.999Z') }), // 30/09 23:59
        reading({ systolic: 102, diastolic: 70, measuredAt: new Date('2026-10-01T03:00:00.000Z') }), // 01/10 00:00
        reading({ systolic: 103, diastolic: 70, measuredAt: new Date('2026-10-24T02:59:00.000Z') }), // 23/10 23:59
        reading({ systolic: 104, diastolic: 70, measuredAt: new Date('2026-10-24T03:00:00.000Z') }), // 24/10 00:00
      ],
      { kind: 'custom', startDay: { year: 2026, month: 10, day: 1 }, endDay: { year: 2026, month: 10, day: 23 } },
    );

    expect(model.table.rows.map((row) => `${row[0]} ${row[1]} ${row[2]}`)).toEqual([
      '01/10/2026 00:00 102',
      '23/10/2026 23:59 103',
    ]);
    expect(model.fileName).toBe('aferi-relatorio-2026-10-01_a_2026-10-23.pdf');
    expect(model.header.requestedPeriod).toBe('Personalizado — 01/10/2026 a 23/10/2026');
  });

  it('cabeçalho com geração, fuso IANA e cobertura (primeiro/último incluídos)', () => {
    const model = buildOk(
      [
        reading({ measuredAt: new Date('2026-11-20T11:15:00.000Z') }),
        reading({ measuredAt: new Date('2026-11-26T12:40:00.000Z') }),
      ],
      { kind: 'last7' },
    );

    expect(model.header).toEqual({
      title: 'Aferi — Relatório de pressão arterial',
      requestedPeriod: 'Últimos 7 dias — 20/11/2026 a 26/11/2026 (até o horário da geração)',
      generatedAt: '26/11/2026 14:03',
      timeZone: 'America/Sao_Paulo',
    });
    expect(model.coverage.lines).toEqual([
      'Registros incluídos: 2',
      'Dias com registro: 2',
      'Primeiro registro incluído: 20/11/2026 08:15',
      'Último registro incluído: 26/11/2026 09:40',
    ]);
    expect(model.coverage.isConfirmed).toBe(true);
    expect(model.warnings).toEqual([]);
  });

  it('"Tudo" descreve o limite e nomeia o arquivo pelas datas efetivas do conjunto', () => {
    const model = buildOk([
      reading({ measuredAt: new Date('2025-01-05T12:00:00.000Z') }),
      reading({ measuredAt: new Date('2026-11-25T12:00:00.000Z') }),
    ]);

    expect(model.header.requestedPeriod).toBe('Tudo — todos os registros disponíveis até 26/11/2026 14:03');
    expect(model.fileName).toBe('aferi-relatorio-2025-01-05_a_2026-11-25.pdf');
  });

  it('período vazio não produz modelo (nada de PDF com médias zero)', () => {
    const result = buildReportModel(
      { readings: [reading({ measuredAt: new Date('2026-01-01T12:00:00.000Z') })], fromCache: false, omittedCount: 0 },
      period({ kind: 'last7' }),
    );

    expect(result).toEqual({ ok: false, reason: 'empty', fromCache: false, omittedCount: 0 });
  });
});

describe('cobertura incompleta é declarada', () => {
  const readings = () => [
    reading({ measuredAt: new Date('2026-11-20T12:00:00.000Z') }),
    reading({ measuredAt: new Date('2026-11-21T12:00:00.000Z'), hasPendingWrites: true }),
  ];

  it('documento inválido omitido', () => {
    const model = buildOk(readings(), undefined, { omittedCount: 1 });

    expect(model.coverage.isConfirmed).toBe(false);
    expect(model.coverage.statement).toMatch(/Cobertura não confirmada/);
    expect(model.warnings).toContain(
      '1 registro do período não pôde ser lido e foi omitido; contagens e médias não o incluem.',
    );
  });

  it('dados só do cache e escrita pendente', () => {
    const model = buildOk(readings(), undefined, { fromCache: true });

    expect(model.coverage.isConfirmed).toBe(false);
    expect(model.warnings[0]).toMatch(/armazenamento local do aparelho, sem confirmação do servidor/);
    expect(model.warnings).toContain('1 registro incluído ainda está pendente de sincronização com o servidor.');
    expect(model.table.rows[1][5]).toBe('Pendente de sincronização');
  });
});

describe('observação é texto literal', () => {
  it('HTML, URL, aspas e caracteres especiais passam sem interpretação nem perda', () => {
    const note = '<script>alert("x")</script> <b>forte</b> https://exemplo.invalid/?a=1&b=2 \'aspas\' \\ (parênteses) ç ã é';
    const model = buildOk([reading({ note, measuredAt: new Date('2026-11-20T12:00:00.000Z') })]);

    expect(model.table.rows[0][5]).toBe(`Observação: ${note}`);
  });
});

describe('limite de volume (PDF-22)', () => {
  it('acima do limite não gera modelo nem trunca: informa contagem e limite', () => {
    const many: ReportSourceReading[] = [];
    const start = new Date('2025-01-01T12:00:00.000Z').getTime();

    for (let index = 0; index <= MAX_REPORT_READINGS; index += 1) {
      many.push(reading({ measuredAt: new Date(start + index * 4 * 60 * 60 * 1000) }));
    }

    expect(buildReportModel({ readings: many, fromCache: false, omittedCount: 0 }, period())).toEqual({
      ok: false,
      reason: 'too-many',
      readingCount: MAX_REPORT_READINGS + 1,
      limit: MAX_REPORT_READINGS,
    });
  });

  it('exatamente no limite gera o relatório com todos os registros', () => {
    const many: ReportSourceReading[] = [];
    const start = new Date('2025-01-01T12:00:00.000Z').getTime();

    for (let index = 0; index < MAX_REPORT_READINGS; index += 1) {
      many.push(reading({ measuredAt: new Date(start + index * 4 * 60 * 60 * 1000) }));
    }

    expect(buildOk(many).table.rows).toHaveLength(MAX_REPORT_READINGS);
  });
});

describe('gráfico no modelo', () => {
  it('usa o mesmo retrato e cobre o período solicitado inteiro', () => {
    const model = buildOk(
      [
        reading({ systolic: 120, diastolic: 80, measuredAt: new Date('2026-11-20T11:00:00.000Z') }),
        reading({ systolic: 130, diastolic: 90, measuredAt: new Date('2026-11-20T21:00:00.000Z') }),
        reading({ systolic: 140, diastolic: 100, measuredAt: new Date('2026-11-22T12:00:00.000Z') }),
      ],
      { kind: 'last7' },
    );

    expect(model.chart.pointCount).toBe(2);
    expect(model.chart.panels[0].caption).toBe('20/11/2026 a 26/11/2026');
    expect(model.chart.panels[0].points.map((point) => point.systolic)).toEqual([125, 140]);
    expect(model.notes.some((note) => /não equivalem a pressão zero/.test(note))).toBe(true);
  });
});
