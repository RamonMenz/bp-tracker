import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

import { readDeviceTokens, schedulePath } from '../lib/schedules';

// Triggers de Firestore precisam rodar na mesma região do banco (PLAN §5, Fase 0).
const REGION = 'southamerica-east1';

/**
 * Mantém o array `tokens` de `schedules/{uid}` em dia quando um device é registrado ou removido.
 *
 * Não recalcula `nextRunAt`: trocar de aparelho não é motivo para mexer no horário do lembrete,
 * e recalcular aqui poderia empurrar para frente um disparo já vencido.
 */
export const onDeviceWrite = onDocumentWritten(
  { document: 'users/{uid}/devices/{tokenId}', region: REGION },
  async (event) => {
    const { uid } = event.params;
    const scheduleRef = getFirestore().doc(schedulePath(uid));
    const scheduleSnapshot = await scheduleRef.get();

    // Sem documento no índice = notificações desligadas. Criar um aqui deixaria uma entrada sem
    // `nextRunAt`, invisível para a query do cron e que só sairia numa mudança de settings.
    if (!scheduleSnapshot.exists) {
      return;
    }

    const tokens = await readDeviceTokens(uid);

    await scheduleRef.update({ tokens });

    logger.info('tokens ressincronizados', { uid, tokenCount: tokens.length });
  },
);
