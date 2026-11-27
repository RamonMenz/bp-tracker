/**
 * @jest-environment node
 */
import http from 'node:http';
import https from 'node:https';
import { TextDecoder as NodeTextDecoder } from 'node:util';

import { act, renderHook } from '@testing-library/react-native';
import { getDocs } from 'firebase/firestore';

import { useSession } from '@/features/auth/useSession';
import { setCrashReporter, type CrashReporter } from '@/lib/logger';

import { renderReportPdf, type PdfLibraries } from './render-report-pdf';
import { reportPdfPipeline } from './report-pdf-pipeline';
import { reportPdfPlatform } from './report-pdf-platform';
import { REPORT_PREPARATION_TIMEOUT_MS, useReportPdf } from './useReportPdf';

/**
 * PDF-11 e PDF-13 — o caminho REAL do relatório (hook → repositório → modelo → jsPDF) não faz
 * requisição de rede própria e não entrega ao coletor de erros (Sentry/Crashlytics) valores,
 * observações, nome, e-mail nem mensagens de exceção que possam carregá-los.
 *
 * O logger real roda como em PRODUÇÃO (`__DEV__ = false`), entregando ao coletor espião, que
 * representa o Sentry na Web. O SDK do Firestore é substituído só em `getDocs` (a leitura de rede
 * autorizada, que é do Firestore e não do relatório).
 */

// Mesma ressalva de render-report-pdf.test.ts: o polyfill do Expo só aceita UTF-8.
globalThis.TextDecoder = NodeTextDecoder as unknown as typeof globalThis.TextDecoder;

// require (não import) para rodar DEPOIS da troca do TextDecoder acima — imports sobem ao topo.
const LIBRARIES: PdfLibraries = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- ver comentário acima
  jsPDF: (require('jspdf') as typeof import('jspdf')).jsPDF,
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- ver comentário acima
  autoTable: (require('jspdf-autotable') as typeof import('jspdf-autotable')).autoTable,
};

jest.mock('@/features/auth/useSession', () => ({ useSession: jest.fn() }));
jest.mock('@/services/firebase', () => ({ firestore: {} }));
jest.mock('firebase/firestore', () => ({
  getDocs: jest.fn(),
  query: jest.fn((path: string) => path),
  orderBy: jest.fn(() => 'orderBy'),
  where: jest.fn(() => 'where'),
  collection: (_db: unknown, path: string) => path,
  doc: (_db: unknown, path: string) => path,
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: () => 'SERVER-TIME',
}));
jest.mock('./report-pdf-platform', () => ({
  reportPdfPlatform: { isAvailable: true, loadPipeline: jest.fn(), deliver: jest.fn(), openPreview: jest.fn() },
}));

const SENTINEL_NOTE = 'SENTINELA-OBS tomei remédio às 7h, endereço Rua Sentinela 123';
const SENTINEL_EMAIL = 'sentinela.paciente@example.invalid';
const SENTINEL_NAME = 'Paciente Sentinela';
const SENTINEL_VALUES = '263/197';
const ALLOWED_ERROR_MESSAGES = new Set([
  'reading-parse-failed',
  'report-query-failed',
  'report-generate-failed',
  'report-preparation-timeout',
  'report-deliver-failed',
]);

