import { act, renderHook } from '@testing-library/react-native';

import { useSession } from '@/features/auth/useSession';
import {
  addReading,
  deleteReading,
  getReadingsForReport,
  ReadingsQueryError,
  updateReading,
} from '@/features/readings/readings.repo';
import { logError } from '@/lib/logger';
import { buildReportModel, type ReportSourceReading, type ReportSourceSnapshot } from '@/lib/report/report-model';
import { civilDateOf, resolveReportPeriod } from '@/lib/report/report-period';

import { reportPdfPlatform } from './report-pdf-platform';
import type { ReportPdfPipeline } from './report-pdf-platform.types';
import { useReportPdf } from './useReportPdf';

jest.mock('@/features/auth/useSession', () => ({ useSession: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));
// requireActual do repositório (só pela classe de erro) não pode inicializar o Firebase real.
jest.mock('@/services/firebase', () => ({ firestore: {} }));
jest.mock('@/features/readings/readings.repo', () => {
  const actual = jest.requireActual('@/features/readings/readings.repo');
  return {
    ReadingsQueryError: actual.ReadingsQueryError,
    getReadingsForReport: jest.fn(),
    // Presentes só para provar que o relatório NUNCA escreve.
    addReading: jest.fn(),
    updateReading: jest.fn(),
    deleteReading: jest.fn(),
    getAllReadings: jest.fn(),
  };
});
jest.mock('./report-pdf-platform', () => ({
  reportPdfPlatform: { isAvailable: true, loadPipeline: jest.fn(), deliver: jest.fn() },
}));

const mockUseSession = jest.mocked(useSession);
const mockGetReadingsForReport = jest.mocked(getReadingsForReport);
const mockPlatform = reportPdfPlatform as jest.Mocked<typeof reportPdfPlatform>;
const mockRender = jest.fn<Promise<Blob>, [unknown]>();

// O pipeline real de período e modelo (puro); só a renderização é substituída.
const pipeline: ReportPdfPipeline = {
  resolvePeriod: (request, preparedAt, timeZone) =>
    request.kind === 'custom'
      ? resolveReportPeriod(
          { kind: 'custom', startDay: civilDateOf(request.start, timeZone), endDay: civilDateOf(request.end, timeZone) },
          preparedAt,
          timeZone,
        )
      : resolveReportPeriod(request, preparedAt, timeZone),
  buildModel: buildReportModel,
  render: (model) => mockRender(model),
};

const FAKE_PDF = { size: 1, type: 'application/pdf' } as Blob;

function signedInAs(uid: string | null): void {
  mockUseSession.mockReturnValue({
    user: uid === null ? null : ({ uid } as ReturnType<typeof useSession>['user']),
    isLoading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  });
}

function reading(measuredAt: Date): ReportSourceReading {
  return {
    id: `synthetic-${measuredAt.getTime()}`,
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

function snapshot(readings: ReportSourceReading[], extra: Partial<ReportSourceSnapshot> = {}): ReportSourceSnapshot {
  return { readings, fromCache: false, omittedCount: 0, ...extra };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }).setSystemTime(new Date());
  signedInAs('user-a');
  mockPlatform.isAvailable = true;
  mockPlatform.loadPipeline.mockResolvedValue(pipeline);
  mockRender.mockResolvedValue(FAKE_PDF);
  mockGetReadingsForReport.mockResolvedValue(snapshot([reading(new Date(Date.now() - 60 * 60 * 1000))]));
});

afterEach(() => {
  jest.useRealTimers();
});

function expectNoWrites(): void {
  expect(addReading).not.toHaveBeenCalled();
  expect(updateReading).not.toHaveBeenCalled();
  expect(deleteReading).not.toHaveBeenCalled();
}

