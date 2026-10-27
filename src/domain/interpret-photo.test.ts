import type { OcrObservation } from './assisted-entry';
import { PHOTO_INTERPRETATION_EXAMPLES as examples, photoLine, photoObservation } from '@/features/assisted-entry/photo-interpretation-examples';
import { interpretPhoto, parseOcr } from './interpret-photo';

function observation(texts: string[]) {
  return { kind: 'ocr', capturedAtMs: 1793001600000, coordinateSpace: 'upright-frame',
    tokens: texts.map(text => ({ text, confidence: null, box: { x: 0, y: 0, width: 1, height: 0.1 } })) };
}
const c = (value: number, basis: 'label' | 'layout' = 'label') => ({ status: 'candidate', value, basis });
const u = (reason: string) => ({ status: 'uncertain', reason });
const missing = { status: 'missing' };
const parse = (texts: string[]) => interpretPhoto(parseOcr(observation(texts))).fields;

test.each([
  ['SYS 120', 'DIA 80', 'PUL 72'],
  ['SIS 120', 'DIA 80', 'PULSO 72 bpm'],
  ['Sistólica: 120 mmHg', 'Diastólica: 80 mmHg', '72 BPM'],
  ['Systolic 120', 'Diastolic 80', 'PR 72'],
  ['SYS120mmHg', 'DIA80mmHg', 'PULSE72'],
  ['120 SYS', '80 DIA', '72 PUL'],
  ['SYS 120 DIA 80 PUL 72'],
  ['120 SYS 80 DIA 72 PUL'],
])('identifica rótulos completos/abreviados sem depender da confiança: %s', (...texts) => {
  expect(parse(texts)).toEqual({ systolic: c(120), diastolic: c(80), pulse: c(72) });
});
test.each([
  ['12:30', '27/10/2026', 'M 99'],
  ['2026-10-27', 'USER 2', 'MEM 88'],
  ['SYS 120 12:30', 'DIA 80 M 99', 'PUL 72 27.10.2026'],
])('acessórios identificados não viram pressão ou pulso: %s', (...accessories) => {
  const texts = accessories.some(text => text.includes('SYS')) ? accessories : ['SYS 120', 'DIA 80', ...accessories];
  const fields = parse(texts);
  expect(fields.systolic).toEqual(c(120)); expect(fields.diastolic).toEqual(c(80));
  expect(fields.pulse).toEqual(texts.some(text => text.includes('PUL')) ? c(72) : missing);
});
test.each(['SYS 12O', 'SYS O20', 'SYS 12.0', 'SYS 12,0', 'SYS -120', 'SYS +120', 'SYS 120/80'])('não corrige dígitos/escala/separadores: %s', text => {
  expect(parse([text]).systolic.status).toBe('uncertain');
});
test.each(['SYS 120 SYS 120', 'SYS 120 SYS 130', 'SYS 120 130'])('não escolhe entre leituras repetidas: %s', text => {
  expect(parse([text]).systolic).toEqual(u('ambiguous-label'));
});
test('conserva candidatos fora da faixa e par invertido para validação da revisão', () => {
  expect(parse(['SYS 40', 'DIA 400', 'PUL 19'])).toEqual({ systolic: c(40), diastolic: c(400), pulse: c(19) });
  expect(parse(['SYS 80', 'DIA 120'])).toEqual({ systolic: c(80), diastolic: c(120), pulse: missing });
});
test('kPa explícito impede tratar inteiros como mmHg; não converte nem escala por dez', () => {
  expect(parse(['SYS 16', 'DIA 10', 'kPa', 'PUL 72'])).toEqual({ systolic: u('mixed-scale'), diastolic: u('mixed-scale'), pulse: c(72) });
});
test('resultado vazio, rótulo ilegível e campo ausente permanecem distintos', () => {
  expect(parse([])).toEqual({ systolic: missing, diastolic: missing, pulse: missing });
  expect(parse(['SYS', 'DIA 80'])).toEqual({ systolic: u('unreadable'), diastolic: c(80), pulse: missing });
});
test.each([null, { ...observation([]), capturedAtMs: 1e20 }, { ...observation([]), tokens: Array(501).fill({}) },
  { ...observation([]), tokens: [{ text: 'SENTINELA', confidence: null, box: { x: 0.9, y: 0, width: 0.5, height: 1 } }] },
])('recusa saída desconhecida sem reproduzir conteúdo clínico', value => {
  expect(() => parseOcr(value)).toThrow('malformed-output');
});

