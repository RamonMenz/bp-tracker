// LABORATÓRIO — desenho de visores de sete segmentos 100% sintéticos para verificar o H-seg.
import type { DeviceTemplate, GrayImage } from './hseg.ts';

export const W = 400;
type Segment = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';
const DIGITS: Record<string, Segment[]> = {
  0: ['a', 'b', 'c', 'd', 'e', 'f'], 1: ['b', 'c'], 2: ['a', 'b', 'd', 'e', 'g'], 3: ['a', 'b', 'c', 'd', 'g'],
  4: ['b', 'c', 'f', 'g'], 5: ['a', 'c', 'd', 'f', 'g'], 6: ['a', 'c', 'd', 'e', 'f', 'g'], 7: ['a', 'b', 'c'],
  8: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], 9: ['a', 'b', 'c', 'd', 'f', 'g'],
};

/** LCD claro com iluminação em gradiente; dígitos escuros com pequenos vãos entre segmentos. */
export function lcd(height: number, shade = (x: number, y: number) => 170 + 50 * (x / W) - 20 * (y / height)): GrayImage {
  const data = new Uint8Array(W * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < W; x++) data[y * W + x] = shade(x, y);
  return { width: W, height, data };
}
export function rect(image: GrayImage, x: number, y: number, w: number, h: number, slant = 0) {
  for (let r = Math.round(y); r < Math.round(y + h); r++) {
    const offset = Math.round(slant * (y + h / 2 - r));
    for (let c = Math.round(x); c < Math.round(x + w); c++) {
      const cx = c + offset;
      if (cx >= 0 && cx < W && r >= 0 && r < image.height) image.data[r * W + cx] = Math.round(image.data[r * W + cx] * 0.25);
    }
  }
}
export function drawDigit(image: GrayImage, segments: Segment[], x: number, y: number, h: number, slant = 0) {
  // Proporções medidas nos visores reais: largura ≈ 0,5h, traço ≈ 0,09h, verticais quase da altura
  // toda, pontas dos horizontais avançando sobre os verticais em x, vãos de 2 px.
  const w = 0.5 * h, t = 0.09 * h, gap = 2, half = h / 2, length = half - t / 2 - 2 * gap;
  const boxes: Record<Segment, [number, number, number, number]> = {
    a: [x + t / 2, y, w - t, t], g: [x + t / 2, y + half - t / 2, w - t, t], d: [x + t / 2, y + h - t, w - t, t],
    f: [x, y + t / 2 + gap, t, length], b: [x + w - t, y + t / 2 + gap, t, length],
    e: [x, y + half + gap, t, length], c: [x + w - t, y + half + gap, t, length],
  };
  for (const s of segments) rect(image, ...boxes[s], slant);
}
/** Escreve um número alinhado à direita, em posições fixas como no visor. */
function drawNumber(image: GrayImage, text: string, right: number, top: number, h: number, slant = 0) {
  const pitch = 0.62 * h;
  [...text].reverse().forEach((ch, i) => drawDigit(image, DIGITS[ch], right - (i + 1) * pitch, top, h, slant));
}
export const H = { gtech: 540, generic: 520 } as const;
const ROWS: Record<DeviceTemplate, [number, number][]> = {
  gtech: [[0.05, 0.3], [0.44, 0.3], [0.78, 0.19]],
  generic: [[0.14, 0.26], [0.47, 0.25], [0.79, 0.18]],
};
export function display(device: DeviceTemplate, values: [string, string, string], slant = 0, shade?: (x: number, y: number) => number) {
  const image = lcd(H[device], shade);
  values.forEach((value, i) => {
    const [top, size] = ROWS[device][i];
    drawNumber(image, value, 0.95 * W, top * H[device], size * H[device], slant);
  });
  return image;
}
