const mockInit = jest.fn();
const mockCaptureException = jest.fn();
const mockLogError = jest.fn();

/**
 * Os mocks abaixo delegam para funções de escopo de MÓDULO em vez de devolver `jest.fn()` criados
 * dentro da factory: `loadAdapter` recarrega o adapter sob `jest.isolateModules`, o que zera o
 * registro de módulos e faz cada factory rodar de novo. Com `jest.fn()` criado lá dentro, o teste
 * ficaria segurando a instância de uma execução anterior e não veria chamada nenhuma.
 */
jest.mock('@sentry/browser', () => ({
  init: (...args: unknown[]) => mockInit(...args),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

// Mesmo motivo: um objeto estável, mutado por `setDsn` a cada teste. O adapter lê a DSN na
// avaliação do módulo, então o valor precisa já estar de pé antes do `loadAdapter`.
const mockConstants: { expoConfig?: { extra?: Record<string, unknown> } } = {};

jest.mock('expo-constants', () => ({ __esModule: true, default: mockConstants }));

// O adapter chama `logError` quando a DSN falta — é o efeito observável desse caminho. Mockar o
// logger evita depender do comportamento de `__DEV__` (que lá dentro decide entre console e
// coletor) para verificar que o aviso saiu uma vez só.
jest.mock('@/lib/logger', () => ({ logError: (...args: unknown[]) => mockLogError(...args) }));

const DSN = 'https://public-key@o0.ingest.sentry.io/1';

/** O adapter memoiza a inicialização — cada teste precisa de um módulo novo. */
function loadAdapter() {
  let adapter: typeof import('./crashReporter.web');

  jest.isolateModules(() => {
    // require sob isolateModules é a única forma de recarregar o adapter a cada teste — ele
    // memoiza o cliente do Sentry internamente, de propósito.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    adapter = require('./crashReporter.web');
  });

  return adapter!;
}

function setDsn(dsn: string | undefined): void {
  mockConstants.expoConfig = { extra: { sentry: { dsn } } };
}

beforeEach(() => {
  // `reset`, não `clear`: os testes do último bloco instalam implementações que lançam, e
  // `clearAllMocks` só apagaria as chamadas registradas, deixando a implementação vazar.
  jest.resetAllMocks();
  setDsn(DSN);
});

describe('crashReporter (web) — entrega ao Sentry', () => {
  it('reporta o erro com o scope como tag, que é o que agrupa os erros por origem', () => {
    const error = new Error('falha ao gravar');

    loadAdapter().crashReporter.recordError('readings.add', error, { uid: 'user-1' });

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      tags: { scope: 'readings.add' },
      extra: { uid: 'user-1' },
    });
  });

  it('inicializa uma única vez, mesmo com vários erros reportados', () => {
    const { crashReporter } = loadAdapter();

    crashReporter.recordError('a', new Error('1'), {});
    crashReporter.recordError('b', new Error('2'), {});

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledTimes(2);
  });

  /**
   * Estas opções não são ajuste de gosto: são o requisito de LGPD do CLAUDE.md §4.4 para mandar
   * stack trace de um app de saúde a um processador terceiro. Um relaxamento por engano aqui é
   * exatamente o que este teste existe para pegar.
   */
  it('inicializa sem PII automática, sem tracing e sem rastreio de sessão', () => {
    loadAdapter().crashReporter.recordError('readings.add', new Error('x'), {});

    const [options] = mockInit.mock.calls[0] as [
      {
        dsn: string;
        sendDefaultPii: boolean;
        tracesSampleRate: number;
        integrations: (defaults: { name: string }[]) => { name: string }[];
      },
    ];

    expect(options.dsn).toBe(DSN);
    expect(options.sendDefaultPii).toBe(false);
    expect(options.tracesSampleRate).toBe(0);
    expect(options.integrations([{ name: 'BrowserSession' }, { name: 'Dedupe' }])).toEqual([
      { name: 'Dedupe' },
    ]);
  });
});

describe('crashReporter (web) — valor não-Error', () => {
  it('embrulha num Error, porque o Sentry agrupa relatórios pelo stack', () => {
    loadAdapter().crashReporter.recordError('readings.parse', 'string lançada', {});

    const [reported] = mockCaptureException.mock.calls[0];
    expect(reported).toBeInstanceOf(Error);
  });

  /**
   * Diferente do `context`, o valor lançado nunca passou pelo sanitizador de `logError` — pode
   * carregar PII ou dado de saúde (CLAUDE.md §4.4), então o conteúdo não é serializado.
   */
  it('não serializa o conteúdo do valor lançado na mensagem', () => {
    loadAdapter().crashReporter.recordError('readings.add', { email: 'alguem@exemplo.com' }, {});

    const [reported] = mockCaptureException.mock.calls[0];
    expect((reported as Error).message).not.toContain('alguem@exemplo.com');
  });
});

describe('crashReporter (web) — sem DSN configurada', () => {
  beforeEach(() => {
    setDsn(undefined);
  });

  it('não inicializa o Sentry e vira no-op em vez de lançar', () => {
    expect(() =>
      loadAdapter().crashReporter.recordError('readings.add', new Error('x'), { uid: 'user-1' }),
    ).not.toThrow();

    expect(mockInit).not.toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('avisa uma única vez, e não a cada erro reportado', () => {
    const { crashReporter } = loadAdapter();

    crashReporter.recordError('a', new Error('1'), {});
    crashReporter.recordError('b', new Error('2'), {});
    crashReporter.recordError('c', new Error('3'), {});

    expect(mockLogError).toHaveBeenCalledTimes(1);
    expect(mockLogError).toHaveBeenCalledWith('crashReporter.web.init', expect.any(Error));
  });

  it('não recursa quando o próprio logError volta para este reporter em produção', () => {
    const { crashReporter } = loadAdapter();

    // É o que acontece em produção: `logError` entrega ao coletor injetado, que é este mesmo
    // adapter. Sem a bandeira de "já tentei inicializar" levantada ANTES do aviso, isso seria
    // recursão infinita.
    mockLogError.mockImplementation(() => {
      crashReporter.recordError('crashReporter.web.init', new Error('Sentry DSN ausente'), {});
    });

    expect(() => crashReporter.recordError('readings.add', new Error('x'), {})).not.toThrow();
    expect(mockLogError).toHaveBeenCalledTimes(1);
  });
});

/**
 * Falhar ao REPORTAR um erro não pode derrubar o app por cima do erro que já estava sendo tratado
 * — quem chamou `logError` estava no `catch` de outra coisa.
 */
describe('crashReporter (web) — SDK do Sentry lançando', () => {
  it('não propaga quando Sentry.init lança', () => {
    mockInit.mockImplementation(() => {
      throw new Error('DSN inválida');
    });

    expect(() =>
      loadAdapter().crashReporter.recordError('readings.add', new Error('x'), {}),
    ).not.toThrow();
  });

  it('não propaga quando Sentry.captureException lança', () => {
    mockCaptureException.mockImplementation(() => {
      throw new Error('transporte indisponível');
    });

    expect(() =>
      loadAdapter().crashReporter.recordError('readings.add', new Error('x'), {}),
    ).not.toThrow();
  });

  it('não tenta inicializar de novo depois de Sentry.init ter lançado', () => {
    mockInit.mockImplementation(() => {
      throw new Error('DSN inválida');
    });

    const { crashReporter } = loadAdapter();

    crashReporter.recordError('a', new Error('1'), {});
    crashReporter.recordError('b', new Error('2'), {});

    expect(mockInit).toHaveBeenCalledTimes(1);
  });
});
