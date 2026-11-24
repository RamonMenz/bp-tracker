import type { CandidateField } from '@/domain/assisted-entry';
import { interpretPhoto, parseOcr } from '@/domain/interpret-photo';

import { describePhotoInterpretation } from './photo-interpretation-diagnostic';

function describe(texts: string[]) {
  const observation = parseOcr({ kind: 'ocr', coordinateSpace: 'upright-frame', capturedAtMs: 1793001600000,
    tokens: texts.map(text => ({ text, confidence: null, box: { x: 0, y: 0, width: 1, height: 0.1 } })) });
  return describePhotoInterpretation(observation, interpretPhoto(observation));
}

test('distingue ausência de linhas utilizáveis de números sem associação, sem publicar números', () => {
  expect(describe([])).toEqual(['ocr:sem-linhas-utilizaveis', 'associacao:SYS=ausente',
    'associacao:DIA=ausente', 'associacao:PUL=ausente']);
  expect(describe(['   '])).toEqual(describe([]));
  expect(describe(['120', '80', '72'])).toEqual(['ocr:linhas-presentes',
    'associacao:SYS=incerto-numero-sem-rotulo', 'associacao:DIA=incerto-numero-sem-rotulo', 'associacao:PUL=incerto-numero-sem-rotulo']);
});

test('não reproduz OCR, valores, confiança, caixas, timestamp ou propriedades extras', () => {
  const observation = parseOcr({ kind: 'ocr', coordinateSpace: 'upright-frame', capturedAtMs: 1793001600000,
    tokens: [{ text: 'SENTINELA-CLINICA SYS 120 DIA 80', confidence: 0.873, box: { x: 0.123, y: 0, width: 0.3, height: 0.1 } }] });
  const candidates = interpretPhoto(observation);
  const report = JSON.stringify(describePhotoInterpretation(observation, candidates));
  expect(report).not.toMatch(/SENTINELA|120|80|1793001600000|0\.873|0\.123|confidence|capturedAtMs|text|box/);
  expect(describe(['SYS 120', 'DIA 80', 'PUL 72'])).toEqual(describe(['SYS 170', 'DIA 100', 'PUL 60']));
});

test.each([
  ['SYS', 'incerto-ilegivel-ou-distante'],
  ['SYS 120 130', 'incerto-rotulo-ambiguo'],
  ['SYS 16 kPa', 'incerto-escala'],
])('apresenta somente motivo fixo de incerteza: %s', (text, expected) => {
  expect(describe([text])).toContain(`associacao:SYS=${expected}`);
});

test('motivo desconhecido não passa pela projeção nem se contém texto sensível', () => {
  const observation = parseOcr({ kind: 'ocr', coordinateSpace: 'upright-frame', capturedAtMs: 0, tokens: [] });
  const candidates = interpretPhoto(observation);
  // Viola deliberadamente o tipo para verificar a whitelist em runtime.
  const forged = { status: 'uncertain', reason: 'SENTINELA 120/80' } as unknown as CandidateField;
  const report = describePhotoInterpretation(observation, { ...candidates, fields: { ...candidates.fields, systolic: forged } });
  expect(report[1]).toBe('associacao:SYS=indefinido');
  expect(report.join(' ')).not.toMatch(/SENTINELA|120|80/);
});
