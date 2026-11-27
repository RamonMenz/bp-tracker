/**
 * @jest-environment jsdom
 */

/**
 * Privacidade do coletor web: usa o `@sentry/browser` REAL (o teste irmão, `crashReporter.web.test.ts`,
 * mocka o SDK e por isso não enxerga o que ele monta sozinho) e troca só o TRANSPORTE por um espião.
 * O `Sentry.init` continua sendo chamado pelo adapter, com as opções reais dele — é o evento que
 * SAIRIA do dispositivo que se inspeciona, byte a byte, atrás de sentinelas.
 *
 * Constitution §2 e CLAUDE.md §4.4/§4.5: valor de medição, observação, e-mail e nome não podem
 * integrar relatório de falha nem telemetria.
 */
// O ambiente jsdom do Jest não traz TextEncoder/TextDecoder, que o SDK (via whatwg-url) exige no init.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- precisa rodar antes de qualquer import do SDK
const { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder } = require('util');
Object.assign(globalThis, {
  TextEncoder: NodeTextEncoder,
  TextDecoder: NodeTextDecoder,
});

const mockSent: string[] = [];

jest.mock('@sentry/browser', () => {
  const actual = jest.requireActual<typeof import('@sentry/browser')>('@sentry/browser');

  return {
    ...actual,
    init: (options: Parameters<typeof actual.init>[0]) =>
      actual.init({
        ...options,
        // Substitui apenas a saída de rede. Nenhum DSN real, nenhum envio.
        transport: () => ({
          send: async (envelope: unknown) => {
            mockSent.push(JSON.stringify(envelope));
            return {};
          },
          flush: async () => true,
        }),
      }),
  };
});

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: { sentry: { dsn: 'https://publickey@sentry.invalid/1' } },
    },
  },
}));

const PRESSURE = '128 por 82';
const NOTE = 'observacao-sentinela-dor-de-cabeca';
const EMAIL = 'paciente.sentinela@exemplo.com';
const NAME = 'Maria Sentinela Souza';

const SENTINELS = { PRESSURE, NOTE, EMAIL, NAME };

/** Devolve o que o adapter enviaria ao Sentry depois de `act` rodar e um erro ser reportado. */
async function captureWith(act: () => void | Promise<void>, error: unknown = new Error('falha')) {
  let adapter: typeof import('./crashReporter.web');
  let sentry: typeof import('@sentry/browser');

  jest.isolateModules(() => {
    // Módulo novo por teste: o adapter memoiza o cliente, e o SDK guarda estado global.
    /* eslint-disable @typescript-eslint/no-require-imports */
    adapter = require('./crashReporter.web');
    sentry = require('@sentry/browser');
    /* eslint-enable @typescript-eslint/no-require-imports */
  });

  // 1º erro só para inicializar o SDK (as instrumentações são instaladas no init); depois descartado.
  adapter!.crashReporter.recordError('init', new Error('inicializacao'), {});
  await sentry!.flush(2000);
  mockSent.length = 0;

  await act();

  adapter!.crashReporter.recordError('readings.add', error, {
    uid: 'user-1',
    docId: 'doc-1',
  });
  await sentry!.flush(2000);

  return mockSent.join('\n');
}

function expectNoSentinel(payload: string, sentinel: keyof typeof SENTINELS): void {
  expect(payload).not.toBe('');
  expect(payload).not.toContain(SENTINELS[sentinel]);
  expect(payload).not.toContain(encodeURIComponent(SENTINELS[sentinel]));
}

beforeEach(() => {
  mockSent.length = 0;
  document.body.innerHTML = '';
});

