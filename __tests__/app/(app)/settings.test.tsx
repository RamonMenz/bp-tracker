import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// Fora de src/ (não elegível para o alias @/) — aponta para o arquivo de rota real em
// app/(app)/settings.tsx. Este teste vive em __tests__/ (fora da árvore que o Expo Router varre)
// porque um .test.tsx dentro de app/(app)/ vira rota de verdade e aparece como item extra na
// barra de abas — ver commit que moveu este arquivo para cá.
import SettingsScreen from '../../../app/(app)/settings';

const toggleNotificationsMock = jest.fn<Promise<boolean>, [boolean]>();
const updateReminderTimesMock = jest.fn<Promise<boolean>, [string[]]>();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/features/auth/useSession', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/features/reminders/useReminderSettings', () => ({
  useReminderSettings: jest.fn(),
}));

jest.mock('@/features/auth/useDeleteAccount', () => ({
  useDeleteAccount: jest.fn(),
}));

// Mesmo motivo dos mocks acima: a tela consome o contexto de tema, e estes testes são sobre os
// switches de lembrete — não sobre o tema. O seletor de tema tem cobertura própria em
// __tests__/features/theme/, com o provider de verdade.
jest.mock('@/features/theme/useThemePreference', () => ({
  useThemePreference: jest.fn(),
}));

const { useSession } = jest.requireMock('@/features/auth/useSession') as {
  useSession: jest.Mock;
};
const { useReminderSettings } = jest.requireMock('@/features/reminders/useReminderSettings') as {
  useReminderSettings: jest.Mock;
};
const { useDeleteAccount } = jest.requireMock('@/features/auth/useDeleteAccount') as {
  useDeleteAccount: jest.Mock;
};
const { useThemePreference } = jest.requireMock('@/features/theme/useThemePreference') as {
  useThemePreference: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();

  useSession.mockReturnValue({ signOut: jest.fn(), isLoading: false });
  useReminderSettings.mockReturnValue({
    settings: { notificationsEnabled: false, reminderTimes: ['08:00', '14:00', '20:00'] },
    updateReminderTimes: updateReminderTimesMock,
    toggleNotifications: toggleNotificationsMock,
    isSaving: false,
    error: null,
    pushUnavailableReason: null,
    dismissPushUnavailable: jest.fn(),
  });
  useDeleteAccount.mockReturnValue({ deleteAccount: jest.fn(), isDeleting: false, error: null });
  useThemePreference.mockReturnValue({ preference: 'system', setPreference: jest.fn() });
});

/**
 * O Switch nativo do RN mede menos que o alvo de toque mínimo de 48×48dp exigido pelo CLAUDE.md
 * §4.7 — quem responde ao toque e é anunciado pelo leitor de tela passou a ser um Pressable de
 * 48dp por fora, com o Switch dentro dele só desenhando o estado visual
 * (pointerEvents="none"/importantForAccessibility="no-hide-descendants"). Os testes abaixo cobrem
 * exatamente essa migração: o controle é localizado pelo rótulo/role "switch" — não pelo tipo do
 * Switch — e o toque nele precisa disparar a mesma lógica que antes vivia em onValueChange.
 */
describe('SettingsScreen — alvo de toque dos switches', () => {
  it('chama toggleNotifications ao tocar no controle de notificações', async () => {
    await render(<SettingsScreen />);

    const toggle = screen.getByRole('switch', { name: 'Ativar notificações de lembrete' });
    fireEvent.press(toggle);

    expect(toggleNotificationsMock).toHaveBeenCalledTimes(1);
    expect(toggleNotificationsMock).toHaveBeenCalledWith(true);
  });

  it('chama o toggle do slot ao tocar no controle de um horário', async () => {
    await render(<SettingsScreen />);

    fireEvent.press(screen.getByRole('switch', { name: 'Ativar horário 1' }));

    // handleToggleSlot é estado local (não sai para um mock) — o efeito observável é o
    // accessibilityState refletindo o novo valor após o toque, já que o slot 1 nasce habilitado.
    // setSlots reflete no accessibilityState só depois do próximo flush, daí o findByRole no lugar
    // de getByRole — reconsultar sincronamente pegaria o nó antes do re-render.
    const toggleAfter = await screen.findByRole('switch', { name: 'Ativar horário 1' });
    await waitFor(() => expect(toggleAfter.props.accessibilityState?.checked).toBe(false));
  });

  it('não chama toggleNotifications ao tocar no controle desabilitado durante o salvamento', async () => {
    useReminderSettings.mockReturnValue({
      settings: { notificationsEnabled: false, reminderTimes: ['08:00', '14:00', '20:00'] },
      updateReminderTimes: updateReminderTimesMock,
      toggleNotifications: toggleNotificationsMock,
      isSaving: true,
      error: null,
      pushUnavailableReason: null,
      dismissPushUnavailable: jest.fn(),
    });

    await render(<SettingsScreen />);

    const toggle = screen.getByRole('switch', { name: 'Ativar notificações de lembrete' });
    expect(toggle.props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(toggle);

    expect(toggleNotificationsMock).not.toHaveBeenCalled();
  });
});

describe('SettingsScreen — atalho para reabrir o onboarding', () => {
  /**
   * Navegação direta: `router.push` (não `replace`, ao contrário da entrada automática em
   * `app/onboarding.tsx`) e sem qualquer chamada a `markOnboardingSeen` ou `useOnboardingGate` —
   * a marca de "já viu" já existe desde a primeira exibição, e este atalho não deve reescrevê-la.
   */
  it('navega para /onboarding ao tocar em "Como usar o app"', async () => {
    await render(<SettingsScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Como usar o app' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/onboarding');
  });
});
