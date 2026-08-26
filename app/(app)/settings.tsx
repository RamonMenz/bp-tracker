import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { InlineFeedback } from '@/components/ui/InlineFeedback';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import {
  BellIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  ClockIcon,
  LogOutIcon,
  MoonIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  SunIcon,
  SunMoonIcon,
  TrashIcon,
  UserRoundIcon,
  type LucideIcon,
} from '@/components/ui/icons';
import { useDeleteAccount } from '@/features/auth/useDeleteAccount';
import { useSession } from '@/features/auth/useSession';
import type { PushUnavailableReason } from '@/features/reminders/pushAvailability';
import { useReminderSettings } from '@/features/reminders/useReminderSettings';
import { useThemePreference } from '@/features/theme/useThemePreference';
import type { ThemePreference } from '@/features/theme/theme-preference.storage';
import { colors } from '@/theme/colors';
import { useColorScheme } from '@/theme/useColorScheme';

// Placeholder deliberado — não é uma URL real. Substitua antes de publicar; até lá, o link abre
// um endereço que não existe, deixando óbvio (em vez de fingir sucesso) que falta configurar.
const PRIVACY_POLICY_URL = 'https://SUBSTITUIR-PELA-URL-REAL-DA-POLITICA-DE-PRIVACIDADE.exemplo';

/**
 * Identificador estável do slot, não a posição na lista (CLAUDE.md §3.4 proíbe key por índice).
 * DEFAULT_SLOTS é fixa e nunca reordena hoje, mas o índice quebraria silenciosamente no dia em
 * que isso deixasse de ser verdade — o nome descreve o horário fixo de cada slot (08:00/14:00/
 * 20:00), então também documenta a si mesmo.
 */
type ReminderSlotId = 'morning' | 'afternoon' | 'evening';

interface ReminderSlot {
  id: ReminderSlotId;
  enabled: boolean;
  time: string;
}

/**
 * Qual diálogo está aberto. Um estado só, e não um booleano por diálogo, porque eles são
 * mutuamente exclusivos por natureza — inclusive os dois passos da exclusão de conta.
 */
type OpenDialog =
  | 'deleteAccount'
  | 'deleteAccountConfirm'
  | 'accountDeleted'
  | 'privacyPolicyFailed'
  | null;

/**
 * Copy do popup exibido quando `pushUnavailableReason` (useReminderSettings) vem preenchido — o
 * navegador/ambiente, não o usuário, é o motivo de não dar para ativar notificações agora.
 * Mensagens em terceira pessoa amigável (CLAUDE.md §4.3) e sem jargão técnico ("VAPID key",
 * "service worker"): quem lê é o usuário final, não quem for depurar (esse já tem a mensagem
 * técnica original em `error`/nos logs).
 */
const PUSH_UNAVAILABLE_COPY: Record<PushUnavailableReason, { title: string; message: string }> = {
  'not-configured': {
    title: 'Notificações ainda não disponíveis aqui',
    message:
      'Isso não é um problema no seu aparelho: as notificações push da web ainda não foram configuradas neste ambiente. Assim que estiverem prontas, o toque de "Notificações" volta a funcionar sem precisar fazer mais nada aqui.\n\nEnquanto isso, para não esquecer de medir nos horários definidos abaixo, você pode:\n\n• Configurar um alarme no celular para os mesmos horários.\n• Criar lembretes no Google Agenda ou no app de calendário que você já usa.',
  },
  'browser-unsupported': {
    title: 'Este navegador não oferece notificações push',
    message:
      'Alguns navegadores — modo anônimo, versões antigas, ou alguns navegadores do iPhone — não têm suporte a notificações push na web.\n\nEnquanto isso, para não esquecer de medir nos horários definidos abaixo, você pode:\n\n• Configurar um alarme no celular para os mesmos horários.\n• Criar lembretes no Google Agenda ou no app de calendário que você já usa.\n• Tentar de novo no Chrome ou no Firefox atualizados, ou instalar o app no Android.',
  },
};

const SAVE_TIMES_SUCCESS_MESSAGE = 'Horários salvos.';
/** Some sozinho depois de um tempo — confirmação é feedback de passagem, não um estado que fica
 *  preso na tela até a próxima ação do usuário. */