const mockGetDocs = jest.mocked(getDocs);
const mockPlatform = reportPdfPlatform as jest.Mocked<typeof reportPdfPlatform>;
const recordError = jest.fn<void, Parameters<CrashReporter['recordError']>>();
const fetchTrap = jest.fn(() => Promise.reject(new Error('rede proibida no relatório')));
const consoleCalls: unknown[][] = [];
let previousDev: unknown;
const ORIGINAL_GLOBALS = {
  fetch: globalThis.fetch,
  XMLHttpRequest: (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest,
  WebSocket: (globalThis as { WebSocket?: unknown }).WebSocket,
};
let httpRequest: jest.SpyInstance;
let httpsRequest: jest.SpyInstance;
let httpGet: jest.SpyInstance;
let httpsGet: jest.SpyInstance;

function documentOf(id: string, data: Record<string, unknown>, hasPendingWrites = false) {
  return { id, data: () => data, metadata: { hasPendingWrites, fromCache: false } };
}

function validDoc(isoInstant: string, systolic: number, diastolic: number, note: string | null) {
  const instant = new Date(isoInstant);
  return { systolic, diastolic, pulse: 88, measuredAt: instant, createdAt: instant, note, source: 'manual', sessionReadings: null };
}

function serverReturns(docs: ReturnType<typeof documentOf>[]): void {
  mockGetDocs.mockResolvedValue({ docs, metadata: { fromCache: false, hasPendingWrites: false } } as unknown as Awaited<
    ReturnType<typeof getDocs>
  >);
}

/** Tudo que saiu para o coletor e para o console, serializado — inclusive mensagem e pilha. */
function everythingLogged(): string {
  const serialize = (value: unknown): unknown =>
    value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value;
  return JSON.stringify([
    ...recordError.mock.calls.map((call) => call.map(serialize)),
    ...consoleCalls.map((call) => call.map(serialize)),
  ]);
}

function expectNothingSensitiveLeaked(): void {
  const logged = everythingLogged();

  for (const sentinel of ['SENTINELA', SENTINEL_EMAIL, SENTINEL_NAME, SENTINEL_VALUES, 'Rua Sentinela']) {
    expect(logged).not.toContain(sentinel);
  }

  for (const [, error, context] of recordError.mock.calls) {
    expect(error).toBeInstanceOf(Error);
    expect(ALLOWED_ERROR_MESSAGES.has((error as Error).message)).toBe(true);
    // Contexto só com chaves não clínicas e não identificadoras (uid é permitido — CLAUDE.md §4.5).
    expect(Object.keys(context).every((key) => key === 'uid' || key === 'docId')).toBe(true);
  }
}

function expectNoNetwork(): void {
  expect(fetchTrap).not.toHaveBeenCalled();
  expect(httpRequest).not.toHaveBeenCalled();
  expect(httpsRequest).not.toHaveBeenCalled();
  expect(httpGet).not.toHaveBeenCalled();
  expect(httpsGet).not.toHaveBeenCalled();
}

beforeEach(() => {
  jest.resetAllMocks();
  consoleCalls.length = 0;

  // Produção: o logger entrega ao coletor (Sentry na Web) em vez do console.
  previousDev = (globalThis as { __DEV__?: unknown }).__DEV__;
  (globalThis as { __DEV__?: unknown }).__DEV__ = false;
  setCrashReporter({ recordError });

  for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    jest.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      consoleCalls.push(args);
    });
  }

  // Armadilhas de rede: o relatório não pode usar nenhuma.
  globalThis.fetch = fetchTrap as unknown as typeof fetch;
  (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = class {
    constructor() {
      throw new Error('XMLHttpRequest proibido no relatório');
    }
  };
  (globalThis as { WebSocket?: unknown }).WebSocket = class {
    constructor() {
      throw new Error('WebSocket proibido no relatório');
    }
  };
  httpRequest = jest.spyOn(http, 'request');
  httpsRequest = jest.spyOn(https, 'request');
  httpGet = jest.spyOn(http, 'get');
  httpsGet = jest.spyOn(https, 'get');

  jest.mocked(useSession).mockReturnValue({
    user: { uid: 'uid-sintetico', email: SENTINEL_EMAIL, displayName: SENTINEL_NAME, photoURL: 'https://exemplo.invalid/foto.png' },
    isLoading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  } as unknown as ReturnType<typeof useSession>);

  mockPlatform.isAvailable = true;
  mockPlatform.loadPipeline.mockResolvedValue({
    resolvePeriod: reportPdfPipeline.resolvePeriod,
    buildModel: reportPdfPipeline.buildModel,
    // Renderização REAL (jsPDF); só o carregamento por import() é trocado pelo require acima.
    render: async (model) => new Blob([renderReportPdf(model, LIBRARIES).bytes], { type: 'application/pdf' }),
  });
  mockPlatform.openPreview.mockImplementation(() => ({ url: 'blob:previa-sintetica', release: jest.fn() }));
});

