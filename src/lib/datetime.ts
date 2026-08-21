/**
 * Formatação de data/hora para a interface. Puro, sem I/O — o `now` é sempre parâmetro com
 * default, nunca lido de dentro das funções, para que os limites (virada de dia, ontem) sejam
 * testáveis sem congelar o relógio.
 *
 * Todas as comparações usam o dia LOCAL do aparelho, não UTC: perto da meia-noite, UTC rotularia
 * uma medição de hoje como "ontem" para quem está a oeste de Greenwich.
 */

const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dayMonthFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' });
const shortDateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Chave de agrupamento por dia local. Só para comparar/agrupar — nunca exibida ao usuário. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

/** Data e hora compactas, para o carimbo editável do formulário: "13/08, 08:30". */
export function formatShortDateTime(date: Date): string {
  return shortDateTimeFormatter.format(date);
}

/** Só a data, sem hora — para o range de exportação em CSV (mode="date" do DateTimeField): "01/07/2026". */
export function formatShortDate(date: Date): string {
  return shortDateFormatter.format(date);
}

/** "Hoje" / "Ontem" / "12 de agosto" — cabeçalho de grupo do histórico. */
export function dayLabel(date: Date, now: Date = new Date()): string {
  if (dayKey(date) === dayKey(now)) {
    return 'Hoje';
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dayKey(date) === dayKey(yesterday)) {
    return 'Ontem';
  }

  return dayMonthFormatter.format(date);
}

/** "Hoje às 08:30" — usado onde uma medição isolada precisa se situar no tempo. */
export function formatDayAndTime(date: Date, now: Date = new Date()): string {
  return `${dayLabel(date, now)} às ${formatTime(date)}`;
}
