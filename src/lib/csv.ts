import { classifyBloodPressure, type BpCategory } from '@/domain/bp-classification';
import type { Reading } from '@/types/models';

const CSV_HEADER = 'data;hora;sistolica;diastolica;pulso;categoria;observacao';
const SEPARATOR = ';';
const LINE_BREAK = '\r\n';

// Excel no Windows só reconhece UTF-8 sem esse marcador se o separador for `;` — o BOM evita
// que ç/ã virem lixo ao abrir o arquivo (PLAN §3.4/§5, tabela de riscos).
const BOM = '﻿';

// Ao ver o BOM, o Excel assume vírgula como separador e ignora o separador de lista da
// localidade do sistema (pt-BR usa `;`) — o resultado é a linha inteira caindo numa única
// célula, com números, `;` e texto acentuado misturados, o que o usuário lê como "os
// caracteres não aparecem direito". A diretiva `sep=;` como primeira linha do arquivo é o
// mecanismo que o próprio Excel expõe para sobrepor essa heurística.
// Custo aceito: quem abrir o CSV num editor de texto puro ou importar programaticamente sem
// tratamento especial vê essa linha como uma linha de dados a mais (por isso ela não entra em
// CSV_HEADER nem é tratada como linha de leitura).
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
  return BOM + [SEP_DIRECTIVE, CSV_HEADER, ...rows].join(LINE_BREAK);
}
