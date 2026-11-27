import { act, renderHook } from '@testing-library/react-native';

import { useSession } from '@/features/auth/useSession';
import { getReadingsForReport } from '@/features/readings/readings.repo';
import { logError } from '@/lib/logger';
import { buildReportModel, type ReportSourceReading } from '@/lib/report/report-model';
import { resolveReportPeriod } from '@/lib/report/report-period';

import { reportPdfPlatform } from './report-pdf-platform';
import type { PrintedReportPdf, ReportPdfPipeline } from './report-pdf-platform.types';
import { REPORT_PREPARATION_TIMEOUT_MS, useReportPdf } from './useReportPdf';

/**
 * Comportamento do hook com um adaptador no modo do ANDROID (`deliveryMode: 'share'`): entrega
 * assíncrona pela folha de compartilhamento, sem prévia embutida, com o arquivo temporário
 * liberado só depois de a folha fechar e descartado quando ninguém vai usá-lo. O adaptador é
 * simulado; o real está em report-pdf-platform.native.test.ts.
 */

jest.mock('@/features/auth/useSession', () => ({ useSession: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));
jest.mock('@/services/firebase', () => ({ firestore: {} }));
jest.mock('@/features/readings/readings.repo', () => {
  const actual = jest.requireActual('@/features/readings/readings.repo');
  return { ReadingsQueryError: actual.ReadingsQueryError, getReadingsForReport: jest.fn() };
});
jest.mock('./report-pdf-platform', () => ({
  reportPdfPlatform: {
    isAvailable: true,
    deliveryMode: 'share',
    loadPipeline: jest.fn(),
    deliver: jest.fn(),
    openPreview: jest.fn(),
    discard: jest.fn(),
  },
}));

const mockUseSession = jest.mocked(useSession);
const mockGetReadingsForReport = jest.mocked(getReadingsForReport);
const mockPlatform = reportPdfPlatform as jest.Mocked<typeof reportPdfPlatform>;
const mockRender = jest.fn<Promise<PrintedReportPdf>, [unknown]>();
const mockRelease = jest.fn();
const mockDiscard = mockPlatform.discard as jest.Mock;

const FILE: PrintedReportPdf = { kind: 'printed-file', uri: 'file:///cache/aferi-relatorios/x/aferi-relatorio.pdf' };
const SHARE_MESSAGE = 'Não foi possível abrir o compartilhamento do relatório. Gere o relatório novamente.';

const pipeline: ReportPdfPipeline = {
  resolvePeriod: (request, preparedAt, timeZone) =>
    resolveReportPeriod(request.kind === 'custom' ? { kind: 'all' } : request, preparedAt, timeZone),
  buildModel: buildReportModel,
  render: (model) => mockRender(model),
};

function signedInAs(uid: string | null): void {
  mockUseSession.mockReturnValue({
    user: uid === null ? null : ({ uid } as ReturnType<typeof useSession>['user']),
    sessionEpoch: null,
    getSessionEpoch: () => null,
    isLoading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  });
}

function recent(): ReportSourceReading {
  const measuredAt = new Date(Date.now() - 60 * 60 * 1000);
  return {
    id: 'synthetic-1',
    systolic: 120,
    diastolic: 80,
    pulse: 70,
    measuredAt,
    createdAt: measuredAt,
    note: null,
    source: 'manual',
    sessionReadings: null,
    hasPendingWrites: false,
  };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function prepared() {
  const hook = await renderHook(() => useReportPdf());
  await act(async () => {
    await hook.result.current.prepareReport({ kind: 'last7' });
  });
  expect(hook.result.current.stage).toBe('review');
  return hook;
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }).setSystemTime(new Date());
  signedInAs('user-a');
  mockPlatform.isAvailable = true;
  mockPlatform.deliveryMode = 'share';
  mockPlatform.loadPipeline.mockResolvedValue(pipeline);
  mockPlatform.openPreview.mockImplementation(() => ({ url: '', release: mockRelease }));
  mockRender.mockResolvedValue(FILE);
  mockGetReadingsForReport.mockResolvedValue({ readings: [recent()], fromCache: false, omittedCount: 0 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useReportPdf no Android (modo share)', () => {
  it('expõe o modo de entrega e revisa sem prévia embutida', async () => {
    const { result } = await prepared();

    expect(result.current.deliveryMode).toBe('share');
    expect(result.current.review?.previewUrl).toBe('');
    expect(result.current.review?.fileName).toMatch(/^aferi-relatorio-\d{4}-\d{2}-\d{2}_a_\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(mockPlatform.openPreview).toHaveBeenCalledWith(FILE);
    expect(mockPlatform.deliver).not.toHaveBeenCalled();
  });

  it('compartilhar: o diálogo pode fechar já, mas o arquivo só é liberado quando a folha fecha', async () => {
    const { result } = await prepared();
    const fileName = result.current.review?.fileName;
    const sheet = deferred<void>();
    mockPlatform.deliver.mockReturnValue(sheet.promise);

    let saved = false;
    await act(async () => {
      saved = result.current.saveReport();
    });

    expect(saved).toBe(true);
    expect(mockPlatform.deliver).toHaveBeenCalledWith(fileName, FILE);
    expect(result.current.stage).toBe('idle');
    expect(mockRelease).not.toHaveBeenCalled();

    await act(async () => {
      sheet.resolve();
      await sheet.promise;
    });

    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(mockDiscard).not.toHaveBeenCalled();
  });

  it('cancelar ou fechar o diálogo durante o compartilhamento não apaga o arquivo em leitura', async () => {
    const { result } = await prepared();
    const sheet = deferred<void>();
    mockPlatform.deliver.mockReturnValue(sheet.promise);

    await act(async () => {
      result.current.saveReport();
    });
    await act(async () => {
      result.current.cancel();
      result.current.changePeriod();
    });

    expect(mockRelease).not.toHaveBeenCalled();

    await act(async () => {
      sheet.resolve();
      await sheet.promise;
    });
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('desmontar durante o compartilhamento: a liberação acontece quando a folha fecha', async () => {
    const { result, unmount } = await prepared();
    const sheet = deferred<void>();
    mockPlatform.deliver.mockReturnValue(sheet.promise);

    await act(async () => {
      result.current.saveReport();
    });
    await unmount();
    expect(mockRelease).not.toHaveBeenCalled();

    await act(async () => {
      sheet.resolve();
      await sheet.promise;
    });
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('falha ao abrir o compartilhamento: mensagem amigável, log sem conteúdo e arquivo liberado', async () => {
    const { result } = await prepared();
    const sheet = deferred<void>();
    mockPlatform.deliver.mockReturnValue(sheet.promise);

    await act(async () => {
      result.current.saveReport();
    });
    await act(async () => {
      sheet.reject(new Error('report-share-failed'));
      await sheet.promise.catch(() => undefined);
    });

    expect(result.current.error).toBe(SHARE_MESSAGE);
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith('report.deliver', new Error('report-deliver-failed'), { uid: 'user-a' });
  });

  it('falha síncrona do adaptador: mensagem de compartilhamento e a revisão continua', async () => {
    const { result } = await prepared();
    mockPlatform.deliver.mockImplementation(() => {
      throw new Error('report-pdf-name-mismatch');
    });

    let saved = true;
    await act(async () => {
      saved = result.current.saveReport();
    });

    expect(saved).toBe(false);
    expect(result.current.stage).toBe('review');
    expect(result.current.error).toBe(SHARE_MESSAGE);
    expect(mockRelease).not.toHaveBeenCalled();
  });

  it('troca de conta durante o compartilhamento: a nova conta não vê o erro da anterior', async () => {
    const hook = await prepared();
    const sheet = deferred<void>();
    mockPlatform.deliver.mockReturnValue(sheet.promise);

    await act(async () => {
      hook.result.current.saveReport();
    });
    signedInAs('user-b');
    await hook.rerender({});

    await act(async () => {
      sheet.reject(new Error('report-share-failed'));
      await sheet.promise.catch(() => undefined);
    });

    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.stage).toBe('idle');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('falha tardia do compartilhamento não sobrescreve uma nova preparação', async () => {
    const { result } = await prepared();
    const sheet = deferred<void>();
    mockPlatform.deliver.mockReturnValue(sheet.promise);
    await act(async () => {
      result.current.saveReport();
    });

    const reading = deferred<Awaited<ReturnType<typeof getReadingsForReport>>>();
    mockGetReadingsForReport.mockReturnValueOnce(reading.promise);
    let preparing: Promise<boolean> = Promise.resolve(false);
    await act(async () => {
      preparing = result.current.prepareReport({ kind: 'last30' });
    });

    await act(async () => {
      sheet.reject(new Error('report-share-failed'));
      await sheet.promise.catch(() => undefined);
    });
    expect(result.current.stage).toBe('preparing');
    expect(result.current.error).toBeNull();

    await act(async () => {
      reading.resolve({ readings: [recent()], fromCache: false, omittedCount: 0 });
      await preparing;
    });
    expect(result.current.stage).toBe('review');
  });

  it('troca de conta com a revisão aberta: o arquivo é liberado e não há entrega', async () => {
    const hook = await prepared();

    signedInAs('user-b');
    await hook.rerender({});

    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(hook.result.current.review).toBeNull();
    expect(hook.result.current.saveReport()).toBe(false);
    expect(mockPlatform.deliver).not.toHaveBeenCalled();
  });

  it('cancelar durante a geração: o arquivo que chega depois é descartado, sem revisão', async () => {
    const rendering = deferred<PrintedReportPdf>();
    mockRender.mockReturnValueOnce(rendering.promise);
    const { result } = await renderHook(() => useReportPdf());

    let preparing: Promise<boolean> = Promise.resolve(true);
    await act(async () => {
      preparing = result.current.prepareReport({ kind: 'last7' });
      await Promise.resolve();
    });
    await act(async () => {
      result.current.cancel();
    });
    await act(async () => {
      rendering.resolve(FILE);
      await preparing;
    });

    expect(mockDiscard).toHaveBeenCalledWith(FILE);
    expect(mockPlatform.openPreview).not.toHaveBeenCalled();
    expect(result.current.stage).toBe('idle');
  });

  it('troca de conta durante a geração: o arquivo da conta anterior é descartado', async () => {
    const rendering = deferred<PrintedReportPdf>();
    mockRender.mockReturnValueOnce(rendering.promise);
    const hook = await renderHook(() => useReportPdf());

    let preparing: Promise<boolean> = Promise.resolve(true);
    await act(async () => {
      preparing = hook.result.current.prepareReport({ kind: 'last7' });
      await Promise.resolve();
    });
    signedInAs('user-b');
    await hook.rerender({});
    await act(async () => {
      rendering.resolve(FILE);
      await preparing;
    });

    expect(mockDiscard).toHaveBeenCalledWith(FILE);
    expect(mockPlatform.openPreview).not.toHaveBeenCalled();
    expect(mockPlatform.deliver).not.toHaveBeenCalled();
  });

  it('prazo estourado na impressão: mensagem, e o arquivo que chega depois é descartado', async () => {
    const rendering = deferred<PrintedReportPdf>();
    mockRender.mockReturnValueOnce(rendering.promise);
    const { result } = await renderHook(() => useReportPdf());

    let preparing: Promise<boolean> = Promise.resolve(true);
    await act(async () => {
      preparing = result.current.prepareReport({ kind: 'last7' });
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(REPORT_PREPARATION_TIMEOUT_MS);
      await preparing;
    });

    expect(result.current.error).toMatch(/demorou demais/);
    expect(mockDiscard).not.toHaveBeenCalled();

    await act(async () => {
      rendering.resolve(FILE);
      await rendering.promise;
    });
    expect(mockDiscard).toHaveBeenCalledWith(FILE);
    expect(mockPlatform.openPreview).not.toHaveBeenCalled();
  });

  it('falha da impressão: mensagem genérica e log sem a exceção do SDK', async () => {
    mockRender.mockRejectedValueOnce(new Error('report-print-failed'));
    const { result } = await renderHook(() => useReportPdf());

    await act(async () => {
      await result.current.prepareReport({ kind: 'last7' });
    });

    expect(result.current.error).toBe('Não foi possível gerar o relatório. Tente novamente.');
    expect(logError).toHaveBeenCalledWith('report.generate', new Error('report-generate-failed'), { uid: 'user-a' });
  });

  it('uma geração por vez: toques repetidos fazem uma impressão só', async () => {
    const { result } = await renderHook(() => useReportPdf());

    await act(async () => {
      await Promise.all([1, 2, 3].map(() => result.current.prepareReport({ kind: 'last7' })));
    });

    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(mockPlatform.openPreview).toHaveBeenCalledTimes(1);
  });
});
