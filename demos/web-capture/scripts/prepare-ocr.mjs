// Copia somente programa/modelo estáticos. Nunca recebe capturas ou transcrições.
import { createRequire } from 'node:module';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const require = createRequire(new URL('../ocr-assets/package.json', import.meta.url));
for (const [name, version] of [['tesseract.js','7.0.0'], ['tesseract.js-core','7.0.0'], ['@tesseract.js-data/eng','1.0.0']]) {
  if (require(name + '/package.json').version !== version) throw new Error('ocr-asset-version-mismatch');
}
const destination = resolve(import.meta.dirname, '../public/ocr');
await mkdir(destination, { recursive: true });
const sources = [
  [require.resolve('tesseract.js/dist/worker.min.js'), 'worker.min.js'],
  [resolve(import.meta.dirname, 'safe-worker.js'), 'safe-worker.js'],
  [require.resolve('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'), 'eng.traineddata.gz'],
  [require.resolve('tesseract.js/LICENSE.md'), 'LICENSE-tesseract.js.txt'],
  [require.resolve('tesseract.js-core/LICENSE'), 'LICENSE-tesseract-core.txt'],
];
const core = dirname(require.resolve('tesseract.js-core/package.json'));
for (const stem of ['tesseract-core-lstm', 'tesseract-core-simd-lstm', 'tesseract-core-relaxedsimd-lstm']) {
  for (const extension of ['.wasm', '.wasm.js']) sources.push([join(core, stem + extension), stem + extension]);
}
const manifest = [];
for (const [source, filename] of sources) {
  await copyFile(source, join(destination, filename));
  const bytes = await readFile(source);
  manifest.push({ filename, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
await writeFile(join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
process.stdout.write('Assets estáticos OCR preparados em demos/web-capture/public/ocr; nenhum dado de captura.\n');
