import assert from 'node:assert/strict';

import type { CandidateField } from './assisted-entry';
import { interpretVoice } from './interpret-voice-pt-br';

// Dados exclusivamente sintéticos; sem reconhecedor, mídia ou Firebase.
const timestamp = 1793001600000;
const transcript = (text: string) => ({ kind: 'transcript', final: true, locale: 'pt-BR', capturedAtMs: timestamp, text } as const);
const parse = (text: string) => interpretVoice(transcript(text));
const candidate = (value: number, basis: Extract<CandidateField, { status: 'candidate' }>['basis'] = 'explicit-phrase') => ({ status: 'candidate', value, basis });
const missing = { status: 'missing' };
const uncertain = (reason: Extract<CandidateField, { status: 'uncertain' }>['reason']) => ({ status: 'uncertain', reason });

for (const [text, sys, dia, basis] of [
  ['doze por oito', 120, 80, 'colloquial-pair'],
  ['12 por 8', 120, 80, 'colloquial-pair'],
  ['cento e vinte por oitenta', 120, 80, 'explicit-phrase'],
  ['120 por 80', 120, 80, 'explicit-phrase'],
  ['treze por nove', 130, 90, 'colloquial-pair'],
  ['treze vírgula cinco por oito vírgula cinco', 135, 85, 'colloquial-pair'],
  ['13,5 por 8,5', 135, 85, 'colloquial-pair'],
  ['13.7/8.3', 137, 83, 'colloquial-pair'],
  [' TREZE VÍRGULA ZERO POR OITO! ', 130, 80, 'colloquial-pair'],
  ['Minha pressão está 120 por 80 mmHg.', 120, 80, 'explicit-phrase'],
  ['80 por 120', 80, 120, 'explicit-phrase'],
  ['400 por 250', 400, 250, 'explicit-phrase'],
  ['cem por sessenta', 100, 60, 'explicit-phrase'],
  ['duzentos e um por cento e dois', 201, 102, 'explicit-phrase'],
  ['catorze por nove', 140, 90, 'colloquial-pair'],
] as const) test(`par: ${text}`, () => {
  assert.deepEqual(parse(text), { modality: 'voice', capturedAtMs: timestamp,
    fields: { systolic: candidate(sys, basis), diastolic: candidate(dia, basis), pulse: missing } });
});

for (const text of ['120 por 80, pulso setenta e dois', 'pulso 72, 120 por 80']) {
  test(`pulso rotulado: ${text}`, () => assert.deepEqual(parse(text).fields, {
    systolic: candidate(120), diastolic: candidate(80), pulse: candidate(72, 'label'),
  }));
}
test('rótulos em ordem invertida; pulso não recebe escala', () => {
  assert.deepEqual(parse('diastólica oitenta; sistólica cento e vinte; pulso oito').fields, {
    systolic: candidate(120, 'label'), diastolic: candidate(80, 'label'), pulse: candidate(8, 'label'),
  });
});
test('somente pulso e somente sistólica', () => {
  assert.deepEqual(parse('pulso setenta e dois').fields, {
    systolic: missing, diastolic: missing, pulse: candidate(72, 'label'),
  });
  assert.deepEqual(parse('sistólica 120').fields, {
    systolic: candidate(120, 'label'), diastolic: missing, pulse: missing,
  });
});
test('par incompleto não inventa diastólica nem escala isolada', () => {
  assert.deepEqual(parse('120 por').fields, { systolic: candidate(120), diastolic: missing, pulse: missing });
  assert.deepEqual(parse('12 por').fields.systolic, uncertain('mixed-scale'));
});
for (const text of ['', '   ', 'ruído', 'cento e vinte', '120 80', '72', 'salvar']) {
  test(`sem estrutura identificável: ${text}`, () => assert.deepEqual(parse(text).fields, {
    systolic: missing, diastolic: missing, pulse: missing,
  }));
}
for (const text of ['doze por oitenta', '120 por 8', '13,5 por 85', '2 por 1']) {
  test(`escala mista/não suportada: ${text}`, () => assert.deepEqual(parse(text).fields, {
    systolic: uncertain('mixed-scale'), diastolic: uncertain('mixed-scale'), pulse: missing,
  }));
}
for (const text of ['12 por 8, 14 por 9', '12 por 8, não, 14 por 9', '120 por 80 ou 130 por 90']) {
  test(`não seleciona par: ${text}`, () => {
    assert.deepEqual(parse(text).fields.systolic, uncertain('multiple-pairs'));
    assert.deepEqual(parse(text).fields.diastolic, uncertain('multiple-pairs'));
  });
}
test('negação/correção sem segundo par também impede candidato', () => {
  for (const text of ['não 120 por 80', '120 por 80, digo 130', 'corrigindo sistólica 120']) {
    assert.deepEqual(parse(text).fields.systolic, uncertain('multiple-pairs'));
  }
});
test('rótulos repetidos, iguais ou diferentes, não escolhem último', () => {
  for (const text of ['sistólica 120 sistólica 130', 'sistólica 120 sistólica 120']) {
    assert.deepEqual(parse(text).fields.systolic, uncertain('ambiguous-label'));
  }
});
test('não associa terceiro número ao pulso ou descarta número conflitante', () => {
  const fields = parse('120 por 80, 72').fields;
  assert.deepEqual(fields.pulse, missing);
  assert.deepEqual(fields.systolic, uncertain('unidentified-number'));
});
for (const text of ['13,55 por 8', 'treze vírgula cinquenta e cinco por oito', 'cento vinte por oitenta']) {
  test(`número malformado: ${text}`, () => {
    assert.deepEqual(parse(text).fields.systolic, uncertain('unreadable'));
  });
}
test('pulso decimal não arredonda; pressão rotulada não recebe escala coloquial', () => {
  assert.deepEqual(parse('pulso 72,5').fields.pulse, uncertain('unreadable'));
  assert.deepEqual(parse('sistólica 12 diastólica 8').fields, {
    systolic: candidate(12, 'label'), diastolic: candidate(8, 'label'), pulse: missing,
  });
});
test('não aceita resultado parcial, outro idioma ou timestamp inválido; erro seguro', () => {
  for (const patch of [{ final: false }, { locale: 'en-US' }, { capturedAtMs: NaN }, { capturedAtMs: -1 }]) {
    assert.throws(() => interpretVoice({ ...transcript('120 por 80'), ...patch } as Parameters<typeof interpretVoice>[0]), /^Error: invalid-final-transcript$/);
  }
});
test('é determinístico, preserva entrada e não mantém candidato entre chamadas', () => {
  const input = Object.freeze(transcript('doze por oito'));
  assert.deepEqual(interpretVoice(input), interpretVoice(input));
  assert.equal(input.text, 'doze por oito');
  assert.deepEqual(parse('').fields.systolic, missing);
  assert.equal('text' in parse('doze por oito'), false);
});
test('limite de entrada não inclui transcrição na saída', () => {
  assert.deepEqual(parse('x'.repeat(2001)).fields.pulse, uncertain('unreadable'));
});
test('número rotulado não vira outro campo por sobreposição com par', () => {
  assert.deepEqual(parse('pulso 72 por 80').fields, {
    systolic: uncertain('ambiguous-label'), diastolic: uncertain('ambiguous-label'), pulse: uncertain('ambiguous-label'),
  });
});
test('não omite sinal negativo ou texto desconhecido para aceitar um par', () => {
  for (const text of ['-120 por 80', 'ontem 120 por 80', '120 por 80 está errado']) {
    assert.notEqual(parse(text).fields.diastolic.status, 'candidate');
  }
});
