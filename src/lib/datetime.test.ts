import { dayLabel, formatDayAndTime, formatShortDate } from './datetime';

describe('dayLabel', () => {
  const now = new Date(2026, 7, 13, 10, 0, 0); // 13/08/2026, uma quinta-feira

  it('rotula o mesmo dia local como "Hoje", inclusive à meia-noite e um segundo antes dela', () => {
    expect(dayLabel(new Date(2026, 7, 13, 0, 0, 0), now)).toBe('Hoje');
    expect(dayLabel(new Date(2026, 7, 13, 23, 59, 59), now)).toBe('Hoje');
  });

  it('rotula o dia anterior como "Ontem"', () => {
    expect(dayLabel(new Date(2026, 7, 12, 23, 59, 59), now)).toBe('Ontem');
    expect(dayLabel(new Date(2026, 7, 12, 0, 0, 0), now)).toBe('Ontem');
  });

  it('cai na data por extenso a partir de anteontem', () => {
    expect(dayLabel(new Date(2026, 7, 11, 12, 0, 0), now)).toBe('11 de agosto');
  });

  it('resolve "Ontem" atravessando a virada de mês', () => {
    const firstOfSeptember = new Date(2026, 8, 1, 9, 0, 0);
    expect(dayLabel(new Date(2026, 7, 31, 22, 0, 0), firstOfSeptember)).toBe('Ontem');
  });

  it('resolve "Ontem" atravessando a virada de ano', () => {
    const newYear = new Date(2027, 0, 1, 0, 30, 0);
    expect(dayLabel(new Date(2026, 11, 31, 23, 30, 0), newYear)).toBe('Ontem');
  });

  it('não confunde o mesmo dia de meses diferentes', () => {
    expect(dayLabel(new Date(2026, 6, 13, 10, 0, 0), now)).toBe('13 de julho');
  });
});

describe('formatDayAndTime', () => {
  it('junta o rótulo do dia com o horário local', () => {
    const now = new Date(2026, 7, 13, 20, 0, 0);
    expect(formatDayAndTime(new Date(2026, 7, 13, 8, 30, 0), now)).toBe('Hoje às 08:30');
  });
});

describe('formatShortDate', () => {
  it('formata só a data, sem hora, com zero à esquerda no dia e no mês', () => {
    expect(formatShortDate(new Date(2026, 6, 1, 23, 59, 0))).toBe('01/07/2026');
  });
});