test('linhas separadas de ML Kit/Tesseract associadas por layout ancorado, independente da ordem do array', () => {
  const observation = examples.layout;
  const result = interpretPhoto(observation);
  expect(result.fields).toEqual({ systolic: c(120, 'layout'), diastolic: c(80, 'layout'), pulse: c(72, 'layout') });
  expect(result.capturedAtMs).toBe(observation.capturedAtMs);
  expect(interpretPhoto({ ...observation, tokens: [...observation.tokens].reverse() })).toEqual(result);
});
test('valor à esquerda do rótulo na mesma linha', () => {
  expect(interpretPhoto(photoObservation([photoLine('120', 0.1, 0.2, 0.2), photoLine('SYS', 0.5, 0.2, 0.12)])).fields.systolic).toEqual(c(120, 'layout'));
});
test('rótulos acima dos valores em colunas separadas, sem emprestar por ordem textual', () => {
  const tokens = [photoLine('SYS', 0.1, 0.1, 0.12), photoLine('DIA', 0.45, 0.1, 0.12), photoLine('PUL', 0.8, 0.1, 0.12),
    photoLine('72', 0.8, 0.25, 0.12), photoLine('120', 0.1, 0.25, 0.12), photoLine('80', 0.45, 0.25, 0.12)];
  expect(interpretPhoto(photoObservation(tokens)).fields).toEqual({ systolic: c(120, 'layout'), diastolic: c(80, 'layout'), pulse: c(72, 'layout') });
});
test('duas opções no mesmo rótulo ficam vazias; não escolhe mais próximo/maior/confiante', () => {
  const tokens = [photoLine('SYS', 0.1, 0.2, 0.1), photoLine('120', 0.3, 0.2, 0.1),
    { ...photoLine('130', 0.5, 0.2, 0.1), confidence: 1 }];
  expect(interpretPhoto(photoObservation(tokens)).fields.systolic).toEqual(u('ambiguous-label'));
});
test('um número compatível com dois rótulos não é duplicado entre os campos', () => {
  const tokens = [photoLine('SYS', 0.1, 0.2, 0.12), photoLine('DIA', 0.65, 0.2, 0.12), photoLine('120', 0.4, 0.2, 0.15)];
  expect(interpretPhoto(photoObservation(tokens)).fields).toMatchObject({ systolic: u('ambiguous-label'), diastolic: u('ambiguous-label') });
});
test('opções lateral e abaixo simultâneas são ambíguas, sem preferência silenciosa pelo layout', () => {
  const tokens = [photoLine('SYS', 0.1, 0.2, 0.12), photoLine('120', 0.4, 0.2, 0.2), photoLine('130', 0.1, 0.37, 0.12)];
  expect(interpretPhoto(photoObservation(tokens)).fields.systolic).toEqual(u('ambiguous-label'));
});
test('valor da linha DIA não preenche SYS cujo número não foi reconhecido', () => {
  const tokens = [photoLine('SYS', 0.1, 0.1, 0.12), photoLine('DIA', 0.1, 0.27, 0.12), photoLine('80', 0.4, 0.27, 0.2)];
  expect(interpretPhoto(photoObservation(tokens)).fields).toEqual({ systolic: u('unreadable'), diastolic: c(80, 'layout'), pulse: missing });
});
test('número distante, caixa sem área e coluna sem rótulo não autorizam associação', () => {
  const far = photoObservation([photoLine('SYS', 0, 0, 0.1), photoLine('120', 0.8, 0.8, 0.1)]);
  expect(interpretPhoto(far).fields.systolic).toEqual(u('unreadable'));
  expect(interpretPhoto(photoObservation([photoLine('SYS', 0.1, 0.1, 0), photoLine('120')])).fields.systolic.status).toBe('uncertain');
  expect(interpretPhoto(examples.unidentified).fields).toEqual({ systolic: u('unidentified-number'), diastolic: u('unidentified-number'), pulse: u('unidentified-number') });
});
test('pulso não identificado não é preenchido a partir de um terceiro número', () => {
  expect(parse(['SYS 120', 'DIA 80', '72'])).toEqual({ systolic: c(120), diastolic: c(80), pulse: u('unidentified-number') });
});
test('acessórios com caixas próximas são excluídos antes da associação espacial', () => {
  const tokens = [...examples.layout.tokens, photoLine('M 99', 0.3, 0.15, 0.1), photoLine('12:30', 0.7, 0.15, 0.1)];
  expect(interpretPhoto(photoObservation(tokens))).toEqual(interpretPhoto(examples.layout));
});
test('rótulo de memória separado identifica acessório e não pressão/pulso pela ordem', () => {
  const tokens = [photoLine('M', 0.1, 0.1, 0.1), photoLine('99', 0.3, 0.1, 0.1), photoLine('SYS 120', 0.1, 0.5)];
  expect(interpretPhoto(photoObservation(tokens)).fields).toEqual({ systolic: c(120), diastolic: missing, pulse: missing });
});
test('número disputado entre rótulo clínico e acessório fica incerto', () => {
  const tokens = [photoLine('SYS', 0.1, 0.2, 0.12), photoLine('M', 0.65, 0.2, 0.12), photoLine('99', 0.4, 0.2, 0.15)];
  expect(interpretPhoto(photoObservation(tokens)).fields.systolic).toEqual(u('ambiguous-label'));
});
test('não modifica entrada, nem usa confiança como aprovação dos valores', () => {
  const original: OcrObservation = structuredClone(examples.layout);
  const snapshot = structuredClone(original);
  expect(interpretPhoto({ ...original, tokens: original.tokens.map(token => ({ ...token, confidence: 0 })) })).toEqual(interpretPhoto(original));
  expect(original).toEqual(snapshot);
});
