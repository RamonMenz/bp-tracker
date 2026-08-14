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
  it('gera BOM, diretiva sep=; e cabeçalho para lista vazia', () => {
    const csv = readingsToCsv([]);

    expect(csv).toBe(`${BOM}sep=;\r\ndata;hora;sistolica;diastolica;pulso;categoria;observacao`);
  });

  it('começa com o BOM UTF-8 mesmo com dados', () => {
    const csv = readingsToCsv([makeReading()]);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.startsWith(BOM)).toBe(true);
  });

  // O Excel, ao ver o BOM, assume vírgula como separador e ignora o separador de lista da
  // localidade do sistema — sem essa diretiva como primeira linha, um CSV `;`-separado em
  // pt-BR cai inteiro numa única célula ao abrir com duplo clique.
  it('inclui a diretiva sep=; logo após o BOM, antes do cabeçalho', () => {
    const csv = readingsToCsv([makeReading()]);
    const [directive, header] = csv.split('\r\n');

    expect(directive).toBe(`${BOM}sep=;`);
    expect(header).toBe('data;hora;sistolica;diastolica;pulso;categoria;observacao');
  });

  it('usa ; como separador e monta a linha na ordem esperada', () => {
    const csv = readingsToCsv([makeReading({ systolic: 110, diastolic: 70, pulse: 70 })]);
    const [, , dataRow] = csv.split('\r\n');

    expect(dataRow).toBe('05/01/2026;08:07;110;70;70;Normal;');
  });

  it('deixa o campo de pulso vazio quando pulse é null', () => {
    const csv = readingsToCsv([makeReading({ pulse: null })]);
    const [, , dataRow] = csv.split('\r\n');

    expect(dataRow).toBe('05/01/2026;08:07;110;70;;Normal;');
  });

  it('escapa note contendo ; e aspas duplas, duplicando as aspas internas', () => {
    const csv = readingsToCsv([makeReading({ note: 'Após almoço; tomei "captopril"' })]);
    const [, , dataRow] = csv.split('\r\n');

    expect(dataRow).toBe('05/01/2026;08:07;110;70;70;Normal;"Após almoço; tomei ""captopril"""');
  });

  it('não coloca aspas em note sem caracteres especiais', () => {
    const csv = readingsToCsv([makeReading({ note: 'Sem problemas' })]);
    const [, , dataRow] = csv.split('\r\n');

    expect(dataRow).toBe('05/01/2026;08:07;110;70;70;Normal;Sem problemas');
  });

  it('preserva acentuação (ç, ã) sem escapar', () => {
    const csv = readingsToCsv([makeReading({ note: 'Medição após a refeição, sem sensação de tontura' })]);
    const [, , dataRow] = csv.split('\r\n');

    expect(dataRow).toContain('Medição após a refeição, sem sensação de tontura');
  });

  it('preserva todas as vogais acentuadas e a cedilha (ç, ã, õ, é, à) numa observação real', () => {
    const csv = readingsToCsv([makeReading({ note: 'Média após à noite: sensação de compressão, coração acelerado' })]);
    const [, , dataRow] = csv.split('\r\n');

    expect(dataRow).toContain('Média após à noite: sensação de compressão, coração acelerado');
  });

  it('preserva "Estágio 1"/"Estágio 2" (categoria) sem escapar o acento', () => {
    const csv = readingsToCsv([
      makeReading({ systolic: 130, diastolic: 85 }),
      makeReading({ systolic: 145, diastolic: 95 }),
    ]);
    const rows = csv.split('\r\n').slice(2);

    expect(rows[0]).toContain(';Estágio 1;');
    expect(rows[1]).toContain(';Estágio 2;');
  });

  it('classifica a categoria de cada linha a partir de systolic/diastolic', () => {
    const csv = readingsToCsv([
      makeReading({ systolic: 119, diastolic: 79 }),
      makeReading({ systolic: 185, diastolic: 70 }),
    ]);
    const rows = csv.split('\r\n').slice(2);

    expect(rows[0]).toContain(';Normal;');
    expect(rows[1]).toContain(';Crise;');
  });

  it('gera uma linha por leitura, preservando a ordem recebida', () => {
    const csv = readingsToCsv([makeReading({ systolic: 120 }), makeReading({ systolic: 130 }), makeReading({ systolic: 140 })]);
    const rows = csv.split('\r\n');

    expect(rows).toHaveLength(5); // diretiva sep=; + cabeçalho + 3 linhas
  });
});