const SAVE_TIMES_SUCCESS_TIMEOUT_MS = 4000;

interface ThemeOption {
  value: ThemePreference;
  label: string;
  icon: LucideIcon;
}

/**
 * "Automático" em vez de "Sistema": é o vocabulário que o público do app (que inclui pessoas
 * idosas, CLAUDE.md §4.7) entende sem precisar saber o que é "o sistema".
 */
const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Claro', icon: SunIcon },
  { value: 'dark', label: 'Escuro', icon: MoonIcon },
  { value: 'system', label: 'Automático', icon: SmartphoneIcon },
];

const DEFAULT_SLOTS: ReminderSlot[] = [
  { id: 'morning', enabled: true, time: '08:00' },
  { id: 'afternoon', enabled: true, time: '14:00' },
  { id: 'evening', enabled: true, time: '20:00' },
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
    // Spread preserva o `id` do default — a posição na lista continua definindo qual slot é qual
    // (a ordenação por horário garante isso), só a key de React deixa de vir do índice.
    return time !== undefined ? { ...defaultSlot, enabled: true, time } : { ...defaultSlot, enabled: false };
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
  const router = useRouter();
  const { signOut, isLoading: isSigningOut } = useSession();
  const {
    settings,
    updateReminderTimes,
    toggleNotifications,
    isSaving,
    error,
    pushUnavailableReason,
    dismissPushUnavailable,
  } = useReminderSettings();
  const { deleteAccount, isDeleting, error: deleteError } = useDeleteAccount();
  const { preference: themePreference, setPreference: setThemePreference } = useThemePreference();
  const scheme = useColorScheme();
  const palette = colors[scheme];

  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [slots, setSlots] = useState<ReminderSlot[]>(DEFAULT_SLOTS);
  const [hasInitializedSlots, setHasInitializedSlots] = useState(false);
  const [openSlotIndex, setOpenSlotIndex] = useState<number | null>(null);
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const [showSaveTimesSuccess, setShowSaveTimesSuccess] = useState(false);

  useEffect(() => {
    if (!showSaveTimesSuccess) {
      return;
    }

    const timeout = setTimeout(() => setShowSaveTimesSuccess(false), SAVE_TIMES_SUCCESS_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [showSaveTimesSuccess]);

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
   * toque acidental num botão vermelho. Os dois passos seguem em sequência — `deleteAccount`
   * (abaixo) só roda depois do segundo.
   */
  function handleDeleteAccount(): void {
    setOpenDialog('deleteAccount');
  }

  async function handleConfirmDeleteAccount(): Promise<void> {
    setOpenDialog(null);

    const success = await deleteAccount();

    if (success) {
      setOpenDialog('accountDeleted');
      // Diferença conhecida em relação ao Alert nativo que existia aqui: aquele era um diálogo do
      // sistema e sobrevivia à saída da tela; este vive na árvore desta tela, e o auth gate
      // (useAuthRedirect) faz `router.replace` para o login assim que a sessão cai. O aviso pode,
      // portanto, sair junto com a tela. Mantê-lo depois disso exigiria um host de diálogo no
      // layout raiz — mudança maior, fora do escopo desta correção.
    }
  }

  /**
   * Navegação direta, sem passar por `useOnboardingGate` nem chamar `markOnboardingSeen` — a
   * marca de "já viu" já foi gravada na primeira exibição (automática ou não) e não deve ser
   * escrita de novo aqui. `push`, não `replace`: veio de dentro do app por escolha do usuário,
   * "Voltar" precisa devolver para Ajustes normalmente — diferente da entrada automática em
   * `app/onboarding.tsx`, que sempre usa `replace`.
   */
  function handleOpenOnboarding(): void {
    router.push('/onboarding');
  }

  async function handleOpenPrivacyPolicy(): Promise<void> {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      setOpenDialog('privacyPolicyFailed');
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

    setShowSaveTimesSuccess(false);

    const success = await updateReminderTimes(reminderTimes);

    if (success) {
      setShowSaveTimesSuccess(true);
    }
  }

  // Truthy check (não `!== null`) de propósito: cobre também `undefined`, o valor que um mock de
  // teste desatualizado devolveria para um campo novo do hook — evita indexar
  // PUSH_UNAVAILABLE_COPY com uma chave inexistente e quebrar em runtime.
  const pushUnavailableCopy = pushUnavailableReason ? PUSH_UNAVAILABLE_COPY[pushUnavailableReason] : null;

  const switchTrackColor = { false: palette.border, true: palette.primary };
  // O thumb padrão do react-native-web é verde (#009688) e destoa da trilha azul; fixar em branco
  // (claro) e no tom de superfície (escuro) mantém o controle dentro da paleta.
  const switchThumbColor = scheme === 'light' ? '#FFFFFF' : palette.text;

  // `thumbColor` sozinho só pinta o estado DESLIGADO na web: o react-native-web tem uma prop
  // separada, `activeThumbColor`, para o ligado — e ela não existe na tipagem do RN porque no
  // nativo `thumbColor` já cobre os dois estados. Daí o spread condicional por plataforma.
  const switchThumbProps: Record<string, string> =
    Platform.OS === 'web' ? { activeThumbColor: switchThumbColor } : {};

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
          {/* O Switch nativo mede ~34×20dp (Android) / ~51×31dp (iOS) — abaixo do alvo de toque
              mínimo de 48×48dp do CLAUDE.md §4.7. Este Pressable é quem recebe o toque e a
              semântica de acessibilidade; o Switch por dentro só desenha o estado visual (ver
              pointerEvents/importantForAccessibility abaixo). */}
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Ativar notificações de lembrete"
            accessibilityState={{ disabled: isSaving, checked: settings?.notificationsEnabled ?? false }}
            disabled={isSaving}
            onPress={() => void toggleNotifications(!(settings?.notificationsEnabled ?? false))}
            className="h-12 w-12 items-center justify-center"
          >
            <Switch
              value={settings?.notificationsEnabled ?? false}
              disabled={isSaving}
              trackColor={switchTrackColor}
              thumbColor={switchThumbColor}
              ios_backgroundColor={palette.border}
              {...switchThumbProps}
              pointerEvents="none"
              importantForAccessibility="no-hide-descendants"
            />
          </Pressable>
        </View>

        <View className="gap-2">
          {slots.map((slot, index) => (
            <View
              key={slot.id}
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

              <Pressable
                accessibilityRole="switch"
                accessibilityLabel={`Ativar horário ${index + 1}`}
                accessibilityState={{ checked: slot.enabled }}
                onPress={() => handleToggleSlot(index, !slot.enabled)}
                className="h-12 w-12 items-center justify-center"
              >
                <Switch
                  value={slot.enabled}
                  trackColor={switchTrackColor}
                  thumbColor={switchThumbColor}
                  ios_backgroundColor={palette.border}
                  {...switchThumbProps}
                  pointerEvents="none"
                  importantForAccessibility="no-hide-descendants"
                />
              </Pressable>
            </View>
          ))}
        </View>

        {openSlotIndex !== null ? (
          <DateTimeField
            value={timeStringToDate(slots[openSlotIndex].time)}
            mode="time"
            minuteInterval={15}
            accessibilityLabel={`Horário ${openSlotIndex + 1}`}
            onChange={(date) => handleChangeSlotTime(openSlotIndex, date)}
            onClose={() => setOpenSlotIndex(null)}
          />
        ) : null}

        <Button label="Salvar horários" onPress={handleSaveTimes} loading={isSaving} />

        {error ? (
          <InlineFeedback tone="danger" message={error} />
        ) : showSaveTimesSuccess ? (
          <InlineFeedback tone="success" message={SAVE_TIMES_SUCCESS_MESSAGE} />
        ) : null}
      </Card>

      <Card className="gap-4">
        <SectionHeader title="Aparência" icon={SunMoonIcon} />

        <Text variant="caption">Escolha o tema do app neste aparelho.</Text>

        {/* radiogroup + radio é a semântica correta para "escolha uma entre três": o leitor de
            tela anuncia "opção 2 de 3, marcada", em vez de tratar cada botão como isolado. */}
        <View className="flex-row gap-2" accessibilityRole="radiogroup">
          {THEME_OPTIONS.map((option) => {
            const isActive = themePreference === option.value;
            const OptionIcon = option.icon;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ checked: isActive, selected: isActive }}
                onPress={() => setThemePreference(option.value)}
                // min-h-[48px] + py-3 garantem o alvo de toque de 48dp do CLAUDE.md §4.7 mesmo com
                // a fonte no menor tamanho; flex-1 divide a largura igualmente entre as três.
                className="min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-2xl border py-3"
                style={{
                  backgroundColor: isActive ? palette.primaryTint : palette.bg,
                  borderColor: isActive ? palette.primary : palette.border,
                }}
              >
                <OptionIcon
                  size={20}
                  color={isActive ? palette.primary : palette.muted}
                  strokeWidth={2.25}
                />
                <Text
                  variant="caption"
                  color={isActive ? palette.primary : palette.muted}
                  style={{ fontWeight: isActive ? '700' : '500' }}
                >
                  {option.label}
                </Text>
                {/* O estado marcado NÃO pode se distinguir só por cor (CLAUDE.md §4.7): o ícone de
                    check é a forma que carrega a mesma informação para quem não diferencia os tons.
                    A altura fica reservada nas três opções para o texto não pular ao trocar. */}
                <View className="h-4 justify-center">
                  {isActive ? <CheckIcon size={14} color={palette.primary} strokeWidth={2.5} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card className="gap-4">
        <SectionHeader title="Ajuda" icon={CircleHelpIcon} />

        {/* Atalho para reabrir o onboarding a qualquer momento — mesmo padrão visual da linha
            "Política de privacidade" no Card "Privacidade" logo abaixo: texto em destaque na cor
            primária, com chevron também primário. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Como usar o app"
          onPress={handleOpenOnboarding}
          className="min-h-[48px] flex-row items-center justify-between gap-2"
        >
          <Text variant="body" color={palette.primary} style={{ fontWeight: '600' }}>
            Como usar o app
          </Text>
          <ChevronRightIcon size={18} color={palette.primary} strokeWidth={2.25} />
        </Pressable>
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
            variant="destructiveOutline"
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

      {/* Passo 1 da exclusão de conta: explica o que será apagado e só encaminha para o passo 2. */}
      <ConfirmDialog
        visible={openDialog === 'deleteAccount'}
        title="Excluir minha conta?"
        message="Serão apagados definitivamente: todas as suas medições, os horários de lembrete, os aparelhos registrados e sua conta de acesso."
        confirmLabel="Continuar"
        isDestructive
        onConfirm={() => setOpenDialog('deleteAccountConfirm')}
        onCancel={() => setOpenDialog(null)}
      />

      {/* Passo 2: o "sim" para a ação irreversível em si — é este que dispara deleteAccount. */}
      <ConfirmDialog
        visible={openDialog === 'deleteAccountConfirm'}
        title="Tem certeza?"
        message="Esta ação é irreversível. Seus dados não poderão ser recuperados."
        confirmLabel="Excluir definitivamente"
        isDestructive
        onConfirm={() => void handleConfirmDeleteAccount()}
        onCancel={() => setOpenDialog(null)}
      />

      {/* Avisos: sem onCancel, um botão só, equivalente ao Alert de mensagem única. */}
      <ConfirmDialog
        visible={openDialog === 'accountDeleted'}
        title="Conta excluída"
        message="Suas medições, lembretes, aparelhos registrados e conta de acesso foram apagados."
        confirmLabel="OK"
        onConfirm={() => setOpenDialog(null)}
      />

      <ConfirmDialog
        visible={openDialog === 'privacyPolicyFailed'}
        title="Não foi possível abrir"
        message="Tente novamente mais tarde."
        confirmLabel="OK"
        onConfirm={() => setOpenDialog(null)}
      />

      {/* Aberto pelo estado do hook (não pelo OpenDialog local), porque quem decide abrir é o
          resultado assíncrono de toggleNotifications, não um toque direto num botão desta tela. */}
      <ConfirmDialog
        visible={pushUnavailableCopy !== null}
        title={pushUnavailableCopy?.title ?? ''}
        message={pushUnavailableCopy?.message ?? ''}
        confirmLabel="Entendi"
        onConfirm={dismissPushUnavailable}
      />
    </Screen>
  );
}
