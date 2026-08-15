import { act, renderHook, waitFor } from '@testing-library/react-native';
import { onMessage } from 'firebase/messaging';

import { useForegroundPush } from './useForegroundPush.web';

const mockPush = jest.fn();
const mockGetMessagingInstance = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/services/firebase/firebase.web', () => ({
  getMessagingInstance: () => mockGetMessagingInstance(),
}));

jest.mock('firebase/messaging', () => ({ onMessage: jest.fn() }));

const mockOnMessage = onMessage as jest.Mock;

const MESSAGING = { app: {} };

/** Stub mínimo da Notification do navegador — captura as instâncias criadas para os testes inspecionarem. */
class MockNotification {
  static permission: NotificationPermission = 'granted';
  static instances: MockNotification[] = [];

  onclick: (() => void) | null = null;
  close = jest.fn();

  constructor(
    public title: string,
    public options?: NotificationOptions,
  ) {
    MockNotification.instances.push(this);
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  MockNotification.instances = [];
  MockNotification.permission = 'granted';

  (global as any).Notification = MockNotification;
  window.focus = jest.fn();

  mockGetMessagingInstance.mockResolvedValue(MESSAGING);
  mockOnMessage.mockImplementation(() => mockUnsubscribe);
});

/** Renderiza e espera getMessagingInstance() (assíncrono) assentar antes do teste seguir — em vez
 *  de um número fixo de voltas de microtask, espera pelo efeito observável de verdade. */
async function renderAndWaitForSubscription() {
  const view = await renderHook(() => useForegroundPush());
  await waitFor(() => expect(mockOnMessage).toHaveBeenCalledTimes(1));
  return view;
}

describe('useForegroundPush (web) — assinatura do onMessage', () => {
  it('assina onMessage quando o navegador tem suporte a FCM', async () => {
    await renderAndWaitForSubscription();

    expect(mockOnMessage).toHaveBeenCalledWith(MESSAGING, expect.any(Function));
  });

  it('não assina nada quando o navegador não tem suporte (getMessagingInstance resolve null)', async () => {
    mockGetMessagingInstance.mockResolvedValue(null);

    await renderHook(() => useForegroundPush());
    await waitFor(() => expect(mockGetMessagingInstance).toHaveBeenCalled());

    expect(mockOnMessage).not.toHaveBeenCalled();
  });

  it('cancela a assinatura do onMessage ao desmontar', async () => {
    const { unmount } = await renderAndWaitForSubscription();

    await act(async () => {
      unmount();
    });

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  /**
   * Regressão do vazamento que o CLAUDE.md §3.4 pede para evitar: getMessagingInstance() é
   * assíncrono, então desmontar ANTES dele resolver não pode deixar uma assinatura órfã sem
   * unsubscribe nenhum para chamá-la depois.
   */
  it('nunca assina onMessage se desmontar antes de getMessagingInstance() resolver', async () => {
    let resolveMessaging: (value: typeof MESSAGING) => void = () => {};
    mockGetMessagingInstance.mockReturnValue(
      new Promise((resolve) => {
        resolveMessaging = resolve;
      }),
    );

    const { unmount } = await renderHook(() => useForegroundPush());

    await act(async () => {
      unmount();
    });

    await act(async () => {
      resolveMessaging(MESSAGING);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockOnMessage).not.toHaveBeenCalled();
  });
});

describe('useForegroundPush (web) — notificação em primeiro plano', () => {
  it('mostra uma Notification com o mesmo título/corpo dos lembretes locais ao chegar uma mensagem', async () => {
    await renderAndWaitForSubscription();

    const onMessageCallback = mockOnMessage.mock.calls[0][1] as () => void;

    await act(async () => {
      onMessageCallback();
    });

    expect(MockNotification.instances).toHaveLength(1);
    expect(MockNotification.instances[0].title).toBe('Hora de medir sua pressão');
    expect(MockNotification.instances[0].options?.body).toBe('Toque para registrar agora.');
  });

  it('não mostra nada quando a permissão do navegador não está concedida', async () => {
    MockNotification.permission = 'denied';

    await renderAndWaitForSubscription();

    const onMessageCallback = mockOnMessage.mock.calls[0][1] as () => void;

    await act(async () => {
      onMessageCallback();
    });

    expect(MockNotification.instances).toHaveLength(0);
  });

  it('navega para o formulário com autoFocus ao tocar na notificação, e a fecha', async () => {
    await renderAndWaitForSubscription();

    const onMessageCallback = mockOnMessage.mock.calls[0][1] as () => void;

    await act(async () => {
      onMessageCallback();
    });

    const notification = MockNotification.instances[0];

    await act(async () => {
      notification.onclick?.();
    });

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)', params: { autoFocus: 'systolic' } });
    expect(notification.close).toHaveBeenCalledTimes(1);
  });

  it('não carrega nenhum dado de medição no conteúdo da notificação — só o texto fixo do lembrete', async () => {
    await renderAndWaitForSubscription();

    const onMessageCallback = mockOnMessage.mock.calls[0][1] as () => void;

    await act(async () => {
      onMessageCallback();
    });

    const options = MockNotification.instances[0].options ?? {};
    expect(Object.keys(options).sort()).toEqual(['body', 'icon', 'tag']);
  });
});
