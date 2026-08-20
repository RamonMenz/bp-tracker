import { computeSessionAverage, type SessionReading } from './session-average';

describe('computeSessionAverage', () => {
  it('calcula a média exata quando a soma é par — sem necessidade de arredondamento', () => {
    const first: SessionReading = { systolic: 120, diastolic: 80, pulse: 70 };
    const second: SessionReading = { systolic: 130, diastolic: 90, pulse: 80 };

    expect(computeSessionAverage(first, second)).toEqual({
      systolic: 125,
      diastolic: 85,
      pulse: 75,
    });
  });

  it('arredonda a média de sistólica/diastólica com Math.round (120.5 → 121)', () => {
    const first: SessionReading = { systolic: 120, diastolic: 80, pulse: null };
    const second: SessionReading = { systolic: 121, diastolic: 81, pulse: null };

    const result = computeSessionAverage(first, second);

    expect(result.systolic).toBe(121);
    expect(result.diastolic).toBe(81);
  });

  it('calcula a média de pulso quando as duas medições têm pulso registrado', () => {
    const first: SessionReading = { systolic: 120, diastolic: 80, pulse: 70 };
    const second: SessionReading = { systolic: 120, diastolic: 80, pulse: 75 };

    expect(computeSessionAverage(first, second).pulse).toBe(73);
  });

  it('resulta em pulso null quando apenas a primeira medição tem pulso ausente', () => {
    const first: SessionReading = { systolic: 120, diastolic: 80, pulse: null };
    const second: SessionReading = { systolic: 120, diastolic: 80, pulse: 75 };

    expect(computeSessionAverage(first, second).pulse).toBeNull();
  });

  it('resulta em pulso null quando apenas a segunda medição tem pulso ausente', () => {
    const first: SessionReading = { systolic: 120, diastolic: 80, pulse: 70 };
    const second: SessionReading = { systolic: 120, diastolic: 80, pulse: null };

    expect(computeSessionAverage(first, second).pulse).toBeNull();
  });

  it('resulta em pulso null quando as duas medições têm pulso ausente', () => {
    const first: SessionReading = { systolic: 120, diastolic: 80, pulse: null };
    const second: SessionReading = { systolic: 120, diastolic: 80, pulse: null };

    expect(computeSessionAverage(first, second).pulse).toBeNull();
  });

  it('não depende da ordem dos argumentos — é uma média simples', () => {
    const first: SessionReading = { systolic: 120, diastolic: 80, pulse: 70 };
    const second: SessionReading = { systolic: 131, diastolic: 91, pulse: 81 };

    expect(computeSessionAverage(first, second)).toEqual(computeSessionAverage(second, first));
  });
});
