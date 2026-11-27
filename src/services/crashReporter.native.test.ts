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
    expect(mockRecordError).toHaveBeenCalledWith(INSTANCE, expect.any(Error), 'readings.add');
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

/**
 * A mensagem de um `Error` nunca passa pelo sanitizador de `logError` e pode vir de SDK de terceiro
 * com valor de campo, observação ou e-mail dentro (constitution §2; CLAUDE.md §4.4/§4.5). Mesma
 * regra já aplicada na web (`docs/sentry-privacidade.md`): a mensagem não sai do dispositivo.
 */
describe('crashReporter (nativo) — mensagem de exceção redigida', () => {
  const PRESSURE = '187 por 113';
  const NOTE = 'tontura-ao-levantar-7Q';
  const EMAIL = 'sentinela.paciente@exemplo.com';
  const NAME = 'Zuleika Sentinela';
  const SENTINELS = [PRESSURE, NOTE, EMAIL, NAME];

  class ReadingSaveError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
      super(message, options);
      this.name = 'ReadingSaveError';
    }
  }

  function buildSensitiveError(): ReadingSaveError {
    return new ReadingSaveError(`falha ao salvar ${PRESSURE} de ${NAME}`, {
      cause: new RangeError(`obs ${NOTE} de ${EMAIL}`),
    });
  }

  /** Tudo o que o adapter entrega ao Crashlytics, em texto, incluindo campos não enumeráveis. */
  function everythingSent(): string {
    const parts: string[] = [];

    for (const [, ...args] of [...mockRecordError.mock.calls, ...mockLog.mock.calls]) {
      for (const arg of args) {
        if (arg instanceof Error) {
          parts.push(arg.message, String(arg.stack), String(arg.name), String(arg.cause));
          parts.push(JSON.stringify(arg, Object.getOwnPropertyNames(arg)));
        } else {
          parts.push(String(arg));
        }
      }
    }

    return parts.join('\n');
  }

  it('não envia nenhuma sentinela na mensagem, na stack nem na causa', () => {
    loadAdapter().crashReporter.recordError('readings.add', buildSensitiveError(), { uid: 'user-1' });

    expect(mockRecordError).toHaveBeenCalledTimes(1);

    const sent = everythingSent();
    for (const sentinel of SENTINELS) {
      expect(sent).not.toContain(sentinel);
    }
  });

  it('troca a mensagem por um texto fixo, preservando tipo, stack e scope', () => {
    const original = buildSensitiveError();
    const originalFrames = String(original.stack).split('\n').slice(1).join('\n');

    loadAdapter().crashReporter.recordError('readings.add', original, {});

    const [instance, reported, jsErrorName] = mockRecordError.mock.calls[0];
    expect(instance).toBe(INSTANCE);
    expect(jsErrorName).toBe('readings.add');
    expect(reported).toBeInstanceOf(ReadingSaveError);
    expect((reported as Error).name).toBe('ReadingSaveError');
    expect((reported as Error).message).toBe('[mensagem removida por privacidade]');
    expect((reported as Error).cause).toBeUndefined();
    expect(String((reported as Error).stack)).toContain(originalFrames);
  });

  it('redige também mensagem de várias linhas, inclusive na stack', () => {
    const original = new Error(`linha 1\n${PRESSURE}\n${EMAIL}`);

    loadAdapter().crashReporter.recordError('readings.add', original, {});

    const sent = everythingSent();
    expect(sent).not.toContain(PRESSURE);
    expect(sent).not.toContain(EMAIL);
  });

  it('mantém o contexto sanitizado como breadcrumb', () => {
    loadAdapter().crashReporter.recordError('readings.add', buildSensitiveError(), { uid: 'user-1' });

    expect(mockLog).toHaveBeenCalledWith(INSTANCE, '[readings.add] {"uid":"user-1"}');
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