describe('crashReporter (web) — nada de interface, navegação ou rede acompanha o erro', () => {
  it('clique: aria-label com valor de pressão não vira breadcrumb', async () => {
    const payload = await captureWith(() => {
      const row = document.createElement('button');
      row.setAttribute('aria-label', `Medição ${PRESSURE}`);
      row.setAttribute('title', NAME);
      row.setAttribute('name', EMAIL);
      document.body.appendChild(row);
      row.click();
    });

    expectNoSentinel(payload, 'PRESSURE');
    expectNoSentinel(payload, 'NAME');
    expectNoSentinel(payload, 'EMAIL');
  });

  it('input: digitar em campo com nome/rótulo sensível não vira breadcrumb', async () => {
    const payload = await captureWith(() => {
      const input = document.createElement('input');
      input.setAttribute('aria-label', `Observação ${NOTE}`);
      input.setAttribute('name', EMAIL);
      document.body.appendChild(input);
      input.dispatchEvent(new KeyboardEvent('keypress', { key: 'a', bubbles: true }));
    });

    expectNoSentinel(payload, 'NOTE');
    expectNoSentinel(payload, 'EMAIL');
  });

  it('navegação: URL de history com dado sensível não vira breadcrumb', async () => {
    const payload = await captureWith(() => {
      window.history.pushState({}, '', `/history?obs=${encodeURIComponent(NOTE)}&p=${PRESSURE}`);
    });

    expectNoSentinel(payload, 'NOTE');
    expectNoSentinel(payload, 'PRESSURE');
  });

  it('console: argumentos de console.* não viram breadcrumb', async () => {
    const spies = (['log', 'info', 'warn', 'error'] as const).map((method) =>
      jest.spyOn(console, method).mockImplementation(() => undefined),
    );

    try {
      const payload = await captureWith(() => {
        /* eslint-disable no-console -- é o próprio vetor de vazamento sob teste */
        console.log(`pressão ${PRESSURE}`, { email: EMAIL });
        console.warn(NAME, NOTE);
        /* eslint-enable no-console */
      });

      expectNoSentinel(payload, 'PRESSURE');
      expectNoSentinel(payload, 'EMAIL');
      expectNoSentinel(payload, 'NAME');
      expectNoSentinel(payload, 'NOTE');
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });

  it('fetch: URL de requisição com dado sensível não vira breadcrumb', async () => {
    // O SDK só instrumenta um fetch que se diga nativo; o jsdom não tem fetch, então o stub imita.
    const fakeFetch = jest.fn(async () => ({
      status: 200,
      ok: true,
      headers: new Map(),
    }));
    fakeFetch.toString = () => 'function fetch() { [native code] }';
    Object.defineProperty(window, 'fetch', {
      value: fakeFetch,
      configurable: true,
      writable: true,
    });

    try {
      const payload = await captureWith(async () => {
        await window.fetch(`https://api.exemplo.com/v1?email=${EMAIL}&obs=${NOTE}&p=${PRESSURE}`);
      });

      expectNoSentinel(payload, 'EMAIL');
      expectNoSentinel(payload, 'NOTE');
    } finally {
      Reflect.deleteProperty(window, 'fetch');
    }
  });

  it('xhr: URL de XMLHttpRequest com dado sensível não vira breadcrumb', async () => {
    // O jsdom loga a conexão recusada (de propósito, abaixo) via console.error.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const payload = await captureWith(async () => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `http://localhost:9/x?email=${EMAIL}&obs=${NOTE}`);
      // `loadend` é quem gera o breadcrumb; a conexão recusada o dispara sem rede real.
      await new Promise<void>((resolve) => {
        xhr.addEventListener('loadend', () => resolve());
        xhr.send();
      });
    });

    errorSpy.mockRestore();
    expectNoSentinel(payload, 'EMAIL');
    expectNoSentinel(payload, 'NOTE');
  });

  it('mensagem de exceção: texto do erro (e da causa) não sai, mas tipo e stack sim', async () => {
    const error = new TypeError(`falha com ${PRESSURE} de ${NAME}`, {
      cause: new RangeError(`obs ${NOTE} de ${EMAIL}`),
    });

    const payload = await captureWith(() => undefined, error);

    expectNoSentinel(payload, 'PRESSURE');
    expectNoSentinel(payload, 'NAME');
    expectNoSentinel(payload, 'NOTE');
    expectNoSentinel(payload, 'EMAIL');
    // O essencial para diagnosticar continua: tipo, stack e origem.
    expect(payload).toContain('TypeError');
    expect(payload).toContain('"frames"');
  });

  it('valor lançado que não é Error (objeto com e-mail/pressão) não sai', async () => {
    const payload = await captureWith(() => undefined, {
      email: EMAIL,
      valor: PRESSURE,
    });

    expectNoSentinel(payload, 'EMAIL');
    expectNoSentinel(payload, 'PRESSURE');
  });
});

describe('crashReporter (web) — o essencial continua no evento', () => {
  it('mantém scope como tag e uid/docId como extra', async () => {
    const payload = await captureWith(() => undefined);

    expect(payload).toContain('"scope":"readings.add"');
    expect(payload).toContain('"uid":"user-1"');
    expect(payload).toContain('"docId":"doc-1"');
  });

  it('não envia breadcrumbs, usuário nem requisição', async () => {
    const payload = await captureWith(() => {
      document.body.appendChild(document.createElement('button')).click();
    });

    expect(payload).not.toContain('"breadcrumbs"');
    expect(payload).not.toContain('"user"');
    expect(payload).not.toContain('"request"');
  });
});
