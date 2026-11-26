import { formatDateTimeInZone, formatOneDecimal, toWinAnsiText } from './report-format';

describe('formatOneDecimal', () => {
  it.each([
    [130, '130,0'],
    [70, '70,0'],
    [120.66666, '120,7'],
    [80.25, '80,3'],
    [99.94, '99,9'],
    [99.96, '100,0'],
  ])('%p -> %p', (value, expected) => {
    expect(formatOneDecimal(value)).toBe(expected);
  });
});

describe('formatDateTimeInZone', () => {
  it('usa o fuso informado, não o do processo', () => {
    const instant = new Date('2026-11-27T02:30:00.000Z');

    expect(formatDateTimeInZone(instant, 'America/Sao_Paulo')).toBe('26/11/2026 23:30');
    expect(formatDateTimeInZone(instant, 'Europe/Lisbon')).toBe('27/11/2026 02:30');
  });
});

describe('toWinAnsiText', () => {
  it('mantém os acentos do pt-BR e a pontuação tipográfica do CP1252', () => {
    const text = 'ação, coração, você, é, à, ü, ñ — “aspas” ‘simples’ … €';
    expect(toWinAnsiText(text)).toEqual({ text, replacedCount: 0 });
  });

  it('normaliza acentos decompostos (NFD) para um caractere só', () => {
    expect(toWinAnsiText('coração')).toEqual({ text: 'coração', replacedCount: 0 });
  });

  it('troca o que a fonte padrão não desenha por "?" e conta', () => {
    expect(toWinAnsiText('ok 😀 → 漢')).toEqual({ text: 'ok ? ? ?', replacedCount: 3 });
  });

  it('preserva quebra de linha, troca tab por espaço e descarta controles invisíveis', () => {
    expect(toWinAnsiText('a\r\nb\tc\u0007d')).toEqual({ text: 'a\nb cd', replacedCount: 0 });
  });
});
