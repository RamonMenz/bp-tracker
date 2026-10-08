const mockConfigure = jest.fn();
const mockInitializeAppCheck = jest.fn();
const mockGetToken = jest.fn();
const mockLogError = jest.fn();

jest.mock('@react-native-firebase/app-check', () => ({
  ReactNativeFirebaseAppCheckProvider: jest.fn().mockImplementation(() => ({ configure: mockConfigure })),
  initializeAppCheck: mockInitializeAppCheck,
  getToken: mockGetToken,
}));

jest.mock('@/lib/logger', () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

// `__DEV__` é global do React Native, não do `globalThis` tipado pelo TS — daí a ponte explícita.
const runtimeGlobal = globalThis as unknown as { __DEV__: boolean };
const INSTANCE = { app: {} };
const EXP_SECONDS = 1_760_000_000;

function makeJwt(payload: unknown): string {
  const encode = (value: string) =>
    Buffer.from(value, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${encode('{"alg":"RS256","typ":"JWT"}')}.${encode(JSON.stringify(payload))}.assinatura`;
}

/** A ponte memoiza o módulo nativo — cada teste precisa de um módulo novo. */
function loadBridge() {
  let bridge: typeof import('./appCheckBridge.native');

  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    bridge = require('./appCheckBridge.native');
  });

  return bridge!;
}

function withDev<T>(isDev: boolean, run: () => T): T {
  const previous = runtimeGlobal.__DEV__;
  runtimeGlobal.__DEV__ = isDev;

  try {
    return run();
  } finally {
    runtimeGlobal.__DEV__ = previous;
  }
}

const originalDebugToken = process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN;

beforeEach(() => {
  jest.clearAllMocks();
  mockInitializeAppCheck.mockReturnValue(INSTANCE);
  mockGetToken.mockResolvedValue({ token: makeJwt({ exp: EXP_SECONDS }) });
  process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN = 'debug-token-de-teste';
});

afterAll(() => {
  process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN = originalDebugToken;
});

describe('getNativeAppCheckToken', () => {
  it('devolve o token do RNFirebase com expireTimeMillis extraído do exp do JWT', async () => {
    const token = makeJwt({ exp: EXP_SECONDS });
    mockGetToken.mockResolvedValue({ token });

    await expect(loadBridge().getNativeAppCheckToken()).resolves.toEqual({
      token,
      expireTimeMillis: EXP_SECONDS * 1000,
    });
    expect(mockGetToken).toHaveBeenCalledWith(INSTANCE, false);
  });

  it('inicializa o App Check nativo uma única vez, com auto-refresh nativo desligado', async () => {
    const { getNativeAppCheckToken } = loadBridge();

    await getNativeAppCheckToken();
    await getNativeAppCheckToken();

    expect(mockInitializeAppCheck).toHaveBeenCalledTimes(1);
    expect(mockInitializeAppCheck).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ isTokenAutoRefreshEnabled: false }),
    );
    expect(mockGetToken).toHaveBeenCalledTimes(2);
  });

  it('loga e relança quando o RNFirebase falha', async () => {
    const error = new Error('Play Integrity indisponível');
    mockGetToken.mockRejectedValue(error);

    await expect(loadBridge().getNativeAppCheckToken()).rejects.toBe(error);
    expect(mockLogError).toHaveBeenCalledWith('appCheck.nativeToken', error);
  });

  it('loga e relança quando o módulo nativo não carrega, e tenta de novo na próxima chamada', async () => {
    const error = new Error('Native module NativeRNFBTurboAppCheck is not registered');
    mockInitializeAppCheck.mockImplementationOnce(() => {
      throw error;
    });
    const { getNativeAppCheckToken } = loadBridge();

    await expect(getNativeAppCheckToken()).rejects.toBe(error);
    expect(mockLogError).toHaveBeenCalledWith('appCheck.nativeToken', error);

    await expect(getNativeAppCheckToken()).resolves.toHaveProperty('token');
  });

  it('não inventa expiração: token sem exp legível é falha, logada e relançada', async () => {
    mockGetToken.mockResolvedValue({ token: makeJwt({ sub: 'app' }) });

    await expect(loadBridge().getNativeAppCheckToken()).rejects.toThrow(/exp/);
    expect(mockLogError).toHaveBeenCalledWith('appCheck.nativeToken', expect.any(Error));
  });
});

describe('provider nativo configurado', () => {
  it('em produção é playIntegrity, sem debug token — mesmo com a variável presente', async () => {
    await withDev(false, () => loadBridge().getNativeAppCheckToken());

    expect(mockConfigure).toHaveBeenCalledTimes(1);
    expect(mockConfigure).toHaveBeenCalledWith({ android: { provider: 'playIntegrity' } });
  });

  it('em produção getAndroidProviderOptions nunca devolve debug', () => {
    const options = withDev(false, () => loadBridge().getAndroidProviderOptions());

    expect(options.provider).toBe('playIntegrity');
    expect(options).not.toHaveProperty('debugToken');
  });

  it('em desenvolvimento usa o debug provider nativo com o token do .env.local', async () => {
    await withDev(true, () => loadBridge().getNativeAppCheckToken());

    expect(mockConfigure).toHaveBeenCalledWith({
      android: { provider: 'debug', debugToken: 'debug-token-de-teste' },
    });
  });

  it('em desenvolvimento sem a variável deixa o nativo gerar o debug token', () => {
    process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN = '';

    const options = withDev(true, () => loadBridge().getAndroidProviderOptions());

    expect(options).toEqual({ provider: 'debug', debugToken: undefined });
  });
});
