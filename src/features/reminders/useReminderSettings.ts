import { useEffect, useState } from 'react';

import { useSession } from '@/features/auth/useSession';

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
}

const NOT_SIGNED_IN_MESSAGE = 'Sessão expirada. Faça login novamente.';
const GENERIC_MESSAGE = 'Não foi possível salvar suas preferências. Tente novamente.';

export function useReminderSettings(): UseReminderSettingsResult {
  const { user } = useSession();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user === null) {
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

  async function updateReminderTimes(reminderTimes: string[]): Promise<boolean> {
    return persist({
      reminderTimes,
      notificationsEnabled: settings?.notificationsEnabled ?? false,
    });
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

    if (!enabled) {
      return persist({ reminderTimes: settings?.reminderTimes ?? [], notificationsEnabled: false });
    }

    setError(null);
    setIsSaving(true);

    try {
      await registerPushToken(user.uid);
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : GENERIC_MESSAGE);
      setIsSaving(false);
      return false;
    }

    return persist({ reminderTimes: settings?.reminderTimes ?? [], notificationsEnabled: true });
  }

  return { settings, updateReminderTimes, toggleNotifications, isSaving, error };
}
