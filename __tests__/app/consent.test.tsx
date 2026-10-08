import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { PRIVACY_POLICY_URL } from '@/lib/legal';

// Fora de src/ (não elegível para o alias @/) — aponta para o arquivo de rota real em
// app/consent.tsx. Um .test.tsx dentro de app/ viraria rota de verdade.
import ConsentRoute from '../../app/consent';

const mockAccept = jest.fn<Promise<boolean>, []>();
const mockSignOut = jest.fn<Promise<void>, []>();

jest.mock('@/features/auth/useSession', () => ({
  useSession: () => ({ signOut: mockSignOut, isLoading: false }),
}));

jest.mock('@/features/privacy/useAcceptPrivacyConsent', () => ({
  useAcceptPrivacyConsent: () => ({ accept: mockAccept, isSaving: false, error: null }),
}));

const AUTHORIZATION = 'Autorizo o tratamento dos meus dados de pressão arterial para registro e lembretes';

let openURLSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockAccept.mockResolvedValue(true);
  mockSignOut.mockResolvedValue(undefined);
  openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

afterEach(() => {
  openURLSpy.mockRestore();
});

describe('rota /consent', () => {
  it('registra o aceite ao marcar a autorização e tocar em Continuar', async () => {
    await render(<ConsentRoute />);

    await fireEvent.press(screen.getByRole('checkbox', { name: AUTHORIZATION }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));

    expect(mockAccept).toHaveBeenCalledTimes(1);
  });

  it('sai da conta quando o usuário não autoriza e confirma', async () => {
    await render(<ConsentRoute />);

    await fireEvent.press(screen.getByRole('button', { name: 'Não autorizo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockAccept).not.toHaveBeenCalled();
  });

  it('abre a política de privacidade publicada', async () => {
    await render(<ConsentRoute />);

    await fireEvent.press(screen.getByRole('link', { name: 'Ler a política de privacidade completa' }));

    expect(openURLSpy).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
  });

  it('mostra mensagem amigável quando a política não abre', async () => {
    openURLSpy.mockRejectedValue(new Error('no activity'));
    await render(<ConsentRoute />);

    await fireEvent.press(screen.getByRole('link', { name: 'Ler a política de privacidade completa' }));

    await waitFor(() =>
      expect(
        screen.getByText('Não foi possível abrir a política de privacidade. Tente novamente mais tarde.'),
      ).toBeTruthy(),
    );
  });
});
