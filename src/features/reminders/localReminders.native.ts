import * as Notifications from 'expo-notifications';

const REMINDER_IDENTIFIER_PREFIX = 'reminder-';
const RECORD_DEEPLINK = 'bptracker://record';

const PERMISSION_DENIED_MESSAGE = 'Permita notificações nas configurações do aparelho para receber lembretes.';
const GENERIC_MESSAGE = 'Não foi possível agendar os lembretes neste aparelho.';

function reminderIdentifier(time: string): string {
  return `${REMINDER_IDENTIFIER_PREFIX}${time}`;
}

/**
 * Cancela só os lembretes que este recurso agenda (prefixo próprio), nunca
 * `cancelAllScheduledNotificationsAsync` — isso apagaria qualquer outra notificação local que o
 * app venha a agendar no futuro por outro motivo.
 */
async function cancelAllReminderNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const reminders = scheduled.filter((notification) => notification.identifier.startsWith(REMINDER_IDENTIFIER_PREFIX));

  await Promise.all(
    reminders.map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );
}

/**
 * Reforço local aos lembretes por push (PLAN §3.5): Doze mode e a otimização agressiva de
 * bateria de alguns fabricantes podem atrasar ou matar o FCM — o alarme local do sistema é mais
 * confiável para os mesmos horários.
 *
 * Sempre cancela TODOS os lembretes locais antes de recriar (nunca remove+adiciona horário a
 * horário), para nunca sobrar um agendamento órfão de uma edição anterior. O cancelamento roda
 * mesmo sem permissão — desligar/limpar lembretes não pode depender de permissão concedida.
 */
export async function syncLocalReminders(times: string[]): Promise<void> {
  try {
    await cancelAllReminderNotifications();

    if (times.length === 0) {
      return;
    }

    const permissions = await Notifications.getPermissionsAsync();

    if (permissions.status !== Notifications.PermissionStatus.GRANTED) {
      throw new Error(PERMISSION_DENIED_MESSAGE);
    }

    for (const time of times) {
      const [hour, minute] = time.split(':').map(Number);

      // Identifier estável por horário: reagendar o MESMO horário substitui o pedido anterior
      // em vez de duplicar; horários removidos já saíram no cancelamento acima.
      await Notifications.scheduleNotificationAsync({
        identifier: reminderIdentifier(time),
        content: {
          title: 'Hora de medir sua pressão',
          body: 'Toque para registrar agora.',
          data: { deeplink: RECORD_DEEPLINK },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message === PERMISSION_DENIED_MESSAGE) {
      throw error;
    }

    throw new Error(GENERIC_MESSAGE);
  }
}
