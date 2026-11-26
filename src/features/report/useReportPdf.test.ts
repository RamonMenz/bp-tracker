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
import {
  buildReportModel,
  MAX_REPORT_READINGS,
  type ReportSourceReading,
  type ReportSourceSnapshot,
} from '@/lib/report/report-model';
import { civilDateOf, resolveReportPeriod } from '@/lib/report/report-period';

// `./report-pdf-platform` (mockado abaixo) e `./report-pdf-platform.web` (o adaptador real, usado
// para provar a revogação das URLs) são módulos distintos no Jest; o resolvedor do ESLint os
// confunde por causa do sufixo de plataforma.
// eslint-disable-next-line import/no-duplicates
import { reportPdfPlatform } from './report-pdf-platform';
import type { ReportPdfPipeline } from './report-pdf-platform.types';
// eslint-disable-next-line import/no-duplicates
import { OBJECT_URL_REVOKE_DELAY_MS, openPdfPreview } from './report-pdf-platform.web';
import { REPORT_PREPARATION_TIMEOUT_MS, useReportPdf } from './useReportPdf';

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
  reportPdfPlatform: { isAvailable: true, loadPipeline: jest.fn(), deliver: jest.fn(), openPreview: jest.fn() },
}));

const mockUseSession = jest.mocked(useSession);
const mockGetReadingsForReport = jest.mocked(getReadingsForReport);
const mockPlatform = reportPdfPlatform as jest.Mocked<typeof reportPdfPlatform>;
const mockRender = jest.fn<Promise<Blob>, [unknown]>();
const mockRelease = jest.fn();

// Período e modelo reais (puros); só a renderização e a plataforma são substituídas.
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

let nextId = 0;

function reading(measuredAt: Date, overrides: Partial<ReportSourceReading> = {}): ReportSourceReading {
  nextId += 1;
  return {
    id: `synthetic-${nextId}`,
    systolic: 120,
    diastolic: 80,
    pulse: 70,
    measuredAt,
    createdAt: measuredAt,
    note: null,
    source: 'manual',
    sessionReadings: null,
    hasPendingWrites: false,
    ...overrides,
  };
}

function snapshot(readings: ReportSourceReading[], extra: Partial<ReportSourceSnapshot> = {}): ReportSourceSnapshot {
  return { readings, fromCache: false, omittedCount: 0, ...extra };
}

function recent(): ReportSourceReading {
  return reading(new Date(Date.now() - 60 * 60 * 1000));
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

beforeEach(() => {
  // reset (não clear): implementações trocadas num teste (ex.: `deliver` que lança) não podem
  // vazar para os seguintes. Tudo o que os testes precisam é reinstalado logo abaixo.
  jest.resetAllMocks();
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }).setSystemTime(new Date());
  signedInAs('user-a');
  mockPlatform.isAvailable = true;
  mockPlatform.loadPipeline.mockResolvedValue(pipeline);
  mockPlatform.openPreview.mockImplementation(() => ({ url: 'blob:previa-sintetica', release: mockRelease }));
  mockRender.mockResolvedValue(FAKE_PDF);
  mockGetReadingsForReport.mockResolvedValue(snapshot([recent()]));
});

afterEach(() => {
  jest.useRealTimers();
});

function expectNoWrites(): void {
  expect(addReading).not.toHaveBeenCalled();
  expect(updateReading).not.toHaveBeenCalled();
  expect(deleteReading).not.toHaveBeenCalled();
}

async function prepared(request: Parameters<ReturnType<typeof useReportPdf>['prepareReport']>[0] = { kind: 'last30' }) {
  const hook = await renderHook(() => useReportPdf());
  await act(async () => {
    await hook.result.current.prepareReport(request);
  });
  return hook;
}

