import { parseReading, parseReadingInput } from './reading.schema';

const MEASURED_AT = new Date('2026-01-15T10:00:00.000Z');

function storedDocument(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    systolic: 125,
    diastolic: 85,
    pulse: 75,
    measuredAt: MEASURED_AT,
    createdAt: MEASURED_AT,
    note: null,
    source: 'manual',
    ...overrides,
  };
}

const FIRST = { systolic: 120, diastolic: 80, pulse: 70 };
const SECOND = { systolic: 130, diastolic: 90, pulse: 80 };

describe('readingSchema — sessionReadings', () => {
  it('aceita documento antigo, sem a chave, e devolve sessionReadings null', () => {
    const reading = parseReading(storedDocument());

    expect(reading.sessionReadings).toBeNull();
  });

  it('aceita sessionReadings null gravado explicitamente', () => {
    expect(parseReading(storedDocument({ sessionReadings: null })).sessionReadings).toBeNull();
  });

  it('aceita duas leituras válidas e normaliza pulso ausente para null', () => {
    const reading = parseReading(
      storedDocument({ sessionReadings: [FIRST, { systolic: 130, diastolic: 90 }] }),
    );

    expect(reading.sessionReadings).toEqual([FIRST, { systolic: 130, diastolic: 90, pulse: null }]);
  });

  it('recusa sessão com uma leitura só', () => {
    expect(() => parseReading(storedDocument({ sessionReadings: [FIRST] }))).toThrow();
  });

  it('recusa sessão com três leituras', () => {
    expect(() => parseReading(storedDocument({ sessionReadings: [FIRST, SECOND, FIRST] }))).toThrow();
  });

  it('recusa leitura da sessão fora da faixa, com a mesma mensagem do documento', () => {
    expect(() =>
      parseReading(storedDocument({ sessionReadings: [FIRST, { ...SECOND, systolic: 999 }] })),
    ).toThrow('A sistólica deve ficar entre 50 e 300.');
  });

  it('recusa leitura da sessão com sistólica não maior que a diastólica', () => {
    expect(() =>
      parseReading(storedDocument({ sessionReadings: [FIRST, { systolic: 90, diastolic: 90, pulse: null }] })),
    ).toThrow('A sistólica deve ser maior que a diastólica.');
  });
});

describe('readingInputSchema — sessionReadings', () => {
  it('candidato sem a chave vira medição única (sessionReadings null)', () => {
    const { createdAt: _createdAt, ...input } = storedDocument();

    expect(parseReadingInput(input).sessionReadings).toBeNull();
  });
});
