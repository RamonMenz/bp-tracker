import type { User } from 'firebase/auth';
import { renderHook, waitFor } from '@testing-library/react-native';

import { hasSeenOnboarding, markOnboardingSeen } from './onboarding-seen.storage';
import { useOnboardingGate } from './useOnboardingGate';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

// Testa o hook assumindo o contrato já garantido pelo Prompt 1 (onboarding-seen.storage.ts nunca
// rejeita) — não reimplementa aqui a defesa contra falha de leitura/escrita, só confirma que,
// mesmo se o contrato for violado, o hook não navega e não deixa a rejeição sem tratamento.
jest.mock('./onboarding-seen.storage', () => ({
  hasSeenOnboarding: jest.fn(),
  markOnboardingSeen: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));

const mockHasSeenOnboarding = hasSeenOnboarding as jest.Mock;
const mockMarkOnboardingSeen = markOnboardingSeen as jest.Mock;
const { logError: mockLogError } = jest.requireMock('@/lib/logger') as { logError: jest.Mock };

const USER = { uid: 'user-1' } as User;

type Props = { user: User | null; isLoading: boolean };

function renderGate(initialProps: Props) {
  return renderHook(({ user, isLoading }: Props) => useOnboardingGate(user, isLoading), { initialProps });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMarkOnboardingSeen.mockResolvedValue(undefined);
});

describe('useOnboardingGate', () => {
  it('navega para /onboarding uma vez só, mesmo com re-renders subsequentes, quando ainda não viu', async () => {
    mockHasSeenOnboarding.mockResolvedValue(false);

    const { rerender } = await renderGate({ user: USER, isLoading: false });

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    expect(mockPush).toHaveBeenCalledWith('/onboarding');
    expect(mockMarkOnboardingSeen).toHaveBeenCalledTimes(1);

    await rerender({ user: USER, isLoading: false });
    await rerender({ user: USER, isLoading: false });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockHasSeenOnboarding).toHaveBeenCalledTimes(1);
  });

  it('nunca navega quando já viu o onboarding', async () => {
    mockHasSeenOnboarding.mockResolvedValue(true);

    await renderGate({ user: USER, isLoading: false });

    await waitFor(() => expect(mockHasSeenOnboarding).toHaveBeenCalledTimes(1));

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockMarkOnboardingSeen).not.toHaveBeenCalled();
  });

  it('nunca navega enquanto isLoading for true, mesmo com user preenchido', async () => {
    mockHasSeenOnboarding.mockResolvedValue(false);

    const { rerender } = await renderGate({ user: USER, isLoading: true });

    expect(mockHasSeenOnboarding).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();

    // Ainda carregando quando o usuário aparece: não decide nada (mesma regra do useAuthRedirect).
    await rerender({ user: USER, isLoading: true });

    expect(mockHasSeenOnboarding).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('não navega quando hasSeenOnboarding rejeita', async () => {
    mockHasSeenOnboarding.mockRejectedValue(new Error('falha simulada'));

    await renderGate({ user: USER, isLoading: false });

    await waitFor(() => expect(mockLogError).toHaveBeenCalledWith('onboarding.gate', expect.any(Error)));

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockMarkOnboardingSeen).not.toHaveBeenCalled();
  });
});
