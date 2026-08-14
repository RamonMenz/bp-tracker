import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { colorScheme } from 'nativewind';

import { THEME_PREFERENCE_KEY } from '@/features/theme/theme-preference.storage';
import { ThemePreferenceProvider } from '@/features/theme/useThemePreference';

import SettingsScreen from '../../app/(app)/settings';

jest.mock('@/features/auth/useSession', () => ({ useSession: jest.fn() }));
jest.mock('@/features/reminders/useReminderSettings', () => ({ useReminderSettings: jest.fn() }));
jest.mock('@/features/auth/useDeleteAccount', () => ({ useDeleteAccount: jest.fn() }));

const { useSession } = jest.requireMock('@/features/auth/useSession') as { useSession: jest.Mock };
const { useReminderSettings } = jest.requireMock('@/features/reminders/useReminderSettings') as {
  useReminderSettings: jest.Mock;
};
const { useDeleteAccount } = jest.requireMock('@/features/auth/useDeleteAccount') as {
  useDeleteAccount: jest.Mock;
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  // Observable de módulo do NativeWind — sem reset, o tema de um teste vaza para o próximo.
  colorScheme.set('system');

  useSession.mockReturnValue({ signOut: jest.fn(), isLoading: false });
  useReminderSettings.mockReturnValue({
    settings: { notificationsEnabled: false, reminderTimes: ['08:00', '14:00', '20:00'] },
    updateReminderTimes: jest.fn(),
    toggleNotifications: jest.fn(),
    isSaving: false,
    error: null,
  });
  useDeleteAccount.mockReturnValue({ deleteAccount: jest.fn(), isDeleting: false, error: null });
});

/**
 * Aqui o provider é o de VERDADE (diferente de __tests__/app/(app)/settings.test.tsx, que o
 * mocka): o que se testa é justamente a ligação entre tocar na opção e a preferência mudar.
 */
function renderSettings() {
  return render(
    <ThemePreferenceProvider>
      <SettingsScreen />
    </ThemePreferenceProvider>,
  );
}

describe('Seletor de tema em Ajustes', () => {
  it('oferece as três opções como um grupo de escolha única', async () => {
    await renderSettings();

    expect(screen.getByRole('radio', { name: 'Claro' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Escuro' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Automático' })).toBeOnTheScreen();
  });

  /**
   * CLAUDE.md §4.7: o estado marcado não pode ser transmitido só por cor. Para o leitor de tela
   * quem carrega essa informação é o accessibilityState — sem ele, as três opções são anunciadas
   * de forma idêntica e não há como saber qual está valendo.
   */
  it('anuncia qual opção está marcada, e só ela', async () => {
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, 'dark');

    await renderSettings();

    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Escuro' })).toBeChecked(),
    );
    expect(screen.getByRole('radio', { name: 'Claro' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Automático' })).not.toBeChecked();
  });

  it('marca e persiste a opção tocada', async () => {
    await renderSettings();

    fireEvent.press(screen.getByRole('radio', { name: 'Escuro' }));

    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Escuro' })).toBeChecked(),
    );
    await expect(AsyncStorage.getItem(THEME_PREFERENCE_KEY)).resolves.toBe('dark');
  });

  it("volta para 'Automático' depois de uma escolha explícita", async () => {
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, 'dark');

    await renderSettings();

    fireEvent.press(screen.getByRole('radio', { name: 'Automático' }));

    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Automático' })).toBeChecked(),
    );
    await expect(AsyncStorage.getItem(THEME_PREFERENCE_KEY)).resolves.toBe('system');
  });
});
