// Visores de sete segmentos 100% SINTÉTICOS, desenhados por código para os testes. Nenhuma foto real.
import type { GrayImage, SevenSegmentDevice } from './decode-seven-segment';

export const WIDTH = 400;
export const HEIGHT: Record<SevenSegmentDevice, number> = { gtech: 540, generic: 520 };
type Segment = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';
const DIGITS: Record<string, Segment[]> = {
  0: ['a', 'b', 'c', 'd', 'e', 'f'], 1: ['b', 'c'], 2: ['a', 'b', 'd', 'e', 'g'], 3: ['a', 'b', 'c', 'd', 'g'],
  4: ['b', 'c', 'f', 'g'], 5: ['a', 'c', 'd', 'f', 'g'], 6: ['a', 'c', 'd', 'e', 'f', 'g'], 7: ['a', 'b', 'c'],
  8: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], 9: ['a', 'b', 'c', 'd', 'f', 'g'],
};
/** Linha superior e altura de cada campo, em frações do LCD, por modelo. */
const ROWS: Record<SevenSegmentDevice, [number, number][]> = {
  gtech: [[0.05, 0.3], [0.44, 0.3], [0.78, 0.19]],
  generic: [[0.14, 0.26], [0.47, 0.25], [0.79, 0.18]],
};

export function blankLcd(height: number, shade = (x: number, y: number) => 170 + 50 * (x / WIDTH) - 20 * (y / height)): GrayImage {
  const data = new Uint8Array(WIDTH * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < WIDTH; x++) data[y * WIDTH + x] = shade(x, y);
  return { width: WIDTH, height, data };
}

/** Escurece um retângulo (inclinado por `slant`), como um segmento aceso. */
export function darken(image: GrayImage, x: number, y: number, w: number, h: number, slant = 0) {
  for (let r = Math.round(y); r < Math.round(y + h); r++) {
    const offset = Math.round(slant * (y + h / 2 - r));
    for (let c = Math.round(x); c < Math.round(x + w); c++) {
      const cx = c + offset;
      if (cx >= 0 && cx < WIDTH && r >= 0 && r < image.height) image.data[r * WIDTH + cx] = Math.round(image.data[r * WIDTH + cx] * 0.25);
    }
  }
}

/** Preenche um retângulo com um valor fixo (reflexo saturado = 255). */
export function paint(image: GrayImage, x: number, y: number, w: number, h: number, value: number) {
  for (let r = Math.round(y); r < Math.round(y + h); r++) {
    for (let c = Math.round(x); c < Math.round(x + w); c++) if (c >= 0 && c < WIDTH && r >= 0 && r < image.height) image.data[r * WIDTH + c] = value;
  }
}

/** Proporções dos visores reais: largura ≈ 0,5h, traço ≈ 0,09h, verticais quase da altura toda. */
export function drawDigit(image: GrayImage, segments: Segment[], x: number, y: number, h: number, slant = 0) {
  const w = 0.5 * h;
  const t = 0.09 * h;
  const gap = 2;
  const half = h / 2;
  const length = half - t / 2 - 2 * gap;
  const boxes: Record<Segment, [number, number, number, number]> = {
    a: [x + t / 2, y, w - t, t], g: [x + t / 2, y + half - t / 2, w - t, t], d: [x + t / 2, y + h - t, w - t, t],
    f: [x, y + t / 2 + gap, t, length], b: [x + w - t, y + t / 2 + gap, t, length],
    e: [x, y + half + gap, t, length], c: [x + w - t, y + half + gap, t, length],
  };
  for (const s of segments) darken(image, ...boxes[s], slant);
}

export const PITCH = 0.62;
/** Posição x do dígito `indexFromRight` (0 = unidade) de um campo alinhado à direita. */
export function slotX(height: number) { return (indexFromRight: number) => 0.95 * WIDTH - (indexFromRight + 1) * PITCH * height; }

export function syntheticDisplay(device: SevenSegmentDevice, values: [string, string, string], slant = 0,
  shade?: (x: number, y: number) => number): GrayImage {
  const image = blankLcd(HEIGHT[device], shade);
  values.forEach((value, i) => {
    const [top, size] = ROWS[device][i];
    const h = size * HEIGHT[device];
    [...value].reverse().forEach((ch, k) => drawDigit(image, DIGITS[ch], slotX(h)(k), top * HEIGHT[device], h, slant));
  });
  return image;
}

export function fieldGeometry(device: SevenSegmentDevice, index: number) {
  const [top, size] = ROWS[device][index];
  return { top: top * HEIGHT[device], height: size * HEIGHT[device] };
}
