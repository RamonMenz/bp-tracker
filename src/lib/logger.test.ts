import { logError, setCrashReporter, type CrashReporter } from './logger';

const recordError = jest.fn<void, [string, unknown, Record<string, unknown>]>();
const reporter: CrashReporter = { recordError };

const REMOVED = '[removido: campo proibido em log]';

/**
 * `logError` só consulta o coletor fora de `__DEV__` — em desenvolvimento ele imprime no console e
 * retorna antes disso. Os testes que exercem o caminho do reporter precisam, portanto, rodar com
 * `__DEV__ = false`, que é o modo de produção de verdade.
 */
// `__DEV__` é global do React Native, não do `globalThis` tipado pelo TS — daí a ponte explícita.
const runtimeGlobal = globalThis as unknown as { __DEV__: boolean };

function withProduction(run: () => void): void {
  const previous = runtimeGlobal.__DEV__;
  runtimeGlobal.__DEV__ = false;

  try {
    run();
  } finally {
    runtimeGlobal.__DEV__ = previous;
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  setCrashReporter(reporter);
});

afterEach(() => {
  // O coletor é estado de MÓDULO: sem isto ele vazaria para as suítes seguintes do mesmo worker.
  setCrashReporter(null);
});

describe('logError — entrega ao coletor de crash', () => {
  it('encaminha scope, erro e contexto para o recordError do reporter injetado', () => {
    const error = new Error('falha ao gravar');

    withProduction(() => {
      logError('readings.add', error, { uid: 'user-1', attempt: 2 });
    });

    expect(recordError).toHaveBeenCalledTimes(1);
    expect(recordError).toHaveBeenCalledWith('readings.add', error, { uid: 'user-1', attempt: 2 });
  });

  it('entrega um objeto vazio quando não há contexto, nunca undefined', () => {
    const error = new Error('sem contexto');

    withProduction(() => {
      logError('appCheck.init', error);
    });

    expect(recordError).toHaveBeenCalledWith('appCheck.init', error, {});
  });

  it('encaminha valor não-Error sem alterá-lo — quem converte é o adapter da plataforma', () => {
    withProduction(() => {
      logError('readings.parse', 'string lançada');
    });

    expect(recordError).toHaveBeenCalledWith('readings.parse', 'string lançada', {});
  });
});

/**
 * A barreira nº 3 do `logError` (ver o doc da função): em produção ele NUNCA lança por causa de
 * chave proibida — sanitiza e segue. O que o coletor recebe é o contexto já limpo, porque é ele
 * que sai do aparelho e vira dado num serviço de terceiros (CLAUDE.md §4.4/§4.5).
 */
describe('logError — sanitização antes de sair do aparelho', () => {
  it('remove chave proibida de primeiro nível e preserva o resto', () => {
    withProduction(() => {
      // @ts-expect-error `email` é rejeitada em compilação por SafeLogContext (barreira nº 1); o
      // teste força o caso em runtime, que é o de contexto montado dinamicamente/por spread.
      logError('auth.signIn', new Error('falhou'), { uid: 'user-1', email: 'alguem@exemplo.com' });
    });

    expect(recordError).toHaveBeenCalledWith('auth.signIn', expect.any(Error), {
      uid: 'user-1',
      email: REMOVED,
    });
  });

  it('remove chave proibida aninhada, que uma checagem só do primeiro nível deixaria passar', () => {
    withProduction(() => {
      logError('auth.profile', new Error('falhou'), { uid: 'user-1', profile: { displayName: 'Fulano' } });
    });

    expect(recordError).toHaveBeenCalledWith('auth.profile', expect.any(Error), {
      uid: 'user-1',
      profile: { displayName: REMOVED },
    });
  });

  it('remove valor de medição — dado de saúde nunca pode chegar ao coletor', () => {
    withProduction(() => {
      // @ts-expect-error `systolic` é rejeitada em compilação por SafeLogContext (barreira nº 1);
      // aqui o teste força o caso em runtime, que é o cenário de contexto montado dinamicamente.
      logError('readings.add', new Error('falhou'), { uid: 'user-1', systolic: 120 });
    });

    expect(recordError).toHaveBeenCalledWith('readings.add', expect.any(Error), {
      uid: 'user-1',
      systolic: REMOVED,
    });
  });

  it('não lança em produção quando o contexto tem chave proibida', () => {
    expect(() =>
      withProduction(() => {
        // @ts-expect-error mesma barreira nº 1 do caso acima, forçada de propósito.
        logError('readings.add', new Error('falhou'), { email: 'alguem@exemplo.com' });
      }),
    ).not.toThrow();
  });
});

describe('logError — quando não há coletor', () => {
  it('não chama nada depois de setCrashReporter(null)', () => {
    setCrashReporter(null);

    withProduction(() => {
      logError('readings.add', new Error('falhou'), { uid: 'user-1' });
    });

    expect(recordError).not.toHaveBeenCalled();
  });

  it('em desenvolvimento vai para o console e não consulta o coletor', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      logError('readings.add', new Error('falhou'), { uid: 'user-1' });

      expect(consoleError).toHaveBeenCalledTimes(1);
      expect(recordError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
