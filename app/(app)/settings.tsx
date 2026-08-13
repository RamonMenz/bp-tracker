import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Switch, useColorScheme, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import {
  BellIcon,
  ChevronRightIcon,
  ClockIcon,
  LogOutIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserRoundIcon,
} from '@/components/ui/icons';
import { useDeleteAccount } from '@/features/auth/useDeleteAccount';
import { useSession } from '@/features/auth/useSession';
import { useReminderSettings } from '@/features/reminders/useReminderSettings';
import { colors, resolveColorScheme } from '@/theme/colors';

// Placeholder deliberado — não é uma URL real. Substitua antes de publicar; até lá, o link abre
// um endereço que não existe, deixando óbvio (em vez de fingir sucesso) que falta configurar.
const PRIVACY_POLICY_URL = 'https://SUBSTITUIR-PELA-URL-REAL-DA-POLITICA-DE-PRIVACIDADE.exemplo';

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
  const { deleteAccount, isDeleting, error: deleteError } = useDeleteAccount();
  const scheme = resolveColorScheme(useColorScheme());
  const palette = colors[scheme];

  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [slots, setSlots] = useState<ReminderSlot[]>(DEFAULT_SLOTS);
  const [hasInitializedSlots, setHasInitializedSlots] = useState(false);
  const [openSlotIndex, setOpenSlotIndex] = useState<number | null>(null);

  useEffect(() => {
    if (settings !== null && !hasInitializedSlots) {
      // Semeia o estado local editável na PRIMEIRA chegada do listener assíncrono do Firestore —
      // a guarda hasInitializedSlots é o que impede reexecutar a cada atualização do settings e
      // sobrescrever uma edição do usuário ainda não salva.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  /**
   * Dupla confirmação deliberada: o primeiro diálogo explica o que será apagado, o segundo exige
   * um "sim" para a ação irreversível em si. Excluir dado de saúde não pode acontecer por um
   * toque acidental num botão vermelho.
   */
  function handleDeleteAccount(): void {
    Alert.alert(
      'Excluir minha conta?',
      'Serão apagados definitivamente: todas as suas medições, os horários de lembrete, os aparelhos registrados e sua conta de acesso.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Tem certeza?', 'Esta ação é irreversível. Seus dados não poderão ser recuperados.', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Excluir definitivamente',
                style: 'destructive',
                onPress: () => {
                  void (async () => {
                    const success = await deleteAccount();

                    if (success) {
                      // O auth gate leva para a tela de login assim que a sessão cai; o alerta
                      // fica por cima confirmando exatamente o que saiu do ar.
                      Alert.alert(
                        'Conta excluída',
                        'Suas medições, lembretes, aparelhos registrados e conta de acesso foram apagados.',
                      );
                    }
                  })();
                },
              },
            ]);
          },
        },
      ],
    );
  }

  async function handleOpenPrivacyPolicy(): Promise<void> {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert('Não foi possível abrir', 'Tente novamente mais tarde.');
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

  const switchTrackColor = { false: palette.border, true: palette.primary };

  return (
    <Screen>
      <Text variant="title">Ajustes</Text>

      <Card className="gap-4">
        <SectionHeader title="Lembretes" icon={BellIcon} />

        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text variant="body">Notificações</Text>
            <Text variant="caption">Avisos nos horários abaixo, para não esquecer de medir.</Text>
          </View>
          <Switch
            value={settings?.notificationsEnabled ?? false}
            onValueChange={(value) => void toggleNotifications(value)}
            disabled={isSaving}
            trackColor={switchTrackColor}
            accessibilityLabel="Ativar notificações de lembrete"
          />
        </View>

        <View className="gap-2">
          {slots.map((slot, index) => (
            <View
              key={index}
              className="flex-row items-center justify-between gap-3 rounded-2xl bg-light-bg px-3 py-2 dark:bg-dark-bg"
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Horário ${index + 1}: ${slot.time}. Toque para editar.`}
                onPress={() => setOpenSlotIndex(index)}
                className="min-h-[48px] flex-1 flex-row items-center gap-2.5"
              >
                <ClockIcon size={18} color={slot.enabled ? palette.primary : palette.muted} strokeWidth={2.25} />
                <Text
                  variant="sectionHeader"
                  color={slot.enabled ? undefined : palette.muted}
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {slot.time}
                </Text>
                <ChevronRightIcon size={16} color={palette.muted} strokeWidth={2} />
              </Pressable>

              <Switch
                value={slot.enabled}
                onValueChange={(value) => handleToggleSlot(index, value)}
                trackColor={switchTrackColor}
                accessibilityLabel={`Ativar horário ${index + 1}`}
              />
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

        <Button label="Salvar horários" onPress={handleSaveTimes} loading={isSaving} />

        {error ? (
          <Text variant="caption" accessibilityRole="alert" color={palette.danger}>
            {error}
          </Text>
        ) : null}
      </Card>

      <Card className="gap-4">
        <SectionHeader title="Conta" icon={UserRoundIcon} />

        <Button label="Sair" variant="secondary" icon={LogOutIcon} onPress={handleSignOut} loading={isSigningOut} />

        {signOutError ? (
          <Text variant="caption" accessibilityRole="alert" color={palette.danger}>
            {signOutError}
          </Text>
        ) : null}

        <View className="gap-2">
          <Text variant="caption">
            Excluir a conta apaga definitivamente todas as suas medições, lembretes e aparelhos registrados.
          </Text>
          <Button
            label="Excluir minha conta"
            variant="destructive"
            icon={TrashIcon}
            onPress={handleDeleteAccount}
            loading={isDeleting}
          />
        </View>

        {deleteError ? (
          <Text variant="caption" accessibilityRole="alert" color={palette.danger}>
            {deleteError}
          </Text>
        ) : null}
      </Card>

      <Card className="gap-4">
        <SectionHeader title="Privacidade" icon={ShieldCheckIcon} />

        <Disclaimer />

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Abrir política de privacidade"
          onPress={() => void handleOpenPrivacyPolicy()}
          className="min-h-[48px] flex-row items-center justify-between gap-2"
        >
          <Text variant="body" color={palette.primary} style={{ fontWeight: '600' }}>
            Política de privacidade
          </Text>
          <ChevronRightIcon size={18} color={palette.primary} strokeWidth={2.25} />
        </Pressable>
      </Card>
    </Screen>
  );
}
