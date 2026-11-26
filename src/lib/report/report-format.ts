import { DateTime } from 'luxon';

import type { CivilDate } from './report-period';

/**
 * Formatação do relatório PDF (spec-relatorio-pdf §3.3): `dd/mm/aaaa`, `HH:mm`, sempre no fuso
 * fixado da operação — nunca no fuso implícito do processo — e uma casa decimal com vírgula.
 */

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatCivilDate(value: CivilDate): string {
  return `${pad2(value.day)}/${pad2(value.month)}/${value.year}`;
}

/** `AAAA-MM-DD`, para o nome do arquivo. */
export function formatIsoCivilDate(value: CivilDate): string {
  return `${value.year}-${pad2(value.month)}-${pad2(value.day)}`;
}

export function formatDateInZone(date: Date, timeZone: string): string {
  return DateTime.fromJSDate(date, { zone: timeZone }).toFormat('dd/MM/yyyy');
}

export function formatTimeInZone(date: Date, timeZone: string): string {
  return DateTime.fromJSDate(date, { zone: timeZone }).toFormat('HH:mm');
}

export function formatDateTimeInZone(date: Date, timeZone: string): string {
  return `${formatDateInZone(date, timeZone)} ${formatTimeInZone(date, timeZone)}`;
}

/**
 * Uma casa decimal, vírgula pt-BR. O arredondamento acontece SÓ aqui, na apresentação: o valor
 * recebido é a média com a precisão completa (spec §3.3.4).
 */
export function formatOneDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded.toFixed(1).replace('.', ',');
}

/**
 * Pontos de código fora do Latin-1 que o WinAnsiEncoding (CP1252) ainda representa — a faixa
 * 0x80–0x9F do CP1252. A fonte padrão do jsPDF (Helvetica) só desenha esse repertório.
 */
const CP1252_EXTRA = new Set(
  [
    0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x017d, 0x2018,
    0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
  ],
);

export const UNSUPPORTED_CHARACTER_PLACEHOLDER = '?';

function isWinAnsiCodePoint(codePoint: number): boolean {
  return (codePoint >= 0x20 && codePoint <= 0x7e) || (codePoint >= 0xa0 && codePoint <= 0xff) || CP1252_EXTRA.has(codePoint);
}

export interface WinAnsiText {
  text: string;
  /** Quantos caracteres não representáveis foram trocados pelo marcador. */
  replacedCount: number;
}

/**
 * Prepara texto variável (observações) para a fonte padrão: normaliza para NFC (acentos
 * decompostos viram um caractere só), mantém quebras de linha, troca tabulação por espaço e
 * substitui o que a fonte não desenha por `?` — contando, para o documento declarar a troca em vez
 * de deixar lixo ou caractere sumir em silêncio. O texto segue literal: nada é interpretado.
 */
export function toWinAnsiText(value: string): WinAnsiText {
  let replacedCount = 0;
  let text = '';

  for (const char of value.normalize('NFC').replace(/\r\n?/g, '\n').replace(/\t/g, ' ')) {
    const codePoint = char.codePointAt(0) ?? 0;

    if (char === '\n' || isWinAnsiCodePoint(codePoint)) {
      text += char;
      continue;
    }

    // Controles invisíveis (C0/C1, exceto \n) são descartados sem marcador: não são conteúdo.
    if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint < 0xa0)) {
      continue;
    }

    text += UNSUPPORTED_CHARACTER_PLACEHOLDER;
    replacedCount += 1;
  }

  return { text, replacedCount };
}
