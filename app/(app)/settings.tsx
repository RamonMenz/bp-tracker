import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { Pressable, Switch, useColorScheme, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useSession } from '@/features/auth/useSession';
import { useReminderSettings } from '@/features/reminders/useReminderSettings';
import { colors } from '@/theme/colors';

interface ReminderSlot {
  enabled: boolean;
  time: string;
}

const DEFAULT_SLOTS: ReminderSlot[] = [
  { enabled: true, time: '08:00' },
  { enabled: true, time: '14:00' },
  { enabled: true, time: '20:00' },
];

function slotsFromReminderTimes(times: string[]): ReminderSlot[] {
  // reminderTimes vazio é o estado de um usuário que nunca configurou lembretes (ensureUserProfile
  // grava [] no primeiro login) — o default pedido (08:00/14:00/20:00) precisa vir habilitado,
  // não como só um placeholder desligado.
  if (times.length === 0) {
    return DEFAULT_SLOTS;
  }

  const sorted = [...times].sort();

  return DEFAULT_SLOTS.map((defaultSlot, index) => {
    const time = sorted[index];
    return time !== undefined ? { enabled: true, time } : { enabled: false, time: defaultSlot.time };
  });
}

function timeStringToDate(time: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function dateToTimeString(date: Date): string {
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

export default function SettingsScreen() {
  const { signOut, isLoading: isSigningOut } = useSession();
  const { settings, updateReminderTimes, toggleNotifications, isSaving, error } = useReminderSettings();
  const scheme = useColorScheme() ?? 'light';

  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [slots, setSlots] = useState<ReminderSlot[]>(DEFAULT_SLOTS);
  const [hasInitializedSlots, setHasInitializedSlots] = useState(false);
  const [openSlotIndex, setOpenSlotIndex] = useState<number | null>(null);

  useEffect(() => {
    if (settings !== null && !hasInitializedSlots) {
      setSlots(slotsFromReminderTimes(settings.reminderTimes));
      setHasInitializedSlots(true);
    }
  }, [settings, hasInitializedSlots]);

  async function handleSignOut(): Promise<void> {
    setSignOutError(null);
    try {
      await signOut();
    } catch (signOutErr) {
      setSignOutError(signOutErr instanceof Error ? signOutErr.message : 'Não foi possível sair. Tente novamente.');
    }
  }

  function handleToggleSlot(index: number, enabled: boolean): void {
    setSlots((current) => current.map((slot, slotIndex) => (slotIndex === index ? { ...slot, enabled } : slot)));
  }

  function handleChangeSlotTime(index: number, date: Date): void {
    setSlots((current) =>
      current.map((slot, slotIndex) => (slotIndex === index ? { ...slot, time: dateToTimeString(date) } : slot)),
    );
  }

  async function handleSaveTimes(): Promise<void> {
    const reminderTimes = slots
      .filter((slot) => slot.enabled)
      .map((slot) => slot.time)
      .sort();

    await updateReminderTimes(reminderTimes);
  }

  return (
    <Screen>
      <Text variant="title">Ajustes</Text>

      <Text variant="sectionHeader" className="mt-6">
        Lembretes
      </Text>

      <View className="mt-2 flex-row items-center justify-between">
        <Text variant="body">Notificações</Text>
        <Switch
          value={settings?.notificationsEnabled ?? false}
          onValueChange={(value) => void toggleNotifications(value)}
          disabled={isSaving}
          accessibilityLabel="Ativar notificações de lembrete"
        />
      </View>

      <View className="mt-4 gap-3">
        {slots.map((slot, index) => (
          <View key={index} className="flex-row items-center justify-between">
            <Switch
              value={slot.enabled}
              onValueChange={(value) => handleToggleSlot(index, value)}
              accessibilityLabel={`Ativar horário ${index + 1}`}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Horário ${index + 1}: ${slot.time}. Toque para editar.`}
              onPress={() => setOpenSlotIndex(index)}
              className="min-h-[48px] flex-1 items-center justify-center"
            >
              <Text variant="body">{slot.time}</Text>
            </Pressable>
          </View>
        ))}
      </View>

      {openSlotIndex !== null ? (
        <DateTimePicker
          value={timeStringToDate(slots[openSlotIndex].time)}
          mode="time"
          minuteInterval={15}
          onChange={(_event, date) => {
            setOpenSlotIndex(null);
            if (date) {
              handleChangeSlotTime(openSlotIndex, date);
            }
          }}
        />
      ) : null}

      <Button label="Salvar horários" onPress={handleSaveTimes} loading={isSaving} className="mt-4" />

      {error ? (
        <Text variant="caption" accessibilityRole="alert" color={colors[scheme].danger} className="mt-2">
          {error}
        </Text>
      ) : null}

      <Button
        label="Sair"
        variant="destructive"
        onPress={handleSignOut}
        loading={isSigningOut}
        className="mt-8"
      />
      {signOutError ? (
        <Text variant="caption" accessibilityRole="alert" color={colors[scheme].danger} className="mt-2">
          {signOutError}
        </Text>
      ) : null}
    </Screen>
  );
}
