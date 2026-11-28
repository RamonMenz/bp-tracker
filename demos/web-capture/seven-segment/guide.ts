// DEMO EXPERIMENTAL — leitor de sete segmentos (candidato NÃO habilitado no app). Pixels só em memória.
import type { GrayImage, SevenSegmentDevice } from '@/domain/seven-segment/decode-seven-segment';

/** Largura do LCD retificado entregue ao decodificador (a mesma das fotos de laboratório). */
export const LCD_WIDTH = 400;
/** Proporção altura/largura do LCD por modelo (medida nas fotos de laboratório). */
export const LCD_ASPECT: Record<SevenSegmentDevice, number> = { gtech: 1.35, generic: 1.3 };

export interface Rect { x: number; y: number; width: number; height: number }

/** Guia centralizada, com a proporção do LCD do modelo, em pixels do quadro da câmera. */
export function guideRect(frameWidth: number, frameHeight: number, device: SevenSegmentDevice): Rect {
  let width = 0.5 * frameWidth;
  let height = width * LCD_ASPECT[device];
  if (height > 0.9 * frameHeight) {
    height = 0.9 * frameHeight;
    width = height / LCD_ASPECT[device];
  }
  return { x: (frameWidth - width) / 2, y: (frameHeight - height) / 2, width, height };
}

/** Tons de cinza (pesos BT.601) a partir de RGBA, sem reter o buffer original. */
export function toGray(rgba: Uint8ClampedArray, width: number, height: number): GrayImage {
  const data = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.round(0.299 * rgba[4 * i] + 0.587 * rgba[4 * i + 1] + 0.114 * rgba[4 * i + 2]);
  }
  return { width, height, data };
}

/** Recorta a área da guia de uma fonte desenhável, já retificada para LCD_WIDTH, e zera o canvas. */
export function cropToGray(source: CanvasImageSource, area: Rect, canvas: HTMLCanvasElement): GrayImage {
  const height = Math.round(LCD_WIDTH * area.height / area.width);
  canvas.width = LCD_WIDTH;
  canvas.height = height;
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('frame-failed');
    context.drawImage(source, area.x, area.y, area.width, area.height, 0, 0, LCD_WIDTH, height);
    const pixels = context.getImageData(0, 0, LCD_WIDTH, height);
    const gray = toGray(pixels.data, LCD_WIDTH, height);
    pixels.data.fill(0);
    return gray;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

const SEGMENTS: Record<string, string> = {
  0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
};
const ROWS: Record<SevenSegmentDevice, [number, number][]> = {
  gtech: [[0.05, 0.3], [0.44, 0.3], [0.78, 0.19]],
  generic: [[0.14, 0.26], [0.47, 0.25], [0.79, 0.18]],
};

/** Desenha um LCD de sete segmentos SINTÉTICO (valores inventados) ocupando `area` do contexto. */
export function drawSyntheticLcd(context: CanvasRenderingContext2D, area: Rect, device: SevenSegmentDevice,
  values: [string, string, string]) {
  const sx = area.width / LCD_WIDTH;
  const lcdHeight = LCD_WIDTH * LCD_ASPECT[device];
  const sy = area.height / lcdHeight;
  context.fillStyle = 'rgb(190,196,186)';
  context.fillRect(area.x, area.y, area.width, area.height);
  context.fillStyle = 'rgb(48,52,48)';
  const rect = (x: number, y: number, w: number, h: number) => context.fillRect(area.x + x * sx, area.y + y * sy, w * sx, h * sy);
  values.forEach((value, row) => {
    const [top, size] = ROWS[device][row];
    const h = size * lcdHeight;
    const w = 0.5 * h, t = 0.09 * h, gap = 2, half = h / 2, length = half - t / 2 - 2 * gap;
    [...value].reverse().forEach((ch, k) => {
      const x = 0.95 * LCD_WIDTH - (k + 1) * 0.62 * h;
      const y = top * lcdHeight;
      const boxes: Record<string, [number, number, number, number]> = {
        a: [x + t / 2, y, w - t, t], g: [x + t / 2, y + half - t / 2, w - t, t], d: [x + t / 2, y + h - t, w - t, t],
        f: [x, y + t / 2 + gap, t, length], b: [x + w - t, y + t / 2 + gap, t, length],
        e: [x, y + half + gap, t, length], c: [x + w - t, y + half + gap, t, length],
      };
      for (const segment of SEGMENTS[ch]) rect(...boxes[segment]);
    });
  });
}
