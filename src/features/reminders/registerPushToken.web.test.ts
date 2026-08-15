import Constants from 'expo-constants';
import { setDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';

import { registerPushToken } from './registerPushToken.web';

const mockGetMessagingInstance = jest.fn();
const mockServiceWorkerRegister = jest.fn();

const FIREBASE_CONFIG = {
  apiKey: 'api-key',
  authDomain: 'bp-tracker.firebaseapp.com',
  projectId: 'bp-tracker',
  appId: 'app-id',
  messagingSenderId: 'sender-id',
  vapidKey: 'vapid-key',
};

// registerPushToken.web.ts fala com quatro fronteiras externas — expo-constants, o par de
// módulos de src/services/firebase, firebase/firestore e firebase/messaging — nenhuma delas com
// precedente de mock neste repositório (os testes de features/readings sempre mockam no nível do
// hook ou do repositório, nunca no do próprio SDK). Aqui é o próprio arquivo-fronteira sob teste,
// então o mock precisa ficar na camada abaixo dele: as funções do SDK.
// expoConfig é reatribuído por inteiro em beforeEach (abaixo) — aqui só precisa existir um objeto
// mutável para o `import Constants from 'expo-constants'` deste arquivo de teste apontar.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: undefined },
}));

jest.mock('@/services/firebase', () => ({ firestore: {} }));

jest.mock('@/services/firebase/firebase.web', () => ({
  getMessagingInstance: () => mockGetMessagingInstance(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => 'doc-ref'),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
  setDoc: jest.fn(),
}));

jest.mock('firebase/messaging', () => ({ getToken: jest.fn() }));

const mockSetDoc = setDoc as jest.Mock;
const mockGetToken = getToken as jest.Mock;

const MESSAGING = { app: {} };

beforeEach(() => {
  jest.clearAllMocks();

  // Reatribuído (não só limpo) a cada teste: o teste de "vapid key ausente" muta este objeto, e
  // sem restaurar aqui esse estado vazaria para os testes seguintes.
  (Constants as any).expoConfig = { extra: { firebase: { ...FIREBASE_CONFIG } } };

  mockGetMessagingInstance.mockResolvedValue(MESSAGING);
  mockGetToken.mockResolvedValue('push-token-abc');
  mockServiceWorkerRegister.mockResolvedValue({ registration: true });
  mockSetDoc.mockResolvedValue(undefined);

  (navigator as any).serviceWorker = { register: mockServiceWorkerRegister };
  (global as any).Notification = { permission: 'granted', requestPermission: jest.fn() };
});

describe('registerPushToken (web) — navegador sem suporte', () => {
  it('lança a mensagem de navegador sem suporte quando getMessagingInstance resolve null', async () => {
    mockGetMessagingInstance.mockResolvedValue(null);

    await expect(registerPushToken('user-1')).rejects.toThrow(
      'Este navegador não tem suporte a notificações push. Use o app no Android ou tente em outro navegador.',
    );

    // Sem suporte, nada abaixo disso pode ser tentado — nem pedir permissão nem registrar o SW.
    expect(mockServiceWorkerRegister).not.toHaveBeenCalled();
    expect(mockGetToken).not.toHaveBeenCalled();
  });
});

describe('registerPushToken (web) — vapid key ausente', () => {
  it('lança uma mensagem distinta (não a de navegador sem suporte) quando a vapid key falta', async () => {
    (Constants as any).expoConfig.extra.firebase.vapidKey = undefined;

    await expect(registerPushToken('user-1')).rejects.toThrow(
      'Notificações push na web não estão configuradas neste ambiente. Avise o suporte.',
    );

    expect(mockServiceWorkerRegister).not.toHaveBeenCalled();
  });
});

describe('registerPushToken (web) — permissão negada', () => {
  it('pede permissão e lança a mensagem amigável quando o navegador nega', async () => {
    (global as any).Notification = { permission: 'default', requestPermission: jest.fn().mockResolvedValue('denied') };

    await expect(registerPushToken('user-1')).rejects.toThrow(
      'Permita notificações nas configurações do navegador para receber lembretes.',
    );

    expect(mockServiceWorkerRegister).not.toHaveBeenCalled();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('não pede permissão de novo se o navegador já concedeu antes', async () => {
    const requestPermission = jest.fn();
    (global as any).Notification = { permission: 'granted', requestPermission };

    await registerPushToken('user-1');

    expect(requestPermission).not.toHaveBeenCalled();
  });
});

describe('registerPushToken (web) — caminho feliz', () => {
  it('registra o service worker com a config na query string, pega o token e persiste em devices/{tokenHash}', async () => {
    await registerPushToken('user-1');

    expect(mockServiceWorkerRegister).toHaveBeenCalledTimes(1);
    const registeredUrl = mockServiceWorkerRegister.mock.calls[0][0] as string;
    expect(registeredUrl).toMatch(/^\/firebase-messaging-sw\.js\?/);
    expect(registeredUrl).toContain(`apiKey=${FIREBASE_CONFIG.apiKey}`);
    expect(registeredUrl).toContain(`projectId=${FIREBASE_CONFIG.projectId}`);

    expect(mockGetToken).toHaveBeenCalledWith(
      MESSAGING,
      expect.objectContaining({ vapidKey: FIREBASE_CONFIG.vapidKey, serviceWorkerRegistration: { registration: true } }),
    );

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, payload, options] = mockSetDoc.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({ token: 'push-token-abc', platform: 'web', lastSeenAt: 'server-timestamp' }),
    );
    expect(options).toEqual({ merge: true });
  });
});

describe('registerPushToken (web) — erros de getToken/setDoc', () => {
  it('nunca propaga error.message cru do SDK — sempre a mensagem genérica amigável', async () => {
    mockGetToken.mockRejectedValue(new Error('AbortError: registration failed - push service error'));

    await expect(registerPushToken('user-1')).rejects.toThrow(
      'Não foi possível ativar as notificações. Tente novamente.',
    );
  });

  it('mesma mensagem genérica quando o registro do service worker falha', async () => {
    mockServiceWorkerRegister.mockRejectedValue(new Error('SecurityError'));

    await expect(registerPushToken('user-1')).rejects.toThrow(
      'Não foi possível ativar as notificações. Tente novamente.',
    );
  });

  it('mesma mensagem genérica quando a escrita em devices falha', async () => {
    mockSetDoc.mockRejectedValue(new Error('permission-denied'));

    await expect(registerPushToken('user-1')).rejects.toThrow(
      'Não foi possível ativar as notificações. Tente novamente.',
    );
  });
});
