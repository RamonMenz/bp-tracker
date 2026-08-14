import { classifyBloodPressure, type BpCategory } from '@/domain/bp-classification';
import type { Reading } from '@/types/models';

const CSV_HEADER = 'data;hora;sistolica;diastolica;pulso;categoria;observacao';
const SEPARATOR = ';';
const LINE_BREAK = '\r\n';

// Excel no Windows só reconhece UTF-8 sem esse marcador se o separador for `;` — o BOM evita
// que ç/ã virem lixo ao abrir o arquivo (PLAN §3.4/§5, tabela de riscos).
const BOM = '﻿';

/**
 * Diretiva oficial do Excel (Microsoft KB) para forçar o separador de campo ao abrir um CSV por
 * duplo clique, IGNORANDO a configuração regional do Windows. Investigação do bug "acentuação
 * quebrada": com BOM + `;` mas SEM esta linha, o Excel decide o separador pela config regional do
 * SO — se ela não for `;` (padrão fora de pt-BR/de-DE/fr-FR...), o Excel cai na rota de
 * abertura "heurística", que em builds e locales variados não é a mesma que respeita o BOM de
 * forma confiável; o sintoma relatado (ç/ã virando lixo) bate com esse caminho, não com um erro
 * nos bytes gerados aqui — o pipeline desde `readingsToCsv` até o Blob/`FileSystem.writeAsStringAsync`
 * já escreve UTF-8 correto (conferido byte a byte; ver notas do commit). `sep=;` faz o Excel tomar
 * o separador do próprio arquivo, o que estabiliza esse caminho e resolve o relato mais provável.
 *
 * Trade-off aceito: quem abre o CSV num editor de texto puro, ou importa programaticamente sem
 * pular a primeira linha, vê "sep=;" como se fosse uma linha de dados a mais. Não há como ter os
 * dois de graça — plataformas fora do Excel (Sheets, Numbers, `csv-parse`) ignoram ou respeitam
 * a diretiva sem problema, mas um `readFileSync().split('\n')[0]` ingênuo passa a pegar "sep=;" em
 * vez do cabeçalho. Aceito porque o público-alvo do export (CLAUDE.md §1) abre no Excel/Sheets, não
 * em parser próprio; qualquer consumidor programático deste CSV precisa pular a primeira linha.
 */
const SEP_DIRECTIVE = 'sep=;';

const CATEGORY_LABEL: Record<BpCategory, string> = {
  normal: 'Normal',
  elevated: 'Elevada',
  stage1: 'Estágio 1',
  stage2: 'Estágio 2',
  crisis: 'Crise',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Aspas duplas escapam aspas (`"` -> `""`); campo entra entre aspas se contiver o separador, aspas ou quebra de linha. */
function escapeCsvField(value: string): string {
  const needsQuoting = value.includes(SEPARATOR) || value.includes('"') || value.includes('\n') || value.includes('\r');

  if (!needsQuoting) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function readingToRow(reading: Reading): string {
  const category = classifyBloodPressure(reading.systolic, reading.diastolic);

  const fields = [
    dateFormatter.format(reading.measuredAt),
    timeFormatter.format(reading.measuredAt),
    String(reading.systolic),
    String(reading.diastolic),
    reading.pulse === null ? '' : String(reading.pulse),
    CATEGORY_LABEL[category],
    reading.note === null ? '' : reading.note,
  ];

  return fields.map(escapeCsvField).join(SEPARATOR);
}

export function readingsToCsv(readings: Reading[]): string {
  const rows = readings.map(readingToRow);
  // BOM continua sendo os 3 primeiros BYTES do arquivo (nenhum texto antes dele) — só depois vem
  // a linha sep=;, que por sua vez precisa vir antes do cabeçalho para o Excel lê-la como diretiva.
  return BOM + [SEP_DIRECTIVE, CSV_HEADER, ...rows].join(LINE_BREAK);
}
