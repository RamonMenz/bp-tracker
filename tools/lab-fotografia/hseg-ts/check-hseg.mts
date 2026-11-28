// LABORATÓRIO — verificações do porte TS do H-seg com imagens 100% sintéticas, desenhadas aqui.
// Nenhuma foto do autor. Rodar: node --test tools/lab-fotografia/hseg-ts/check-hseg.mts
// (nome sem .test/.spec de propósito: não entra no Jest do app).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decodeLcd } from './hseg.ts';
import { display, drawDigit, H, lcd, rect, W } from './synthetic.ts';

const candidate = (value: number) => ({ status: 'candidate', value });

test('decodifica 0–9 em todos os campos, nos dois gabaritos', () => {
  for (const device of ['gtech', 'generic'] as const) {
    for (let d = 0; d <= 9; d++) {
      const fields = decodeLcd(display(device, [`1${d}${d}`, `8${d}`, `6${d}`]), device);
      assert.deepEqual(fields.systolic, candidate(100 + 11 * d), `${device} SIS ${d}`);
      assert.deepEqual(fields.diastolic, candidate(80 + d), `${device} DIA ${d}`);
      assert.deepEqual(fields.pulse, candidate(60 + d), `${device} PULSO ${d}`);
    }
  }
});

test('dígitos itálicos são endireitados antes da leitura', () => {
  const fields = decodeLcd(display('gtech', ['147', '95', '72'], 0.12), 'gtech');
  assert.deepEqual(fields, { systolic: candidate(147), diastolic: candidate(95), pulse: candidate(72) });
});

test('sombra suave sobre parte do visor não impede a leitura', () => {
  const shade = (x: number, y: number) => 200 - (x < 220 && y > 200 ? 90 : 0) * Math.min(1, (220 - x) / 60);
  const fields = decodeLcd(display('gtech', ['132', '84', '70'], 0, shade), 'gtech');
  assert.deepEqual(fields, { systolic: candidate(132), diastolic: candidate(84), pulse: candidate(70) });
});

test('visor desligado não produz nenhum candidato', () => {
  const fields = decodeLcd(lcd(H.gtech), 'gtech');
  for (const field of Object.values(fields)) assert.equal(field.status, 'uncertain');
});

test('"1" de centena parcialmente apagado deixa o campo incerto, nunca vira número de 2 dígitos', () => {
  const image = display('gtech', ['38', '84', '70']);
  const h = 0.3 * H.gtech;
  drawDigit(image, ['b'], 0.95 * W - 3 * 0.62 * h, 0.05 * H.gtech, h); // só a metade de cima do "1"
  const fields = decodeLcd(image, 'gtech');
  assert.equal(fields.systolic.status, 'uncertain');
  assert.deepEqual(fields.diastolic, candidate(84));
});

test('mancha no meio de um dígito torna a varredura discordante e o campo incerto', () => {
  const image = display('gtech', ['120', '80', '72']);
  const h = 0.3 * H.gtech, x = 0.95 * W - 0.62 * h; // último dígito do SIS
  rect(image, x + 0.2 * h, 0.05 * H.gtech + 0.3 * h, 0.1 * h, 0.08 * h);
  assert.equal(decodeLcd(image, 'gtech').systolic.status, 'uncertain');
});

test('zero à esquerda e quantidade inválida de dígitos não viram candidatos', () => {
  const fields = decodeLcd(display('gtech', ['05', '8', '1234'.slice(0, 3)]), 'gtech');
  assert.equal(fields.systolic.status, 'uncertain');
  assert.equal(fields.diastolic.status, 'uncertain');
  assert.deepEqual(fields.pulse, candidate(123));
});
