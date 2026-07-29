import { computeDailyTrend } from './useReadingsTrend';

// useReadingsTrend.ts também exporta o hook conectado useReadingsTrend, que importa
// useReadings — e esse, transitivamente, toda a stack de auth/Firebase/Google Sign-In. Este
// arquivo só testa computeDailyTrend (pura); o mock evita puxar módulos nativos inexistentes no
// ambiente de teste por causa de um export do mesmo arquivo que não é exercido aqui.
// babel-plugin-jest-hoist eleva esta chamada para antes dos imports em tempo de build.
jest.mock('./useReadings', () => ({ useReadings: jest.fn() }));

function reading(measuredAt: string, systolic: number, diastolic: number) {
  return { measuredAt: new Date(measuredAt), systolic, diastolic };
}

describe('computeDailyTrend', () => {
  it('retorna lista vazia para nenhuma leitura', () => {
    expect(computeDailyTrend([], 7, new Date('2026-01-10T12:00:00'))).toEqual([]);
  });

  it('agrupa múltiplas leituras do mesmo dia numa única média', () => {
    const readings = [
      reading('2026-01-10T08:00:00', 120, 80),
      reading('2026-01-10T14:00:00', 130, 90),
      reading('2026-01-10T20:00:00', 110, 70),
    ];

    const result = computeDailyTrend(readings, 7, new Date('2026-01-10T21:00:00'));

    expect(result).toEqual([{ dateKey: '2026-01-10', label: '10/01', averageSystolic: 120, averageDiastolic: 80 }]);
  });

  it('separa leituras de dias diferentes e ordena do mais antigo pro mais recente', () => {
    const readings = [
      reading('2026-01-11T08:00:00', 140, 90),
      reading('2026-01-09T08:00:00', 110, 70),
      reading('2026-01-10T08:00:00', 120, 80),
    ];

    const result = computeDailyTrend(readings, 7, new Date('2026-01-11T12:00:00'));

    expect(result.map((p) => p.dateKey)).toEqual(['2026-01-09', '2026-01-10', '2026-01-11']);
  });

  it('arredonda a média para o inteiro mais próximo', () => {
    const readings = [reading('2026-01-10T08:00:00', 120, 80), reading('2026-01-10T14:00:00', 121, 81)];

    const result = computeDailyTrend(readings, 7, new Date('2026-01-10T15:00:00'));

    expect(result[0].averageSystolic).toBe(121); // (120+121)/2 = 120.5 -> 121
    expect(result[0].averageDiastolic).toBe(81); // (80+81)/2 = 80.5 -> 81
  });

  it('exclui leitura mais antiga que a janela de 7 dias', () => {
    const from = new Date('2026-01-10T12:00:00');
    const readings = [
      reading('2026-01-03T08:00:00', 999, 999), // exatamente 7 dias antes do início da janela — fora
      reading('2026-01-04T08:00:00', 120, 80), // início da janela de 7 dias — dentro
    ];

    const result = computeDailyTrend(readings, 7, from);

    expect(result.map((p) => p.dateKey)).toEqual(['2026-01-04']);
  });

  it('inclui o próprio dia de `from` como parte da janela (7 dias = hoje + 6 anteriores)', () => {
    const from = new Date('2026-01-10T09:00:00');
    const readings = [reading('2026-01-04T00:00:00', 120, 80), reading('2026-01-10T08:00:00', 130, 85)];

    const result = computeDailyTrend(readings, 7, from);

    expect(result.map((p) => p.dateKey)).toEqual(['2026-01-04', '2026-01-10']);
  });

  it('exclui leitura posterior a `from`', () => {
    const from = new Date('2026-01-10T09:00:00');
    const readings = [reading('2026-01-10T08:00:00', 120, 80), reading('2026-01-10T10:00:00', 999, 999)];

    const result = computeDailyTrend(readings, 7, from);

    expect(result).toEqual([{ dateKey: '2026-01-10', label: '10/01', averageSystolic: 120, averageDiastolic: 80 }]);
  });

  it('janela de 30 dias inclui leitura que a de 7 dias excluiria', () => {
    const from = new Date('2026-01-31T12:00:00');
    const readings = [reading('2026-01-05T08:00:00', 120, 80)];

    expect(computeDailyTrend(readings, 7, from)).toEqual([]);
    expect(computeDailyTrend(readings, 30, from).map((p) => p.dateKey)).toEqual(['2026-01-05']);
  });

  it('não preenche lacuna: dia sem nenhuma leitura simplesmente não aparece', () => {
    const from = new Date('2026-01-10T12:00:00');
    const readings = [reading('2026-01-08T08:00:00', 120, 80), reading('2026-01-10T08:00:00', 118, 78)];

    const result = computeDailyTrend(readings, 7, from);

    expect(result.map((p) => p.dateKey)).toEqual(['2026-01-08', '2026-01-10']);
  });
});
