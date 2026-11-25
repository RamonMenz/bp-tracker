import { parsePhotoComparison } from './photo-comparison';
import { photoComparisonFixture } from './photo-comparison.test-fixture';

test('dois resultados distintos, sem escolher/mesclar e sem propagar texto bruto ou propriedades extras', () => {
  const raw = photoComparisonFixture();
  const result = parsePhotoComparison({ ...raw, image: 'SENTINELA', transformDiagnostic: { ...raw.transformDiagnostic, text: 'SENTINELA' } });
  expect(result.original.candidates.fields.systolic).toMatchObject({ status: 'candidate', value: 120 });
  expect(result.processed.candidates.fields.systolic).toMatchObject({ status: 'candidate', value: 130 });
  expect(JSON.stringify(result)).not.toMatch(/SENTINELA|tokens|confidence|coordinateSpace|bridgeDiagnostic/);
  expect(result.transform).toContain('buffers:limite-proprio=5760000; pixels-deste-par=3763200; sdk-nao-medido');
});

test('processado vazio permanece vazio mesmo quando original tem todos os campos', () => {
  const raw = photoComparisonFixture(); raw.processed.tokens = [];
  const result = parsePhotoComparison(raw);
  expect(result.original.candidates.fields.systolic.status).toBe('candidate');
  expect(result.processed.candidates.fields.systolic.status).toBe('missing');
});

test('timestamps diferentes ou caixas fora do ROI restaurado recusam o par inteiro', () => {
  const time = photoComparisonFixture(); time.processed.capturedAtMs++;
  expect(() => parsePhotoComparison(time)).toThrow('geometry-unavailable');
  const box = photoComparisonFixture(); box.processed.tokens[0].box.y = 0;
  expect(() => parsePhotoComparison(box)).toThrow('geometry-unavailable');
});

test.each([
  { revision: 'SENTINELA' }, { left: 81 }, { top: -2 }, { right: 2000 }, { bottom: 240 },
  { outputWidth: 1602 }, { outputHeight: 801 }, { ownedPixelBytes: 1 },
  { maxOwnedPixelBytes: 99999999 }, { rotation: 45 }, { sourceWidth: NaN },
  { sourceHeight: 99999999 }, { outputHeight: 400, ownedPixelBytes: 2803200 },
])('parâmetros inválidos ou fora da variante fixa são recusados: %s', fields => {
  const raw = photoComparisonFixture();
  expect(() => parsePhotoComparison({ ...raw, transformDiagnostic: { ...raw.transformDiagnostic, ...fields } })).toThrow('geometry-unavailable');
});

test.each([null, [], { kind: 'ocr' }, { ...photoComparisonFixture(), revision: 'SENTINELA' },
  { ...photoComparisonFixture(), processed: { text: 'SENTINELA' } },
])('contrato incorreto não vira comparação nem fallback de resultado: %s', value => {
  expect(() => parsePhotoComparison(value)).toThrow();
});
