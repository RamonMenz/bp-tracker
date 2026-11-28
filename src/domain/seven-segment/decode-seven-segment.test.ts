// Testes com visores 100% sintéticos. A saída idêntica à referência Python foi verificada fora do
// repositório nas fotos de laboratório (docs/fotografia-lab.md §13); nenhuma foto entra aqui.
import { decodeSevenSegment, toCandidateSet } from './decode-seven-segment';
import { blankLcd, darken, drawDigit, fieldGeometry, HEIGHT, paint, slotX, syntheticDisplay, WIDTH } from './synthetic-display.test-fixture';

const candidate = (value: number) => ({ status: 'candidate', value });

describe('decodeSevenSegment (candidato não habilitado)', () => {
  test.each(['gtech', 'generic'] as const)('decodifica 0–9 nos três campos do gabarito %s', device => {
    for (let d = 0; d <= 9; d++) {
      const fields = decodeSevenSegment(syntheticDisplay(device, [`1${d}${d}`, `8${d}`, `6${d}`]), device);
      expect(fields).toEqual({ systolic: candidate(100 + 11 * d), diastolic: candidate(80 + d), pulse: candidate(60 + d) });
    }
  });

  test('dígitos itálicos são endireitados antes da leitura', () => {
    expect(decodeSevenSegment(syntheticDisplay('gtech', ['147', '95', '72'], 0.12), 'gtech'))
      .toEqual({ systolic: candidate(147), diastolic: candidate(95), pulse: candidate(72) });
  });

  test('sombra suave sobre parte do visor não impede a leitura', () => {
    const shade = (x: number, y: number) => 200 - (x < 220 && y > 200 ? 90 : 0) * Math.min(1, (220 - x) / 60);
    expect(decodeSevenSegment(syntheticDisplay('gtech', ['132', '84', '70'], 0, shade), 'gtech'))
      .toEqual({ systolic: candidate(132), diastolic: candidate(84), pulse: candidate(70) });
  });

  test('visor apagado: nenhum candidato, motivo explícito', () => {
    const fields = decodeSevenSegment(blankLcd(HEIGHT.gtech), 'gtech');
    for (const field of Object.values(fields)) expect(field).toEqual({ status: 'uncertain', reason: 'visor-sem-digitos' });
  });

  test('"1" de centena parcialmente apagado deixa o campo vazio, nunca vira número de 2 dígitos', () => {
    const image = syntheticDisplay('gtech', ['38', '84', '70']);
    const { top, height } = fieldGeometry('gtech', 0);
    drawDigit(image, ['b'], slotX(height)(2), top, height);
    const fields = decodeSevenSegment(image, 'gtech');
    expect(fields.systolic.status).toBe('uncertain');
    expect(fields.diastolic).toEqual(candidate(84));
  });

  test('"1" de centena encoberto por reflexo saturado deixa o campo vazio', () => {
    const image = syntheticDisplay('gtech', ['138', '84', '70']);
    const { top, height } = fieldGeometry('gtech', 0);
    // Reflexo cobrindo toda a posição da centena: o "1" some, sobram dois dígitos legíveis.
    paint(image, slotX(height)(2) - 4, top - 4, 0.5 * height + 8, height + 8, 255);
    expect(decodeSevenSegment(image, 'gtech').systolic).toEqual({ status: 'uncertain', reason: 'centena-encoberta' });
  });

  test('"7" com a barra superior separada e fora da faixa do gabarito não vira "1"', () => {
    // SIS "117" desenhado no layout BSPII, com a barra "a" do "7" separada de b (como no aparelho real).
    const image = syntheticDisplay('gtech', ['', '80', '70']);
    const { top, height } = fieldGeometry('gtech', 0);
    drawDigit(image, ['b', 'c'], slotX(height)(2), top, height);
    drawDigit(image, ['b', 'c'], slotX(height)(1), top, height);
    drawDigit(image, ['b', 'c'], slotX(height)(0), top + 0.06 * height, 0.94 * height);
    darken(image, slotX(height)(0) + 0.045 * height, top - 0.02 * height, 0.41 * height, 0.09 * height);
    expect(decodeSevenSegment(image, 'gtech').systolic).toEqual(candidate(117));
    // Com o modelo trocado, a barra cai fora da faixa do SIS: o campo fica vazio em vez de "111".
    expect(decodeSevenSegment(image, 'generic').systolic).toEqual({ status: 'uncertain', reason: 'um-ou-sete' });
  });

  test('mancha no meio de um dígito torna a varredura discordante e o campo vazio', () => {
    const image = syntheticDisplay('gtech', ['120', '80', '72']);
    const { top, height } = fieldGeometry('gtech', 0);
    darken(image, slotX(height)(0) + 0.2 * height, top + 0.3 * height, 0.1 * height, 0.08 * height);
    expect(decodeSevenSegment(image, 'gtech').systolic.status).toBe('uncertain');
  });

  test('zero à esquerda e quantidade inválida de dígitos não viram candidatos', () => {
    const fields = decodeSevenSegment(syntheticDisplay('gtech', ['05', '8', '123']), 'gtech');
    expect(fields.systolic.status).toBe('uncertain');
    expect(fields.diastolic.status).toBe('uncertain');
    expect(fields.pulse).toEqual(candidate(123));
  });

  test('não modifica a imagem de entrada', () => {
    const image = syntheticDisplay('generic', ['121', '79', '64']);
    const copy = Uint8Array.from(image.data);
    decodeSevenSegment(image, 'generic');
    expect(image.data).toEqual(copy);
    expect(image.width).toBe(WIDTH);
  });

  test('toCandidateSet: valor vira candidato por layout; dúvida vira campo ilegível (vazio na revisão)', () => {
    const set = toCandidateSet({ systolic: { status: 'candidate', value: 120 }, diastolic: { status: 'uncertain', reason: 'varredura' },
      pulse: { status: 'uncertain', reason: 'visor-sem-digitos' } }, 1793001600000);
    expect(set).toEqual({ modality: 'photo', capturedAtMs: 1793001600000, fields: {
      systolic: { status: 'candidate', value: 120, basis: 'layout' },
      diastolic: { status: 'uncertain', reason: 'unreadable' },
      pulse: { status: 'uncertain', reason: 'unreadable' } } });
  });
});
