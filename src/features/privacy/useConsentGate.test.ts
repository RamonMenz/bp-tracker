import type { User } from 'firebase/auth';
import { act, renderHook } from '@testing-library/react-native';

import { subscribePrivacyConsent } from '@/features/auth/auth.repo';
import { PRIVACY_POLICY_VERSION } from '@/lib/legal';
import type { AcceptedPrivacyConsent } from '@/types/models';

import { useConsentGate } from './useConsentGate';

const mockReplace = jest.fn();
let mockSegments: string[] = ['(app)'];

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSegments: () => mockSegments,
}));

jest.mock('@/features/auth/auth.repo', () => ({ subscribePrivacyConsent: jest.fn() }));

jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));

const mockSubscribe = subscribePrivacyConsent as jest.Mock;
const mockUnsubscribe = jest.fn();

const USER = { uid: 'user-1' } as User;
const CURRENT_CONSENT: AcceptedPrivacyConsent = { version: PRIVACY_POLICY_VERSION, acceptedAt: new Date() };

type Props = { user: User | null; isLoading: boolean };

/** Entrega uma resposta do "servidor" ao listener que o hook registrou. */
async function emitConsent(consent: AcceptedPrivacyConsent | null): Promise<void> {
  const onNext = mockSubscribe.mock.calls.at(-1)?.[1] as (value: AcceptedPrivacyConsent | null) => void;
  await act(async () => onNext(consent));
}

async function emitError(): Promise<void> {
  const onError = mockSubscribe.mock.calls.at(-1)?.[2] as (error: unknown) => void;
  await act(async () => onError({ code: 'unavailable' }));
}

async function renderGate(initialProps: Props) {
  return renderHook(({ user, isLoading }: Props) => useConsentGate(user, isLoading), { initialProps });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSegments = ['(app)'];
  mockSubscribe.mockReturnValue(mockUnsubscribe);
});

describe('useConsentGate', () => {
  it('manda para /consent quem não tem aceite, uma vez só mesmo com re-renders', async () => {
    const { rerender, result } = await renderGate({ user: USER, isLoading: false });

    await emitConsent(null);

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/consent');
    expect(result.current.hasConsent).toBe(false);

    await rerender({ user: USER, isLoading: false });
    await rerender({ user: USER, isLoading: false });

    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('pede o aceite de novo quando o gravado é de uma versão anterior da política', async () => {
    await renderGate({ user: USER, isLoading: false });

    await emitConsent({ version: '2000-01-01', acceptedAt: new Date() });

    expect(mockReplace).toHaveBeenCalledWith('/consent');
  });

  it('não navega e libera hasConsent quando o aceite da versão vigente existe', async () => {
    const { result } = await renderGate({ user: USER, isLoading: false });

    await emitConsent(CURRENT_CONSENT);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.hasConsent).toBe(true);
  });

  it('não decide nada enquanto a sessão carrega ou o servidor ainda não respondeu', async () => {
    const { rerender } = await renderGate({ user: USER, isLoading: true });

    expect(mockReplace).not.toHaveBeenCalled();

    await rerender({ user: USER, isLoading: false });

    // Listener registrado, mas sem resposta ainda: "não sei" não é "não aceitou".
    expect(mockSubscribe).toHaveBeenCalledWith('user-1', expect.any(Function), expect.any(Function));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('não navega sem usuário (o gate de autenticação cuida desse caso)', async () => {
    await renderGate({ user: null, isLoading: false });

    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('não sai de /consent sem aceite e não navega em loop', async () => {
    mockSegments = ['consent'];
    const { rerender } = await renderGate({ user: USER, isLoading: false });

    await emitConsent(null);
    await rerender({ user: USER, isLoading: false });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('tira o usuário de /consent assim que o aceite aparece confirmado', async () => {
    mockSegments = ['consent'];
    const { result } = await renderGate({ user: USER, isLoading: false });

    await emitConsent(null);
    await emitConsent(CURRENT_CONSENT);

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(app)');
    expect(result.current.hasConsent).toBe(true);
  });

  it('barra de novo quem sai de /consent sem aceitar (ex.: deep link de notificação)', async () => {
    mockSegments = ['consent'];
    const { rerender } = await renderGate({ user: USER, isLoading: false });
    await emitConsent(null);

    mockSegments = ['record'];
    await rerender({ user: USER, isLoading: false });

    expect(mockReplace).toHaveBeenCalledWith('/consent');
  });

  it('falha fechada: erro do listener pede o consentimento em vez de liberar o app', async () => {
    const { result } = await renderGate({ user: USER, isLoading: false });

    await emitError();

    expect(mockReplace).toHaveBeenCalledWith('/consent');
    expect(result.current.hasConsent).toBe(false);
  });

  it('cancela o listener ao desmontar', async () => {
    const { unmount } = await renderGate({ user: USER, isLoading: false });

    await unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
