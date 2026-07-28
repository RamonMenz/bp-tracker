import { DateTime } from 'luxon';

/**
 * Formato aceito para `reminderTimes`: "HH:mm" 24h com zero à esquerda, hora LOCAL do usuário.
 *
 * A validação é estrita de propósito. `DateTime.set({ hour: 25 })` não é inválido no Luxon —
 * ele transborda para 01:00 do dia seguinte. Sem esta checagem, um "25:00" gravado por engano
 * viraria um lembrete plausível no horário errado, em vez de ser descartado.
 */
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Próximo horário de lembrete depois de `from`, como instante absoluto (UTC).
 *
 * O horário é ancorado na parede do relógio local do usuário: `plus({ days: 1 })` mantém
 * "08:00 local" mesmo quando o dia seguinte tem 23 ou 25 horas por causa do horário de verão.
 * Somar 24h em UTC erraria em uma hora nas viradas.
 *
 * Retorna `null` quando não há horário futuro possível: lista vazia, todos os itens malformados
 * ou timezone IANA desconhecida. Entradas malformadas são ignoradas individualmente — um item
 * corrompido não deve cancelar os lembretes válidos do mesmo usuário.
 */
export function computeNextRun(times: string[], zone: string, from: Date = new Date()): Date | null {
  const now = DateTime.fromJSDate(from, { zone });

  if (!now.isValid) {
    return null;
  }

  let next: DateTime | null = null;

  for (const time of times) {
    const match = TIME_PATTERN.exec(time);

    if (match === null) {
      continue;
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);

    const today = now.set({ hour, minute, second: 0, millisecond: 0 });
    // Num horário que não existe (salto de primavera, 02:00 -> 03:00), o Luxon avança para
    // depois do buraco — o lembrete das 02:30 sai às 03:30 naquele dia, em vez de sumir.
    const candidates = [today, today.plus({ days: 1 })];

    for (const candidate of candidates) {
      // `<=` e não `<`: um horário exatamente igual a `from` já passou, o próximo é o seguinte.
      if (!candidate.isValid || candidate <= now) {
        continue;
      }

      if (next === null || candidate < next) {
        next = candidate;
      }
    }
  }

  return next === null ? null : next.toUTC().toJSDate();
}
