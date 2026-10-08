import type { SessionReadings, SessionReadingValues } from '@/types/models';

function formatEntry(entry: SessionReadingValues): string {
  const pulse = entry.pulse === null ? '' : ` (${entry.pulse})`;
  return `${entry.systolic}/${entry.diastolic}${pulse}`;
}

/**
 * As duas leituras de uma sessão em texto visual: `150/95 (72) e 120/80 (70)`. O pulso entra
 * entre parênteses só quando a leitura tem pulso. Usado pela legenda da linha e pelo CSV.
 */
export function formatSessionReadings([first, second]: SessionReadings): string {
  return `${formatEntry(first)} e ${formatEntry(second)}`;
}

/**
 * Mesmas leituras para leitor de tela: "por" no lugar da barra (CLAUDE.md §4.7), sem pulso —
 * o rótulo da linha já anuncia o pulso da média.
 */
export function formatSessionReadingsForSpeech([first, second]: SessionReadings): string {
  return `${first.systolic} por ${first.diastolic} e ${second.systolic} por ${second.diastolic}`;
}
