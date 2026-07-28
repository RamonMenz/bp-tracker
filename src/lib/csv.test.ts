import type { Reading } from '@/types/models';

import { readingsToCsv } from './csv';

const BOM = '﻿';

function makeReading(overrides: Partial<Reading> = {}): Reading {
  return {
    systolic: 110,
    diastolic: 70,
    pulse: 70,
    measuredAt: new Date(2026, 0, 5, 8, 7),
    createdAt: new Date(2026, 0, 5, 8, 7),
    note: null,
    source: 'manual',
    ...overrides,
  };
}

describe('readingsToCsv', () => {
  it('gera só o BOM e o cabeçalho para lista vazia', () => {
    const csv = readingsToCsv([]);

    expect(csv).toBe(`${BOM}data;hora;sistolica;diastolica;pulso;categoria;observacao`);
  });

  it('começa com o BOM UTF-8 mesmo com dados', () => {
    const csv = readingsToCsv([makeReading()]);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.startsWith(BOM)).toBe(true);
  });

  it('usa ; como separador e monta a linha na ordem esperada', () => {
    const csv = readingsToCsv([makeReading({ systolic: 110, diastolic: 70, pulse: 70 })]);
    const [, dataRow] = csv.split('\r\n');

    expect(dataRow).toBe('05/01/2026;08:07;110;70;70;Normal;');
  });

  it('deixa o campo de pulso vazio quando pulse é null', () => {
    const csv = readingsToCsv([makeReading({ pulse: null })]);
    const [, dataRow] = csv.split('\r\n');

    expect(dataRow).toBe('05/01/2026;08:07;110;70;;Normal;');
  });

  it('escapa note contendo ; e aspas duplas, duplicando as aspas internas', () => {
    const csv = readingsToCsv([makeReading({ note: 'Após almoço; tomei "captopril"' })]);
    const [, dataRow] = csv.split('\r\n');

    expect(dataRow).toBe('05/01/2026;08:07;110;70;70;Normal;"Após almoço; tomei ""captopril"""');
  });

  it('não coloca aspas em note sem caracteres especiais', () => {
    const csv = readingsToCsv([makeReading({ note: 'Sem problemas' })]);
    const [, dataRow] = csv.split('\r\n');

    expect(dataRow).toBe('05/01/2026;08:07;110;70;70;Normal;Sem problemas');
  });

  it('preserva acentuação (ç, ã) sem escapar', () => {
    const csv = readingsToCsv([makeReading({ note: 'Medição após a refeição, sem sensação de tontura' })]);
    const [, dataRow] = csv.split('\r\n');

    expect(dataRow).toContain('Medição após a refeição, sem sensação de tontura');
  });

  it('classifica a categoria de cada linha a partir de systolic/diastolic', () => {
    const csv = readingsToCsv([
      makeReading({ systolic: 119, diastolic: 79 }),
      makeReading({ systolic: 185, diastolic: 70 }),
    ]);
    const rows = csv.split('\r\n').slice(1);

    expect(rows[0]).toContain(';Normal;');
    expect(rows[1]).toContain(';Crise;');
  });

  it('gera uma linha por leitura, preservando a ordem recebida', () => {
    const csv = readingsToCsv([makeReading({ systolic: 120 }), makeReading({ systolic: 130 }), makeReading({ systolic: 140 })]);
    const rows = csv.split('\r\n');

    expect(rows).toHaveLength(4); // cabeçalho + 3 linhas
  });
});