describe('useReportPdf — preparar e revisar antes de salvar', () => {
  it('prepara a pré-visualização local com resumo, sem entregar arquivo nem escrever', async () => {
    const { result } = await prepared();

    expect(mockGetReadingsForReport).toHaveBeenCalledTimes(1);
    expect(mockGetReadingsForReport.mock.calls[0][0]).toBe('user-a');
    expect(mockPlatform.openPreview).toHaveBeenCalledWith(FAKE_PDF);
    expect(mockPlatform.deliver).not.toHaveBeenCalled();

    expect(result.current.stage).toBe('review');
    expect(result.current.review).toMatchObject({
      previewUrl: 'blob:previa-sintetica',
      isCoverageConfirmed: true,
      warnings: [],
    });
    expect(result.current.review?.fileName).toMatch(/^aferi-relatorio-\d{4}-\d{2}-\d{2}_a_\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(result.current.review?.averages.map((line) => line.label)).toEqual([
      'Sistólica média',
      'Diastólica média',
      'Pulso médio',
    ]);
    expectNoWrites();
  });

  it('"Salvar PDF" entrega o mesmo PDF da prévia e libera a URL da prévia', async () => {
    const { result } = await prepared();
    const fileName = result.current.review?.fileName;
    let saved = false;

    await act(async () => {
      saved = result.current.saveReport();
    });

    expect(saved).toBe(true);
    expect(mockPlatform.deliver).toHaveBeenCalledWith(fileName, FAKE_PDF);
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(result.current.stage).toBe('idle');
    expect(result.current.review).toBeNull();
  });

  it('"Alterar período" descarta a revisão e libera a prévia sem salvar', async () => {
    const { result } = await prepared();

    await act(async () => {
      result.current.changePeriod();
    });

    expect(result.current.stage).toBe('idle');
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(mockPlatform.deliver).not.toHaveBeenCalled();
  });

  it('desmontar com a revisão aberta libera a prévia', async () => {
    const { unmount } = await prepared();

    await act(async () => {
      unmount();
    });

    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('falha no download não expõe a exceção do navegador e mantém a revisão', async () => {
    mockPlatform.deliver.mockImplementation(() => {
      throw new Error('SecurityError: detalhe interno');
    });
    const { result } = await prepared();

    await act(async () => {
      result.current.saveReport();
    });

    expect(result.current.error).toBe('Não foi possível baixar o relatório. Tente novamente.');
    expect(result.current.stage).toBe('review');
  });
});

describe('useReportPdf — cobertura não confirmada avisada ANTES de exportar (PDF-19)', () => {
  it.each([
    ['cache', snapshot([recent()], { fromCache: true }), /armazenamento local do aparelho/],
    ['omissão', snapshot([recent()], { omittedCount: 2 }), /2 registros do período não puderam ser lidos/],
    ['pendência', snapshot([reading(new Date(Date.now() - 1000), { hasPendingWrites: true })]), /pendente de sincronização/],
  ])('%s: revisão marcada como não confirmada, com o aviso, e nada salvo automaticamente', async (_label, data, warning) => {
    mockGetReadingsForReport.mockResolvedValue(data);
    const { result } = await prepared();

    expect(result.current.stage).toBe('review');
    expect(result.current.review?.isCoverageConfirmed).toBe(false);
    expect(result.current.review?.warnings.join(' ')).toMatch(warning);
    expect(mockPlatform.deliver).not.toHaveBeenCalled();
  });

  it('"Tentar novamente" faz NOVA leitura com o mesmo período e troca a prévia', async () => {
    mockGetReadingsForReport.mockResolvedValueOnce(snapshot([recent()], { fromCache: true }));
    const { result } = await prepared({ kind: 'last7' });

    mockGetReadingsForReport.mockResolvedValueOnce(snapshot([recent()]));
    await act(async () => {
      await result.current.retry();
    });

    expect(mockGetReadingsForReport).toHaveBeenCalledTimes(2);
    expect(mockGetReadingsForReport.mock.calls[1][1]).toEqual({
      startInclusive: expect.any(Date),
      endExclusive: expect.any(Date),
    });
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(result.current.review?.isCoverageConfirmed).toBe(true);
  });
});

describe('useReportPdf — mensagens sem gerar PDF', () => {
  it('período vazio: mensagem pedida e nenhum PDF renderizado', async () => {
    mockGetReadingsForReport.mockResolvedValue(snapshot([]));
    const { result } = await prepared({ kind: 'last7' });

    expect(result.current.error).toBe('Nenhuma medição no período selecionado.');
    expect(result.current.stage).toBe('idle');
    expect(mockRender).not.toHaveBeenCalled();
  });

  it('período vazio com leitura não confirmada não afirma que o período está vazio', async () => {
    mockGetReadingsForReport.mockResolvedValue(snapshot([], { fromCache: true }));
    const { result } = await prepared({ kind: 'last7' });

    expect(result.current.error).toMatch(/não foi possível confirmar o histórico completo/);
  });

  it('acima do limite de volume: pede período menor, sem renderizar nem truncar (PDF-22)', async () => {
    const start = Date.now() - (MAX_REPORT_READINGS + 10) * 60 * 60 * 1000;
    const many = Array.from({ length: MAX_REPORT_READINGS + 1 }, (_, index) => reading(new Date(start + index * 60 * 60 * 1000)));
    mockGetReadingsForReport.mockResolvedValue(snapshot(many));
    const { result } = await prepared({ kind: 'all' });

    expect(result.current.error).toBe(
      'O período tem 3.001 medições e o relatório comporta até 3.000. Escolha um período menor.',
    );
    expect(mockRender).not.toHaveBeenCalled();
  });

  it('personalizado invertido é bloqueado antes de qualquer consulta', async () => {
    const { result } = await prepared({ kind: 'custom', start: new Date(2026, 9, 10), end: new Date(2026, 9, 1) });

    expect(result.current.error).toBe('A data de fim deve ser igual ou posterior à de início.');
    expect(mockGetReadingsForReport).not.toHaveBeenCalled();
  });

  it('sem sessão, pede login e não inicia a geração', async () => {
    signedInAs(null);
    const { result } = await prepared({ kind: 'all' });

    expect(result.current.error).toBe('Sessão expirada. Faça login novamente.');
    expect(mockPlatform.loadPipeline).not.toHaveBeenCalled();
  });

  it('indisponível na plataforma (Android nesta etapa): nada é carregado', async () => {
    mockPlatform.isAvailable = false;
    const { result } = await prepared({ kind: 'all' });

    expect(result.current.isAvailable).toBe(false);
    expect(mockPlatform.loadPipeline).not.toHaveBeenCalled();
    expect(result.current.error).toBe('O relatório em PDF ainda não está disponível neste aparelho.');
  });

  it('exceção do renderizador com conteúdo clínico: mensagem amigável e log sem a mensagem original', async () => {
    mockRender.mockRejectedValue(new Error('SENTINELA 120/80 observação privada'));
    const { result } = await prepared({ kind: 'all' });

    expect(result.current.error).toBe('Não foi possível gerar o relatório. Tente novamente.');
    expect(logError).toHaveBeenCalledWith('report.generate', new Error('report-generate-failed'), { uid: 'user-a' });
    expect(JSON.stringify(jest.mocked(logError).mock.calls)).not.toMatch(/SENTINELA|120\/80|observação/);
    expect(mockPlatform.openPreview).not.toHaveBeenCalled();
  });

  it.each([
    ['network', 'Sem conexão com a internet. Verifique sua rede e tente novamente.'],
    ['permission', 'Sem permissão para ler seu histórico. Faça login novamente.'],
  ] as const)('falha de leitura (%s) vira mensagem própria do relatório', async (reason, message) => {
    mockGetReadingsForReport.mockRejectedValue(new ReadingsQueryError(reason));
    const { result } = await prepared({ kind: 'all' });

    expect(result.current.error).toBe(message);
  });
});

describe('useReportPdf — prazo, concorrência, cancelamento e troca de conta', () => {
  it('estourado o prazo das etapas assíncronas, informa e descarta o resultado tardio', async () => {
    const pending = deferred<ReportSourceSnapshot>();
    mockGetReadingsForReport.mockReturnValue(pending.promise);
    const { result } = await renderHook(() => useReportPdf());

    let preparation: Promise<boolean> = Promise.resolve(true);
    await act(async () => {
      preparation = result.current.prepareReport({ kind: 'all' });
    });
    expect(result.current.stage).toBe('preparing');

    await act(async () => {
      jest.advanceTimersByTime(REPORT_PREPARATION_TIMEOUT_MS);
      expect(await preparation).toBe(false);
    });

    expect(result.current.stage).toBe('idle');
    expect(result.current.error).toMatch(/demorou demais/);

    await act(async () => {
      pending.resolve(snapshot([recent()]));
    });

    expect(mockRender).not.toHaveBeenCalled();
    expect(result.current.stage).toBe('idle');
  });

  it('não dispara preparações concorrentes', async () => {
    const pending = deferred<ReportSourceSnapshot>();
    mockGetReadingsForReport.mockReturnValue(pending.promise);
    const { result } = await renderHook(() => useReportPdf());

    let first: Promise<boolean> = Promise.resolve(false);
    let second = true;

    await act(async () => {
      first = result.current.prepareReport({ kind: 'all' });
      second = await result.current.prepareReport({ kind: 'all' });
    });

    expect(second).toBe(false);
    expect(result.current.stage).toBe('preparing');

    await act(async () => {
      pending.resolve(snapshot([recent()]));
      await first;
    });

    expect(mockGetReadingsForReport).toHaveBeenCalledTimes(1);
    expect(mockPlatform.openPreview).toHaveBeenCalledTimes(1);
  });

  it('cancelar durante a preparação descarta o resultado', async () => {
    const pending = deferred<ReportSourceSnapshot>();
    mockGetReadingsForReport.mockReturnValue(pending.promise);
    const { result } = await renderHook(() => useReportPdf());

    let preparation: Promise<boolean> = Promise.resolve(true);
    await act(async () => {
      preparation = result.current.prepareReport({ kind: 'all' });
    });

    await act(async () => {
      result.current.cancel();
    });
    expect(result.current.stage).toBe('idle');

    await act(async () => {
      pending.resolve(snapshot([recent()]));
      expect(await preparation).toBe(false);
    });

    expect(mockRender).not.toHaveBeenCalled();
    expect(mockPlatform.openPreview).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it('descarta o resultado quando o uid muda durante a renderização', async () => {
    const pendingRender = deferred<Blob>();
    mockRender.mockReturnValue(pendingRender.promise);
    const { result, rerender } = await renderHook(() => useReportPdf());

    let preparation: Promise<boolean> = Promise.resolve(true);
    await act(async () => {
      preparation = result.current.prepareReport({ kind: 'all' });
    });

    signedInAs('user-b');
    await rerender({});

    await act(async () => {
      pendingRender.resolve(FAKE_PDF);
      expect(await preparation).toBe(false);
    });

    expect(mockPlatform.openPreview).not.toHaveBeenCalled();
    expect(result.current.stage).toBe('idle');
    expect(result.current.review).toBeNull();
  });

  it('trocar de conta com a revisão aberta libera a prévia e esconde o resumo da conta anterior', async () => {
    const { result, rerender } = await prepared();
    expect(result.current.stage).toBe('review');

    signedInAs('user-b');
    await rerender({});

    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(result.current.review).toBeNull();
    expect(result.current.stage).toBe('idle');

    let saved = true;
    await act(async () => {
      saved = result.current.saveReport();
    });
    expect(saved).toBe(false);
    expect(mockPlatform.deliver).not.toHaveBeenCalled();
  });
});

/**
 * PDF-18 — troca de conta em cada fase. A prévia usa o `openPdfPreview` REAL do adaptador Web, com
 * `URL.createObjectURL`/`revokeObjectURL` substituídos por dublês, para provar a revogação de fato
 * (não só a chamada a `release`).
 */
describe('useReportPdf — troca de conta em cada fase (PDF-18)', () => {
  const created: string[] = [];
  const revoked: string[] = [];
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    created.length = 0;
    revoked.length = 0;
    URL.createObjectURL = jest.fn(() => {
      const url = `blob:previa-${created.length + 1}`;
      created.push(url);
      return url;
    });
    URL.revokeObjectURL = jest.fn((url: string) => {
      revoked.push(url);
    });
    mockPlatform.openPreview.mockImplementation(openPdfPreview);
  });

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  async function switchTo(uid: string | null, rerender: (props: object) => Promise<void>): Promise<void> {
    signedInAs(uid);
    await rerender({});
  }

  function expectCleanFor(result: { current: ReturnType<typeof useReportPdf> }): void {
    expect(result.current.stage).toBe('idle');
    expect(result.current.review).toBeNull();
    expect(result.current.error).toBeNull();
  }

  it('durante o carregamento do módulo: a conta anterior não chega a ser consultada', async () => {
    const pendingPipeline = deferred<ReportPdfPipeline>();
    mockPlatform.loadPipeline.mockReturnValue(pendingPipeline.promise);
    const { result, rerender } = await renderHook(() => useReportPdf());

    let preparation: Promise<boolean> = Promise.resolve(true);
    await act(async () => {
      preparation = result.current.prepareReport({ kind: 'all' });
    });
    await switchTo('user-b', rerender);

    await act(async () => {
      pendingPipeline.resolve(pipeline);
      expect(await preparation).toBe(false);
    });

    expect(mockGetReadingsForReport).not.toHaveBeenCalled();
    expect(created).toEqual([]);
    expect(mockPlatform.deliver).not.toHaveBeenCalled();
    expectCleanFor(result);
  });

  it('durante a leitura do Firestore: o retrato da conta anterior não é renderizado', async () => {
    const pendingRead = deferred<ReportSourceSnapshot>();
    mockGetReadingsForReport.mockReturnValue(pendingRead.promise);
    const { result, rerender } = await renderHook(() => useReportPdf());

    let preparation: Promise<boolean> = Promise.resolve(true);
    await act(async () => {
      preparation = result.current.prepareReport({ kind: 'all' });
    });
    await switchTo('user-b', rerender);

    await act(async () => {
      pendingRead.resolve(snapshot([recent()]));
      expect(await preparation).toBe(false);
    });

    expect(mockGetReadingsForReport.mock.calls.map(([uid]) => uid)).toEqual(['user-a']);
    expect(mockRender).not.toHaveBeenCalled();
    expect(created).toEqual([]);
    expectCleanFor(result);
  });

  it('durante a geração do PDF: nenhuma prévia nem entrega tardia', async () => {
    const pendingRender = deferred<Blob>();
    mockRender.mockReturnValue(pendingRender.promise);
    const { result, rerender } = await renderHook(() => useReportPdf());

    let preparation: Promise<boolean> = Promise.resolve(true);
    await act(async () => {
      preparation = result.current.prepareReport({ kind: 'all' });
    });
    await switchTo(null, rerender);

    await act(async () => {
      pendingRender.resolve(FAKE_PDF);
      expect(await preparation).toBe(false);
    });

    expect(created).toEqual([]);
    expect(mockPlatform.deliver).not.toHaveBeenCalled();
    expectCleanFor(result);
  });

  it('durante a revisão: prévia revogada após o atraso, salvar recusado e a nova conta começa do zero', async () => {
    const { result, rerender } = await prepared();
    expect(created).toEqual(['blob:previa-1']);

    await switchTo('user-b', rerender);
    expectCleanFor(result);

    let saved = true;
    await act(async () => {
      saved = result.current.saveReport();
    });
    expect(saved).toBe(false);
    expect(mockPlatform.deliver).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(OBJECT_URL_REVOKE_DELAY_MS);
    });
    expect(revoked).toEqual(['blob:previa-1']);

    await act(async () => {
      await result.current.prepareReport({ kind: 'last7' });
    });
    expect(mockGetReadingsForReport.mock.calls.map(([uid]) => uid)).toEqual(['user-a', 'user-b']);
    expect(result.current.review?.previewUrl).toBe('blob:previa-2');
  });

  it('A → B → A: a revisão antiga da conta A NÃO reaparece ao voltar', async () => {
    const { result, rerender } = await prepared();
    expect(result.current.stage).toBe('review');

    await switchTo('user-b', rerender);
    await switchTo('user-a', rerender);

    expectCleanFor(result);
    let saved = true;
    await act(async () => {
      saved = result.current.saveReport();
    });
    expect(saved).toBe(false);
    expect(mockPlatform.deliver).not.toHaveBeenCalled();
  });

  it('sair da conta durante a revisão: prévia revogada e nova preparação pede login', async () => {
    const { result, rerender } = await prepared();

    await switchTo(null, rerender);
    await act(async () => {
      jest.advanceTimersByTime(OBJECT_URL_REVOKE_DELAY_MS);
    });
    expect(revoked).toEqual(['blob:previa-1']);
    expectCleanFor(result);

    await act(async () => {
      await result.current.prepareReport({ kind: 'all' });
    });
    expect(result.current.error).toBe('Sessão expirada. Faça login novamente.');
    expect(mockGetReadingsForReport).toHaveBeenCalledTimes(1);
  });
});

/**
 * PDF-14 e PDF-22 — toques repetidos, cancelar e gerar de novo, salvar duas vezes, ciclos sem
 * vazamento de URL, e as fronteiras do limite de volume e do prazo.
 */
describe('useReportPdf — repetição, ciclos, limite e prazo (PDF-14/22)', () => {
  const created: string[] = [];
  const revoked: string[] = [];
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    created.length = 0;
    revoked.length = 0;
    URL.createObjectURL = jest.fn(() => {
      const url = `blob:previa-${created.length + 1}`;
      created.push(url);
      return url;
    });
    URL.revokeObjectURL = jest.fn((url: string) => {
      revoked.push(url);
    });
    mockPlatform.openPreview.mockImplementation(openPdfPreview);
  });

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  function readings(count: number): ReportSourceReading[] {
    const start = Date.now() - (count + 10) * 60 * 60 * 1000;
    return Array.from({ length: count }, (_, index) => reading(new Date(start + index * 60 * 60 * 1000)));
  }

  it('cinco toques seguidos em "Preparar" fazem UMA leitura e UMA prévia', async () => {
    const { result } = await renderHook(() => useReportPdf());
    let outcomes: boolean[] = [];

    await act(async () => {
      outcomes = await Promise.all(Array.from({ length: 5 }, () => result.current.prepareReport({ kind: 'all' })));
    });

    expect(outcomes.filter(Boolean)).toHaveLength(1);
    expect(mockGetReadingsForReport).toHaveBeenCalledTimes(1);
    expect(created).toHaveLength(1);
  });

  it('cancelar e preparar de novo: só o resultado da segunda preparação vira prévia', async () => {
    const firstRead = deferred<ReportSourceSnapshot>();
    const secondRead = deferred<ReportSourceSnapshot>();
    mockGetReadingsForReport.mockReturnValueOnce(firstRead.promise).mockReturnValueOnce(secondRead.promise);
    const { result } = await renderHook(() => useReportPdf());

    let first: Promise<boolean> = Promise.resolve(true);
    let second: Promise<boolean> = Promise.resolve(false);
    await act(async () => {
      first = result.current.prepareReport({ kind: 'last7' });
    });
    await act(async () => {
      result.current.cancel();
    });
    await act(async () => {
      second = result.current.prepareReport({ kind: 'last30' });
    });

    // A primeira resposta chega DEPOIS do novo pedido: precisa ser ignorada.
    await act(async () => {
      firstRead.resolve(snapshot([recent()], { fromCache: true }));
      expect(await first).toBe(false);
    });
    expect(result.current.stage).toBe('preparing');

    await act(async () => {
      secondRead.resolve(snapshot([recent()]));
      expect(await second).toBe(true);
    });

    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(created).toEqual(['blob:previa-1']);
    expect(result.current.review?.requestedPeriod).toMatch(/^Últimos 30 dias/);
    expect(result.current.review?.isCoverageConfirmed).toBe(true);
  });

  it('salvar duas vezes entrega uma vez só', async () => {
    const { result } = await prepared();
    const outcomes: boolean[] = [];

    await act(async () => {
      outcomes.push(result.current.saveReport());
      outcomes.push(result.current.saveReport());
    });

    expect(outcomes).toEqual([true, false]);
    expect(mockPlatform.deliver).toHaveBeenCalledTimes(1);
  });

  it('ciclos de preparar/alterar/cancelar/salvar revogam toda URL criada e não guardam o PDF', async () => {
    const { result } = await renderHook(() => useReportPdf());
    const prepare = async () => {
      await act(async () => {
        await result.current.prepareReport({ kind: 'all' });
      });
    };

    await prepare();
    await act(async () => result.current.changePeriod());
    await prepare();
    await act(async () => result.current.cancel());
    await prepare();
    await act(async () => {
      result.current.retry();
    });
    await act(async () => {
      expect(result.current.saveReport()).toBe(true);
    });
    // Termina em "cancelar": a última prévia não tem nenhuma preparação seguinte que a libere.
    await prepare();
    await act(async () => result.current.cancel());

    // Depois de cancelar, não sobra PDF guardado para um "salvar" tardio.
    expect(result.current.saveReport()).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(OBJECT_URL_REVOKE_DELAY_MS);
    });

    expect(created).toHaveLength(5);
    expect([...revoked].sort()).toEqual([...created].sort());
    expect(mockPlatform.deliver).toHaveBeenCalledTimes(1);
  });

  it('exatamente 3.000 registros: gera; 3.001: recusa sem renderizar; período menor volta a funcionar', async () => {
    mockGetReadingsForReport.mockResolvedValueOnce(snapshot(readings(MAX_REPORT_READINGS)));
    const { result } = await prepared({ kind: 'all' });
    expect(result.current.stage).toBe('review');
    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(result.current.review?.coverageLines[0]).toBe('Registros incluídos: 3000');

    await act(async () => result.current.cancel());
    mockGetReadingsForReport.mockResolvedValueOnce(snapshot(readings(MAX_REPORT_READINGS + 1)));
    await act(async () => {
      await result.current.prepareReport({ kind: 'all' });
    });
    expect(result.current.stage).toBe('idle');
    expect(result.current.error).toMatch(/3\.001 medições.*até 3\.000/);
    expect(mockRender).toHaveBeenCalledTimes(1);

    mockGetReadingsForReport.mockResolvedValueOnce(snapshot(readings(10)));
    await act(async () => {
      await result.current.prepareReport({ kind: 'last30' });
    });
    expect(result.current.stage).toBe('review');
    expect(result.current.error).toBeNull();
  });

  it('prazo no carregamento do módulo: espera até 30 s, informa e permite nova tentativa', async () => {
    mockPlatform.loadPipeline.mockReturnValueOnce(new Promise<ReportPdfPipeline>(() => undefined));
    const { result } = await renderHook(() => useReportPdf());

    let preparation: Promise<boolean> = Promise.resolve(true);
    await act(async () => {
      preparation = result.current.prepareReport({ kind: 'all' });
    });

    await act(async () => {
      jest.advanceTimersByTime(REPORT_PREPARATION_TIMEOUT_MS - 1);
    });
    expect(result.current.stage).toBe('preparing');

    await act(async () => {
      jest.advanceTimersByTime(1);
      expect(await preparation).toBe(false);
    });
    expect(result.current.error).toMatch(/demorou demais/);
    expect(logError).toHaveBeenCalledWith('report.timeout', new Error('report-preparation-timeout'), { uid: 'user-a' });

    await act(async () => {
      expect(await result.current.prepareReport({ kind: 'all' })).toBe(true);
    });
    expect(result.current.stage).toBe('review');
  });
});
