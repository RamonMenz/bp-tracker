import type { DocumentData, DocumentReference, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { computeNextRun } from '../lib/nextRun';

// A Function precisa rodar na mesma região do Firestore (PLAN §5, Fase 0).
const REGION = 'southamerica-east1';
const BATCH_LIMIT = 500;

// Se a Function ficar fora do ar, é melhor pular um ciclo do que notificar horas depois do
// horário combinado — um lembrete de pressão arterial fora de hora não faz sentido.
const ANTI_SPAM_WINDOW_MS = 2 * 60 * 60 * 1000;

const NOT_REGISTERED_ERROR_CODE = 'messaging/registration-token-not-registered';

interface ScheduleRecord {
  timezone: string;
  reminderTimes: string[];
  tokens: string[];
}

interface WorkItem {
  uid: string;
  ref: DocumentReference;
  schedule: ScheduleRecord;
  nextRunAt: Date | null;
}

/**
 * O documento vem do Firestore como dado não confiável — as rules validam a escrita, não
 * garantem o formato na leitura. Um schedule fora do formato é ignorado, não derruba o lote.
 */
function toScheduleRecord(data: DocumentData | undefined): ScheduleRecord | null {
  if (data === undefined) {
    return null;
  }

  const raw: Record<string, unknown> = data;

  if (typeof raw.timezone !== 'string' || raw.timezone === '') {
    return null;
  }

  if (!Array.isArray(raw.reminderTimes)) {
    return null;
  }

  const reminderTimes = raw.reminderTimes.filter((time): time is string => typeof time === 'string');

  if (reminderTimes.length === 0) {
    return null;
  }

  const tokens = Array.isArray(raw.tokens)
    ? raw.tokens.filter((token): token is string => typeof token === 'string' && token !== '')
    : [];

  return { timezone: raw.timezone, reminderTimes, tokens };
}

/**
 * Envia o lembrete de um usuário já reagendado e poda tokens mortos. Nunca rejeita: qualquer
 * falha é logada e contida aqui, para que um usuário com erro não pare os demais no `Promise.all`.
 */
async function sendReminder(item: WorkItem): Promise<void> {
  const { uid, ref, schedule } = item;

  try {
    if (schedule.tokens.length === 0) {
      logger.info('schedule reagendado, sem tokens para notificar', { uid });
      return;
    }

    const response = await getMessaging().sendEachForMulticast({
      tokens: schedule.tokens,
      notification: {
        title: 'Hora de medir sua pressão',
        body: 'Toque para registrar agora.',
      },
      data: { deeplink: 'bptracker://record' },
    });

    const tokensToRemove = new Set<string>();

    response.responses.forEach((result, index) => {
      if (!result.success && result.error?.code === NOT_REGISTERED_ERROR_CODE) {
        tokensToRemove.add(schedule.tokens[index]);
      }
    });

    if (tokensToRemove.size > 0) {
      const prunedTokens = schedule.tokens.filter((token) => !tokensToRemove.has(token));
      // Escrita avulsa, não passa pelo BulkWriter do reagendamento: acontece depois do envio,
      // não tem a mesma exigência de ordem, e são poucos casos por ciclo.
      await ref.update({ tokens: prunedTokens });
    }

    logger.info('lembrete despachado', {
      uid,
      tokenCount: schedule.tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
      prunedCount: tokensToRemove.size,
    });
  } catch (error) {
    logger.error('falha ao enviar lembrete', {
      uid,
      message: error instanceof Error ? error.message : 'erro desconhecido',
    });
  }
}

export const dispatchReminders = onSchedule(
  {
    schedule: '*/15 * * * *',
    timeZone: 'UTC',
    region: REGION,
    memory: '256MiB',
    // firebase-functions v7 achatou o antigo `retryConfig: { retryCount }` do PLAN §3.3
    // direto em `retryCount` nas ScheduleOptions.
    retryCount: 1,
  },
  async () => {
    const db = getFirestore();
    const now = Timestamp.now();
    const windowStart = Timestamp.fromMillis(now.toMillis() - ANTI_SPAM_WINDOW_MS);

    const dueSchedules = await db
      .collection('schedules')
      .where('nextRunAt', '<=', now)
      .where('nextRunAt', '>=', windowStart)
      .orderBy('nextRunAt')
      .limit(BATCH_LIMIT)
      .get();

    if (dueSchedules.empty) {
      logger.info('nenhum lembrete vencido');
      return;
    }

    const items: WorkItem[] = [];

    for (const doc of dueSchedules.docs) {
      const schedule = toScheduleRecord(doc.data());

      if (schedule === null) {
        logger.warn('schedule com formato inválido, ignorado', { uid: doc.id });
        continue;
      }

      const nextRunAt = computeNextRun(schedule.reminderTimes, schedule.timezone, now.toDate());
      items.push({ uid: doc.id, ref: doc.ref, schedule, nextRunAt });
    }

    // Fase 1 — reagenda TODOS antes de enviar qualquer push. BulkWriter só libera a promise de
    // uma escrita no flush/close, não a cada .set() individual — por isso o reagendamento roda
    // por completo (um único close) antes de qualquer envio começar, em vez de intercalado por
    // usuário. Se a Function morrer ou o Scheduler reexecutar depois deste ponto, o próximo ciclo
    // não vai mais encontrar os documentos já reagendados na janela — o retry nunca duplica o push.
    const bulkWriter = db.bulkWriter();
    const rescheduleResults = items.map((item) => {
      const promise =
        item.nextRunAt === null
          ? bulkWriter.delete(item.ref)
          : bulkWriter.set(item.ref, { nextRunAt: Timestamp.fromDate(item.nextRunAt), lastSentAt: now }, { merge: true });

      return { item, promise };
    });

    await bulkWriter.close();

    const readyToSend: WorkItem[] = [];

    await Promise.all(
      rescheduleResults.map(async ({ item, promise }) => {
        try {
          await promise;

          if (item.nextRunAt === null) {
            // Não deveria acontecer — o trigger só grava aqui quando computeNextRun já funcionou.
            // Mas se acontecer (ex: IANA da timezone ficou obsoleta), mais vale tirar do índice
            // do que deixar uma entrada que nunca mais dispara nem é limpa.
            logger.warn('não foi possível recalcular nextRunAt, schedule removido', { uid: item.uid });
            return;
          }

          readyToSend.push(item);
        } catch (error) {
          logger.error('falha ao reagendar, envio cancelado para este usuário', {
            uid: item.uid,
            message: error instanceof Error ? error.message : 'erro desconhecido',
          });
        }
      }),
    );

    // Fase 2 — só agora, com o reagendamento confirmado, dispara os pushes.
    await Promise.all(readyToSend.map(sendReminder));

    logger.info('lote de lembretes processado', {
      candidatos: items.length,
      reagendados: readyToSend.length,
    });
  },
);