afterEach(() => {
  (globalThis as { __DEV__?: unknown }).__DEV__ = previousDev;
  globalThis.fetch = ORIGINAL_GLOBALS.fetch;
  (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = ORIGINAL_GLOBALS.XMLHttpRequest;
  (globalThis as { WebSocket?: unknown }).WebSocket = ORIGINAL_GLOBALS.WebSocket;
  setCrashReporter(null);
  jest.restoreAllMocks();
});

async function prepareAll() {
  const hook = await renderHook(() => useReportPdf());
  await act(async () => {
    await hook.result.current.prepareReport({ kind: 'all' });
  });
  return hook;
}

describe('relatório PDF — rede e logs com dados sensíveis (PDF-11/13)', () => {
  it('caminho feliz com documento inválido: PDF gerado e salvo, sem rede, e o log só leva uid/docId', async () => {
    serverReturns([
      documentOf('doc-1', validDoc('2026-10-05T12:00:00.000Z', 263, 197, SENTINEL_NOTE)),
      // Inválido de propósito (sistólica < diastólica), com conteúdo sentinela.
      documentOf('doc-invalido', validDoc('2026-10-06T12:00:00.000Z', 90, 197, SENTINEL_NOTE)),
    ]);

    const { result } = await prepareAll();
    expect(result.current.stage).toBe('review');
    expect(result.current.review?.warnings.join(' ')).toMatch(/1 registro do período não pôde ser lido/);

    await act(async () => {
      expect(result.current.saveReport()).toBe(true);
    });

    // O PDF entregue é do próprio usuário (pode conter a observação), mas não traz identificação.
    const [, pdf] = mockPlatform.deliver.mock.calls[0];
    const raw = Buffer.from(await (pdf as Blob).arrayBuffer()).toString('latin1');
    expect(raw).not.toContain(SENTINEL_EMAIL);
    expect(raw).not.toContain('Sentinela@');
    expect(raw).not.toMatch(/\/Author/);
    expect(raw).not.toContain('uid-sintetico');

    expect(recordError).toHaveBeenCalledWith('readings.parse', new Error('reading-parse-failed'), {
      uid: 'uid-sintetico',
      docId: 'doc-invalido',
    });
    expectNothingSensitiveLeaked();
    expectNoNetwork();
  });

  it('exceção do SDK com conteúdo sensível na mensagem: nada dela chega ao coletor', async () => {
    mockGetDocs.mockRejectedValue(
      Object.assign(new Error(`SENTINELA-SDK ${SENTINEL_VALUES} ${SENTINEL_NOTE} ${SENTINEL_EMAIL}`), { code: 'unavailable' }),
    );

    const { result } = await prepareAll();

    expect(result.current.error).toBe('Sem conexão com a internet. Verifique sua rede e tente novamente.');
    expect(recordError).toHaveBeenCalledWith('readings.report-query', new Error('report-query-failed'), { uid: 'uid-sintetico' });
    expectNothingSensitiveLeaked();
    expectNoNetwork();
  });

  it('exceção do renderizador com valores e observação na mensagem: só o erro genérico é registrado', async () => {
    serverReturns([documentOf('doc-1', validDoc('2026-10-05T12:00:00.000Z', 263, 197, SENTINEL_NOTE))]);
    mockPlatform.loadPipeline.mockResolvedValue({
      ...reportPdfPipeline,
      render: () => Promise.reject(new Error(`jsPDF: ${SENTINEL_VALUES} — ${SENTINEL_NOTE}`)),
    });

    const { result } = await prepareAll();

    expect(result.current.error).toBe('Não foi possível gerar o relatório. Tente novamente.');
    expect(recordError).toHaveBeenCalledWith('report.generate', new Error('report-generate-failed'), { uid: 'uid-sintetico' });
    expectNothingSensitiveLeaked();
    expectNoNetwork();
  });

  it('falha no download e prazo estourado: mensagens fixas, sem conteúdo', async () => {
    serverReturns([documentOf('doc-1', validDoc('2026-10-05T12:00:00.000Z', 263, 197, SENTINEL_NOTE))]);
    mockPlatform.deliver.mockImplementation(() => {
      throw new Error(`SecurityError ${SENTINEL_NOTE}`);
    });

    const { result } = await prepareAll();
    await act(async () => {
      result.current.saveReport();
    });
    expect(recordError).toHaveBeenCalledWith('report.deliver', new Error('report-deliver-failed'), { uid: 'uid-sintetico' });

    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    mockGetDocs.mockReturnValue(new Promise(() => undefined));
    let preparation: Promise<boolean> = Promise.resolve(true);
    await act(async () => {
      result.current.cancel();
      preparation = result.current.prepareReport({ kind: 'all' });
    });
    await act(async () => {
      jest.advanceTimersByTime(REPORT_PREPARATION_TIMEOUT_MS);
      await preparation;
    });
    jest.useRealTimers();

    expect(recordError).toHaveBeenCalledWith('report.timeout', new Error('report-preparation-timeout'), { uid: 'uid-sintetico' });
    expectNothingSensitiveLeaked();
    expectNoNetwork();
  });
});
