const mockGetCrashlytics = jest.fn();
const mockLog = jest.fn();
const mockRecordError = jest.fn();

jest.mock('@react-native-firebase/crashlytics', () => ({
  getCrashlytics: mockGetCrashlytics,
  log: mockLog,
  recordError: mockRecordError,
}));

const INSTANCE = { app: {} };

/** O adapter memoiza o módulo na primeira chamada — cada teste precisa de um módulo novo. */
function loadAdapter() {
  let adapter: typeof import('./crashReporter.native');

  jest.isolateModules(() => {
    // require sob isolateModules é a única forma de recarregar o adapter a cada teste — ele
    // memoiza o módulo do Crashlytics internamente, de propósito.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    adapter = require('./crashReporter.native');
  });

  return adapter!;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCrashlytics.mockReturnValue(INSTANCE);
});

describe('crashReporter (nativo) — entrega ao Crashlytics', () => {
  it('reporta o erro com o scope como jsErrorName, que é o que agrupa os não-fatais por origem', () => {
    const error = new Error('falha ao gravar');

    loadAdapter().crashReporter.recordError('readings.add', error, {});

    expect(mockRecordError).toHaveBeenCalledTimes(1);
    expect(mockRecordError).toHaveBeenCalledWith(INSTANCE, error, 'readings.add');
  });

  it('manda o contexto como breadcrumb antes do erro', () => {
    loadAdapter().crashReporter.recordError('readings.add', new Error('x'), { uid: 'user-1', attempt: 2 });

    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(INSTANCE, '[readings.add] {"uid":"user-1","attempt":2}');
  });

  it('não polui o breadcrumb quando não há contexto', () => {
    loadAdapter().crashReporter.recordError('appCheck.init', new Error('x'), {});

    expect(mockLog).not.toHaveBeenCalled();
    expect(mockRecordError).toHaveBeenCalledTimes(1);
  });

  it('resolve a instância uma única vez, mesmo com vários erros reportados', () => {
    const { crashReporter } = loadAdapter();

    crashReporter.recordError('a', new Error('1'), {});
    crashReporter.recordError('b', new Error('2'), {});

    expect(mockGetCrashlytics).toHaveBeenCalledTimes(1);
    expect(mockRecordError).toHaveBeenCalledTimes(2);
  });
});

describe('crashReporter (nativo) — valor não-Error', () => {
  it('embrulha num Error, porque o Crashlytics agrupa relatórios pelo stack', () => {
    loadAdapter().crashReporter.recordError('readings.parse', 'string lançada', {});

    const [, reported] = mockRecordError.mock.calls[0];
    expect(reported).toBeInstanceOf(Error);
  });

  /**
   * Diferente do `context`, o valor lançado nunca passou pelo sanitizador de `logError` — pode
   * carregar PII ou dado de saúde (CLAUDE.md §4.4), então o conteúdo não é serializado.
   */
  it('não serializa o conteúdo do valor lançado na mensagem', () => {
    loadAdapter().crashReporter.recordError('readings.add', { email: 'alguem@exemplo.com' }, {});

    const [, reported] = mockRecordError.mock.calls[0];
    expect((reported as Error).message).not.toContain('alguem@exemplo.com');
  });
});

describe('crashReporter (nativo) — contexto não serializável', () => {
  it('reporta o erro mesmo assim, em vez de perder o relatório inteiro', () => {
    const circular: Record<string, unknown> = { uid: 'user-1' };
    circular.self = circular;

    loadAdapter().crashReporter.recordError('readings.add', new Error('x'), circular);

    expect(mockLog).toHaveBeenCalledWith(INSTANCE, '[readings.add] [contexto não serializável]');
    expect(mockRecordError).toHaveBeenCalledTimes(1);
  });
});

/**
 * Regressão do bug encontrado ao integrar de verdade: `@react-native-firebase/crashlytics` lança
 * JÁ NA IMPORTAÇÃO quando o módulo nativo não está registrado. Como este adapter é alcançado a
 * partir de `services/firebase/index.ts` — o caminho único por onde o app chega em auth/firestore
 * — um `import` estático derrubava o BOOT do app em qualquer Dev Client compilado antes desta
 * dependência existir, inclusive em desenvolvimento, onde o Crashlytics nem chega a ser usado.
 */
describe('crashReporter (nativo) — sem o módulo nativo registrado', () => {
  it('importa sem lançar e degrada para "sem coletor" em vez de derrubar o app', () => {
    jest.resetModules();
    jest.doMock('@react-native-firebase/crashlytics', () => {
      throw new Error('Native module NativeRNFBTurboApp is not registered.');
    });

    let adapter: typeof import('./crashReporter.native');

    expect(() => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- ver loadAdapter acima
        adapter = require('./crashReporter.native');
      });
    }).not.toThrow();

    expect(() =>
      adapter!.crashReporter.recordError('readings.add', new Error('x'), { uid: 'user-1' }),
    ).not.toThrow();

    jest.dontMock('@react-native-firebase/crashlytics');
  });
});
