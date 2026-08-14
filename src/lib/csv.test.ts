import type { Reading } from '@/types/models';

import { readingsToCsv } from './csv';

const BOM = '﻿';
const SEP_DIRECTIVE = 'sep=;';

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
  it('gera BOM + sep=; + cabeçalho para lista vazia', () => {
    const csv = readingsToCsv([]);

    expect(csv).toBe(`${BOM}sep=;\r\ndata;hora;sistolica;diastolica;pulso;categoria;observacao`);
  });

  it('começa com o BOM UTF-8 mesmo com dados', () => {
    const csv = readingsToCsv([makeReading()]);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.startsWith(BOM)).toBe(true);
  });

  /**
   * BUG relatado pelo usuário ("CSV não aceita os caracteres do português"): com BOM + `;` mas
   * sem esta diretiva, o Excel decide o separador pela configuração regional do Windows — fora de
   * locales como pt-BR, ele não detecta `;`, e a rota de abertura por duplo clique que resulta
   * disso não é a mesma que respeita o BOM de forma confiável em todas as versões/locales. `sep=;`
   * é a diretiva oficial da Microsoft para o Excel usar o separador do próprio arquivo, evitando
   * essa rota. Ver comentário de SEP_DIRECTIVE em csv.ts para a investigação completa.
   */
  it('inclui a diretiva sep=; como primeira linha de texto, logo após o BOM', () => {
    const csv = readingsToCsv([makeReading()]);
    const [firstLine] = csv.split('\r\n');

    // O BOM é só bytes de encoding no início do arquivo, não uma linha própria — por isso
    // continua grudado em "sep=;" em vez de vir separado por \r\n.
    expect(firstLine).toBe(`${BOM}${SEP_DIRECTIVE}`);
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

  it('preserva acentuação do rótulo de categoria (Estágio 1/2), a única fonte de acento antes de haver observação', () => {
    const csv = readingsToCsv([
      makeReading({ systolic: 135, diastolic: 85 }),
      makeReading({ systolic: 150, diastolic: 95 }),
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

    expect(rows).toHaveLength(5); // sep=; + cabeçalho + 3 linhas
  });
});
