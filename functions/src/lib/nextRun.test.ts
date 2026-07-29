import { DateTime } from 'luxon';

import { computeNextRun } from './nextRun';

const SAO_PAULO = 'America/Sao_Paulo';
const NEW_YORK = 'America/New_York';

/** Constrói o instante correspondente a uma hora de parede local, para usar como `from`. */
function localInstant(iso: string, zone: string): Date {
  return DateTime.fromISO(iso, { zone }).toJSDate();
}

function toUtcIso(date: Date | null): string | null {
  return date === null ? null : date.toISOString();
}

describe('computeNextRun', () => {
  describe('casos sem resultado', () => {
    it('retorna null para lista vazia', () => {
      expect(computeNextRun([], SAO_PAULO, localInstant('2026-05-10T10:00', SAO_PAULO))).toBeNull();
    });

    it('retorna null para timezone desconhecida', () => {
      expect(computeNextRun(['08:00'], 'Nao/Existe', new Date())).toBeNull();
    });

    it('retorna null quando todos os horários são malformados', () => {
      const from = localInstant('2026-05-10T10:00', SAO_PAULO);

      expect(computeNextRun(['25:00', '8:00', 'abc', '', '12:60'], SAO_PAULO, from)).toBeNull();
    });
  });

  describe('seleção do próximo horário', () => {
    it('escolhe o próximo horário do mesmo dia', () => {
      const from = localInstant('2026-05-10T09:30', SAO_PAULO);

      // 14:00 em São Paulo (UTC-3) = 17:00 UTC.
      expect(toUtcIso(computeNextRun(['08:00', '14:00', '20:00'], SAO_PAULO, from))).toBe(
        '2026-05-10T17:00:00.000Z',
      );
    });

    it('pula o horário exatamente igual a `from` e vai para o próximo do dia', () => {
      const from = localInstant('2026-05-10T08:00', SAO_PAULO);

      expect(toUtcIso(computeNextRun(['08:00', '14:00'], SAO_PAULO, from))).toBe('2026-05-10T17:00:00.000Z');
    });

    it('pula o horário igual a `from` e cai no dia seguinte quando era o único', () => {
      const from = localInstant('2026-05-10T08:00', SAO_PAULO);

      expect(toUtcIso(computeNextRun(['08:00'], SAO_PAULO, from))).toBe('2026-05-11T11:00:00.000Z');
    });

    it('ignora itens malformados sem descartar os válidos do mesmo usuário', () => {
      const from = localInstant('2026-05-10T09:30', SAO_PAULO);

      expect(toUtcIso(computeNextRun(['25:00', 'abc', '14:00'], SAO_PAULO, from))).toBe(
        '2026-05-10T17:00:00.000Z',
      );
    });

    it('não depende da ordem da lista', () => {
      const from = localInstant('2026-05-10T09:30', SAO_PAULO);

      expect(toUtcIso(computeNextRun(['20:00', '14:00', '08:00'], SAO_PAULO, from))).toBe(
        '2026-05-10T17:00:00.000Z',
      );
    });
  });

  describe('virada de dia', () => {
    it('às 23:50 aponta para o primeiro horário da manhã seguinte', () => {
      const from = localInstant('2026-05-10T23:50', SAO_PAULO);

      expect(toUtcIso(computeNextRun(['08:00', '14:00', '20:00'], SAO_PAULO, from))).toBe(
        '2026-05-11T11:00:00.000Z',
      );
    });

    it('atravessa a virada de mês', () => {
      const from = localInstant('2026-05-31T23:50', SAO_PAULO);

      expect(toUtcIso(computeNextRun(['08:00'], SAO_PAULO, from))).toBe('2026-06-01T11:00:00.000Z');
    });

    it('atravessa a virada de ano', () => {
      const from = localInstant('2026-12-31T23:50', SAO_PAULO);

      expect(toUtcIso(computeNextRun(['08:00'], SAO_PAULO, from))).toBe('2027-01-01T11:00:00.000Z');
    });
  });

  describe('horário de verão (America/New_York)', () => {
    // 2026-03-08: relógio salta 02:00 -> 03:00 (EST -05:00 vira EDT -04:00).
    it('mantém a hora local ao atravessar o início do horário de verão', () => {
      const from = localInstant('2026-03-07T23:50', NEW_YORK);

      // 08:00 EDT = 12:00 UTC. Somar 24h em UTC daria 13:00Z — uma hora errada.
      expect(toUtcIso(computeNextRun(['08:00'], NEW_YORK, from))).toBe('2026-03-08T12:00:00.000Z');
    });

    it('desloca para depois do buraco quando o horário local não existe', () => {
      const from = localInstant('2026-03-08T01:00', NEW_YORK);

      // 02:30 não existe nesse dia; o lembrete sai às 03:30 EDT = 07:30 UTC.
      expect(toUtcIso(computeNextRun(['02:30'], NEW_YORK, from))).toBe('2026-03-08T07:30:00.000Z');
    });

    // 2026-11-01: relógio volta 02:00 -> 01:00 (EDT -04:00 vira EST -05:00).
    it('mantém a hora local ao atravessar o fim do horário de verão', () => {
      const from = localInstant('2026-10-31T23:50', NEW_YORK);

      // 08:00 EST = 13:00 UTC. Somar 24h em UTC daria 12:00Z — uma hora errada.
      expect(toUtcIso(computeNextRun(['08:00'], NEW_YORK, from))).toBe('2026-11-01T13:00:00.000Z');
    });

    it('resolve horário ambíguo da volta do horário de verão na primeira ocorrência', () => {
      const from = localInstant('2026-11-01T00:30', NEW_YORK);

      // 01:30 acontece duas vezes; vale a primeira (ainda EDT) = 05:30 UTC.
      expect(toUtcIso(computeNextRun(['01:30'], NEW_YORK, from))).toBe('2026-11-01T05:30:00.000Z');
    });
  });

  it('usa o instante atual quando `from` não é informado', () => {
    const before = Date.now();
    const next = computeNextRun(['00:00', '06:00', '12:00', '18:00'], SAO_PAULO);

    expect(next).not.toBeNull();
    expect(next?.getTime()).toBeGreaterThan(before);
  });
});
