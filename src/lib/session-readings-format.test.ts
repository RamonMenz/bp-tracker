import type { SessionReadings } from '@/types/models';

import { formatSessionReadings, formatSessionReadingsForSpeech } from './session-readings-format';

const WITH_PULSE: SessionReadings = [
  { systolic: 150, diastolic: 95, pulse: 72 },
  { systolic: 120, diastolic: 80, pulse: 70 },
];

describe('formatSessionReadings', () => {
  it('formata as duas leituras com o pulso entre parênteses', () => {
    expect(formatSessionReadings(WITH_PULSE)).toBe('150/95 (72) e 120/80 (70)');
  });

  it('omite os parênteses só da leitura sem pulso', () => {
    expect(
      formatSessionReadings([
        { systolic: 150, diastolic: 95, pulse: null },
        { systolic: 120, diastolic: 80, pulse: 70 },
      ]),
    ).toBe('150/95 e 120/80 (70)');
  });

  it('omite os parênteses das duas quando nenhuma tem pulso', () => {
    expect(
      formatSessionReadings([
        { systolic: 150, diastolic: 95, pulse: null },
        { systolic: 120, diastolic: 80, pulse: null },
      ]),
    ).toBe('150/95 e 120/80');
  });
});

describe('formatSessionReadingsForSpeech', () => {
  it('usa "por", nunca a barra', () => {
    const text = formatSessionReadingsForSpeech(WITH_PULSE);

    expect(text).toBe('150 por 95 e 120 por 80');
    expect(text).not.toContain('/');
  });
});
