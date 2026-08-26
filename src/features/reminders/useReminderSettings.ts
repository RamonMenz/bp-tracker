import { useEffect, useState } from 'react';

import { useSession } from '@/features/auth/useSession';

import { syncLocalReminders } from './localReminders';
import { PushUnavailableError, type PushUnavailableReason } from './pushAvailability';
import { registerPushToken } from './registerPushToken';
import {
  mapReminderSubscribeError,
  subscribeReminderSettings,
  writeReminderSettings,
  type ReminderSettings,
} from './reminders.repo';

export interface UseReminderSettingsResult {
  settings: ReminderSettings | null;
  updateReminderTimes: (reminderTimes: string[]) => Promise<boolean>;
  toggleNotifications: (enabled: boolean) => Promise<boolean>;
  isSaving: boolean;
  error: string | null;
  /** Motivo do AMBIENTE (não erro transiente) pelo qual o push não pôde ser ativado — a tela usa
   *  isto para abrir o popup explicativo em vez do InlineFeedback vermelho de `error`. */
  pushUnavailableReason: PushUnavailableReason | null;
  dismissPushUnavailable: () => void;
}

const NOT_SIGNED_IN_MESSAGE = 'Sessão expirada. Faça login novamente.';
const GENERIC_MESSAGE = 'Não foi possível salvar suas preferências. Tente novamente.';

export function useReminderSettings(): UseReminderSettingsResult {
  const { user } = useSession();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushUnavailableReason, setPushUnavailableReason] = useState<PushUnavailableReason | null>(null);

  useEffect(() => {
    if (user === null) {
      // Reset ao encerrar a sessão que assina o subscribeReminderSettings abaixo — sincroniza
      // com o desligamento do listener externo, não deriva estado do render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettings(null);
      return;
    }

    const unsubscribe = subscribeReminderSettings(
      user.uid,
      (next) => setSettings(next),
      (subscribeError) => setError(mapReminderSubscribeError(subscribeError)),
    );

    return unsubscribe;
  }, [user]);

  async function persist(next: ReminderSettings): Promise<boolean> {
    if (user === null) {
      setError(NOT_SIGNED_IN_MESSAGE);
      return false;
    }

    setError(null);
    setIsSaving(true);

    try {
      await writeReminderSettings(user.uid, next);
      return true;
    } catch (writeError) {
      setError(writeError instanceof Error ? writeError.message : GENERIC_MESSAGE);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Sincroniza os lembretes locais depois de um save que já deu certo no Firestore. O local é
   * um reforço (PLAN §3.5), não a fonte de verdade — se ele falhar, o save em si continua válido
   * (retorna `true`), só o erro amigável do agendamento local aparece em `error`.
   */
  async function syncLocalRemindersAfterSave(reminderTimes: string[]): Promise<void> {
    try {
      await syncLocalReminders(reminderTimes);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : GENERIC_MESSAGE);
    }
  }

  async function updateReminderTimes(reminderTimes: string[]): Promise<boolean> {
    const success = await persist({
      reminderTimes,
      notificationsEnabled: settings?.notificationsEnabled ?? false,
    });

    if (success) {
      await syncLocalRemindersAfterSave(reminderTimes);
    }

    return success;
  }

  /**
   * Permissão e token só são pedidos aqui, ao ativar o switch — nunca no primeiro launch do app.
   * Se a permissão for negada ou o registro do token falhar, `notificationsEnabled` não muda:
   * melhor o switch continuar desligado do que mentir que está ativo sem token nenhum salvo.
   */
  async function toggleNotifications(enabled: boolean): Promise<boolean> {
    if (user === null) {
      setError(NOT_SIGNED_IN_MESSAGE);
      return false;
    }

    const reminderTimes = settings?.reminderTimes ?? [];

    if (!enabled) {
      const success = await persist({ reminderTimes, notificationsEnabled: false });

      if (success) {
        await syncLocalRemindersAfterSave([]);
      }

      return success;
    }

    setError(null);
    setPushUnavailableReason(null);
    setIsSaving(true);

    try {
      await registerPushToken(user.uid);
    } catch (registerError) {
      // PushUnavailableError é do AMBIENTE (navegador sem suporte / VAPID key não configurada) —
      // vira o popup explicativo, não o InlineFeedback genérico: tentar de novo não resolve.
      if (registerError instanceof PushUnavailableError) {
        setPushUnavailableReason(registerError.reason);
      } else {
        setError(registerError instanceof Error ? registerError.message : GENERIC_MESSAGE);
      }

      setIsSaving(false);
      return false;
    }

    const success = await persist({ reminderTimes, notificationsEnabled: true });

    if (success) {
      await syncLocalRemindersAfterSave(reminderTimes);
    }

    return success;
  }

  function dismissPushUnavailable(): void {
    setPushUnavailableReason(null);
  }

  return {
    settings,
    updateReminderTimes,
    toggleNotifications,
    isSaving,
    error,
    pushUnavailableReason,
    dismissPushUnavailable,
  };
}
