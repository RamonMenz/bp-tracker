import { CONTINUATION_MARK, CONTINUES_MARK, splitDetailLines, wrapTextByChars } from './report-table';

function lines(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `linha ${index + 1}`);
}

describe('splitDetailLines', () => {
  it('texto curto fica num bloco só, sem marcas', () => {
    expect(splitDetailLines(lines(3), 8)).toEqual([lines(3)]);
  });

  it('texto longo vira blocos com "(continua)" / "(continuação)", sem perder nem repetir linhas', () => {
    const source = lines(20);
    const chunks = splitDetailLines(source, 8);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk, index) => {
      expect(chunk.length).toBeLessThanOrEqual(8);
      expect(chunk[0] === CONTINUATION_MARK).toBe(index > 0);
      expect(chunk[chunk.length - 1] === CONTINUES_MARK).toBe(index < chunks.length - 1);
    });

    const content = chunks.flat().filter((line) => line !== CONTINUATION_MARK && line !== CONTINUES_MARK);
    expect(content).toEqual(source);
  });

  it('exatamente no limite não marca continuidade', () => {
    expect(splitDetailLines(lines(8), 8)).toEqual([lines(8)]);
  });

  it('recusa limite que não comporta as marcas', () => {
    expect(() => splitDetailLines(lines(10), 2)).toThrow();
  });
});

describe('wrapTextByChars', () => {
  it('quebra nos espaços sem passar do limite e preserva os parágrafos', () => {
    expect(wrapTextByChars('uma duas três quatro\ncinco', 9)).toEqual(['uma duas', 'três', 'quatro', 'cinco']);
  });

  it('corta palavra maior que a linha (ex.: URL) sem perder caracteres', () => {
    const url = 'https://exemplo.invalido/caminho-muito-longo';
    const wrapped = wrapTextByChars(`ver ${url}`, 10);

    expect(wrapped.every((line) => line.length <= 10)).toBe(true);
    expect(wrapped.join('')).toBe(`ver${url}`);
  });

  it('parágrafo vazio continua ocupando uma linha', () => {
    expect(wrapTextByChars('a\n\nb', 5)).toEqual(['a', '', 'b']);
  });

  it('recusa limite não positivo', () => {
    expect(() => wrapTextByChars('a', 0)).toThrow();
  });
});
