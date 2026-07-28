import type { DocumentData } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

import { computeNextRun } from '../lib/nextRun';
import { readDeviceTokens, schedulePath } from '../lib/schedules';

// Triggers de Firestore precisam rodar na mesma região do banco (PLAN §5, Fase 0).
const REGION = 'southamerica-east1';

interface ScheduleSettings {
  reminderTimes: string[];
  timezone: string;
}

/**
 * Converte o documento do usuário nos campos que interessam ao índice de disparo, ou `null`
 * quando não há nada a agendar (notificações desligadas, sem horários, conta apagada).
 *
 * O documento vem do Firestore como dado não confiável: as rules validam a escrita, não
 * garantem o formato na leitura.
 */
function toScheduleSettings(data: DocumentData | undefined): ScheduleSettings | null {
  if (data === undefined) {
    return null;
  }

  const raw: Record<string, unknown> = data;

  if (raw.notificationsEnabled !== true) {
    return null;
  }

  if (!Array.isArray(raw.reminderTimes)) {
    return null;
  }

  const reminderTimes = raw.reminderTimes.filter((time): time is string => typeof time === 'string');

  if (reminderTimes.length === 0) {
    return null;
  }

  const timezone = raw.timezone;

  if (typeof timezone !== 'string' || timezone === '') {
    return null;
  }

  return { reminderTimes, timezone };
}

function isSameSchedule(before: ScheduleSettings | null, after: ScheduleSettings | null): boolean {
  if (before === null || after === null) {
    return before === after;
  }

  return (
    before.timezone === after.timezone &&
    before.reminderTimes.length === after.reminderTimes.length &&
    before.reminderTimes.every((time, index) => time === after.reminderTimes[index])
  );
}

export const onUserSettingsWrite = onDocumentWritten(
  { document: 'users/{uid}', region: REGION },
  async (event) => {
    const { uid } = event.params;
    const scheduleRef = getFirestore().doc(schedulePath(uid));

    const before = toScheduleSettings(event.data?.before.data());
    const after = toScheduleSettings(event.data?.after.data());

    // `ensureUserProfile` reescreve users/{uid} a cada login (updatedAt). Sem esta guarda, todo
    // login recalcularia nextRunAt — e um lembrete já vencido, ainda não despachado pelo cron,
    // seria empurrado para o próximo horário e nunca chegaria.
    if (isSameSchedule(before, after)) {
      return;
    }

    if (after === null) {
      // Desligou notificações, zerou os horários ou apagou a conta: sai do índice.
      // Apagar (em vez de marcar inativo) mantém a query do cron como filtro de campo único.
      await scheduleRef.delete();
      logger.info('schedule removido', { uid });
      return;
    }

    const nextRunAt = computeNextRun(after.reminderTimes, after.timezone);

    if (nextRunAt === null) {
      // Timezone desconhecida ou todos os horários malformados. Gravar `nextRunAt: null` deixaria
      // um documento permanentemente inválido no índice, então ele sai da fila.
      await scheduleRef.delete();
      logger.warn('sem horário agendável, schedule removido', {
        uid,
        reminderTimesCount: after.reminderTimes.length,
      });
      return;
    }

    const tokens = await readDeviceTokens(uid);

    await scheduleRef.set(
      {
        nextRunAt,
        timezone: after.timezone,
        reminderTimes: after.reminderTimes,
        tokens,
        lastSentAt: null,
      },
      { merge: true },
    );

    logger.info('schedule atualizado', {
      uid,
      tokenCount: tokens.length,
      reminderTimesCount: after.reminderTimes.length,
    });
  },
);