describe('useReportPdf — geração', () => {
  it('lê o período do próprio usuário, renderiza e entrega o PDF com nome sem identificador pessoal', async () => {
    const { result } = await renderHook(() => useReportPdf());
    let delivered = false;

    await act(async () => {
      delivered = await result.current.generateReport({ kind: 'last30' });
    });

    expect(delivered).toBe(true);
    expect(mockGetReadingsForReport).toHaveBeenCalledTimes(1);
    const [uid, range] = mockGetReadingsForReport.mock.calls[0];
    expect(uid).toBe('user-a');
    expect(range.startInclusive).toBeInstanceOf(Date);
    expect(range.endExclusive.getTime()).toBeGreaterThan(range.startInclusive?.getTime() ?? 0);

    expect(mockPlatform.deliver).toHaveBeenCalledTimes(1);
    const [fileName, pdf] = mockPlatform.deliver.mock.calls[0];
    expect(fileName).toMatch(/^aferi-relatorio-\d{4}-\d{2}-\d{2}_a_\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(fileName).not.toContain('user-a');
    expect(pdf).toBe(FAKE_PDF);
    expect(result.current.error).toBeNull();
    expect(result.current.isGenerating).toBe(false);
    expectNoWrites();
  });

  it('período vazio: mensagem pedida e nenhum PDF renderizado nem entregue', async () => {
    mockGetReadingsForReport.mockResolvedValue(snapshot([]));
    const { result } = await renderHook(() => useReportPdf());

    await act(async () => {
      await result.current.generateReport({ kind: 'last7' });
    });

    expect(result.current.error).toBe('Nenhuma medição no período selecionado.');
    expect(mockRender).not.toHaveBeenCalled();
    expect(mockPlatform.deliver).not.toHaveBeenCalled();
  });

  it('período vazio com leitura não confirmada não afirma que o período está vazio', async () => {
    mockGetReadingsForReport.mockResolvedValue(snapshot([], { fromCache: true }));
    const { result } = await renderHook(() => useReportPdf());

    await act(async () => {
      await result.current.generateReport({ kind: 'last7' });
    });

    expect(result.current.error).toMatch(/não foi possível confirmar o histórico completo/);
    expect(mockPlatform.deliver).not.toHaveBeenCalled();
  });

  it('personalizado invertido é bloqueado antes de qualquer consulta', async () => {
    const { result } = await renderHook(() => useReportPdf());

    await act(async () => {
      await result.current.generateReport({ kind: 'custom', start: new Date(2026, 9, 10), end: new Date(2026, 9, 1) });
    });

    expect(result.current.error).toBe('A data de fim deve ser igual ou posterior à de início.');
    expect(mockGetReadingsForReport).not.toHaveBeenCalled();
  });

  it('sem sessão, pede login e não inicia a geração', async () => {
    signedInAs(null);
    const { result } = await renderHook(() => useReportPdf());

    await act(async () => {
      await result.current.generateReport({ kind: 'all' });
    });

    expect(result.current.error).toBe('Sessão expirada. Faça login novamente.');
    expect(mockPlatform.loadPipeline).not.toHaveBeenCalled();
  });

  it('indisponível na plataforma (Android nesta etapa): nada é carregado', async () => {
    mockPlatform.isAvailable = false;
    const { result } = await renderHook(() => useReportPdf());

    expect(result.current.isAvailable).toBe(false);

    await act(async () => {
      await result.current.generateReport({ kind: 'all' });
    });

    expect(mockPlatform.loadPipeline).not.toHaveBeenCalled();
    expect(result.current.error).toBe('O relatório em PDF ainda não está disponível neste aparelho.');
  });
});

describe('useReportPdf — falhas sem vazar conteúdo', () => {
  it('exceção do renderizador com conteúdo clínico: mensagem amigável e log sem a mensagem original', async () => {
    mockRender.mockRejectedValue(new Error('SENTINELA 120/80 observação privada'));
    const { result } = await renderHook(() => useReportPdf());

    await act(async () => {
      await result.current.generateReport({ kind: 'all' });
    });

    expect(result.current.error).toBe('Não foi possível gerar o relatório. Tente novamente.');
    expect(logError).toHaveBeenCalledWith('report.generate', new Error('report-generate-failed'), { uid: 'user-a' });
    expect(JSON.stringify(jest.mocked(logError).mock.calls)).not.toMatch(/SENTINELA|120\/80|observação/);
    expect(mockPlatform.deliver).not.toHaveBeenCalled();
  });

  it.each([
    ['network', 'Sem conexão com a internet. Verifique sua rede e tente novamente.'],
    ['permission', 'Sem permissão para ler seu histórico. Faça login novamente.'],
  ] as const)('falha de leitura (%s) vira mensagem própria do relatório', async (reason, message) => {
    mockGetReadingsForReport.mockRejectedValue(new ReadingsQueryError(reason));
    const { result } = await renderHook(() => useReportPdf());

    await act(async () => {
      await result.current.generateReport({ kind: 'all' });
    });

    expect(result.current.error).toBe(message);
  });

  it('falha no download não expõe a exceção do navegador', async () => {
    mockPlatform.deliver.mockImplementation(() => {
      throw new Error('SecurityError: detalhe interno');
    });
    const { result } = await renderHook(() => useReportPdf());

    await act(async () => {
      await result.current.generateReport({ kind: 'all' });
    });

    expect(result.current.error).toBe('Não foi possível baixar o relatório. Tente novamente.');
  });
});

describe('useReportPdf — concorrência, cancelamento e troca de conta', () => {
  it('não dispara gerações concorrentes', async () => {
    const pending = deferred<ReportSourceSnapshot>();
    mockGetReadingsForReport.mockReturnValue(pending.promise);
    const { result } = await renderHook(() => useReportPdf());

    let first: Promise<boolean> = Promise.resolve(false);
    let second = true;

    await act(async () => {
      first = result.current.generateReport({ kind: 'all' });
      second = await result.current.generateReport({ kind: 'all' });
    });

    expect(second).toBe(false);
    expect(result.current.isGenerating).toBe(true);

    await act(async () => {
      pending.resolve(snapshot([reading(new Date(Date.now() - 1000))]));
      await first;
    });

    expect(mockGetReadingsForReport).toHaveBeenCalledTimes(1);
    expect(mockPlatform.deliver).toHaveBeenCalledTimes(1);
  });

  it('cancelar durante a geração descarta o resultado', async () => {
    const pending = deferred<ReportSourceSnapshot>();
    mockGetReadingsForReport.mockReturnValue(pending.promise);
    const { result } = await renderHook(() => useReportPdf());

    let generation: Promise<boolean> = Promise.resolve(true);

    await act(async () => {
      generation = result.current.generateReport({ kind: 'all' });
    });

    await act(async () => {
      result.current.cancel();
    });

    expect(result.current.isGenerating).toBe(false);

    await act(async () => {
      pending.resolve(snapshot([reading(new Date(Date.now() - 1000))]));
      expect(await generation).toBe(false);
    });

    expect(mockRender).not.toHaveBeenCalled();
    expect(mockPlatform.deliver).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it('descarta o resultado quando o uid muda durante a geração', async () => {
    const pendingRender = deferred<Blob>();
    mockRender.mockReturnValue(pendingRender.promise);
    const { result, rerender } = await renderHook(() => useReportPdf());

    let generation: Promise<boolean> = Promise.resolve(true);

    await act(async () => {
      generation = result.current.generateReport({ kind: 'all' });
    });

    // Ainda renderizando a conta A quando a sessão passa para a conta B.
    signedInAs('user-b');
    await rerender({});

    await act(async () => {
      pendingRender.resolve(FAKE_PDF);
      expect(await generation).toBe(false);
    });

    expect(mockPlatform.deliver).not.toHaveBeenCalled();
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
