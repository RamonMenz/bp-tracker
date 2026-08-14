import { syncLocalReminders } from './localReminders.web';

/**
 * Regressão: expo-notifications não tem NotificationScheduler na web (só um stub sem
 * getAllScheduledNotificationsAsync/scheduleNotificationAsync — ver comentário no arquivo). Antes
 * desta correção, chamar a versão nativa daqui estourava e useReminderSettings.ts convertia isso
 * num falso "não foi possível agendar os lembretes" por cima de um salvamento que já tinha dado
 * certo no Firestore. syncLocalReminders precisa resolver sem lançar, sempre — mesmo com horários
 * para agendar de verdade, que é justamente o caso em que a versão nativa faria chamadas reais.
 */
describe('syncLocalReminders (web)', () => {
  it('resolve sem lançar para uma lista de horários não vazia', async () => {
    await expect(syncLocalReminders(['08:00', '14:00', '20:00'])).resolves.toBeUndefined();
  });

  it('resolve sem lançar para lista vazia', async () => {
    await expect(syncLocalReminders([])).resolves.toBeUndefined();
  });
});
