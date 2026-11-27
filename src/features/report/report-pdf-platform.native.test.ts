import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { logError } from '@/lib/logger';
import { buildReportModel, type ReportModel, type ReportSourceReading } from '@/lib/report/report-model';
import { resolveReportPeriod } from '@/lib/report/report-period';

import {
  MAX_SWEEP_ENTRIES,
  reportFilesInUseForTests,
  RESIDUE_MIN_AGE_MS,
  SHARE_GRACE_MS,
  sweepReportResidues,
} from './report-pdf-files';
import { reportPdfPipeline as webPipeline } from './report-pdf-pipeline';
import { reportPdfPlatform } from './report-pdf-platform.native';
import type { PrintedReportPdf, ReportPeriodRequest } from './report-pdf-platform.types';
import { reportPrintPipeline } from './report-print-pipeline';

/**
 * Adaptador Android com `expo-print`, `expo-sharing` e `expo-file-system` SIMULADOS: o sistema de
 * arquivos é um mapa em memória. Prova o ciclo do temporário (PDF-15/16/17); o comportamento real
 * do WebView, do FileProvider e dos apps de destino só se vê no aparelho (docs/pdf-android.md).
 */

const CACHE = 'file:///data/user/0/app.aferi/cache/';
const DOCUMENTS = 'file:///data/user/0/app.aferi/files/';
const SENSITIVE_SDK_MESSAGE = `falha em ${CACHE}Print/abc.pdf: Observação secreta 263/197`;

interface FakeEntry {
  isDirectory: boolean;
  modificationTime: number;
}

const fs = new Map<string, FakeEntry>();
let printCount = 0;

jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///data/user/0/app.aferi/cache/',
  documentDirectory: 'file:///data/user/0/app.aferi/files/',
  makeDirectoryAsync: jest.fn(),
  moveAsync: jest.fn(),
  deleteAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  getInfoAsync: jest.fn(),
}));

const mockPrint = jest.mocked(Print.printToFileAsync);
const mockShare = jest.mocked(Sharing.shareAsync);
const mockFs = jest.mocked(FileSystem);

function nowSeconds(): number {
  return Date.now() / 1000;
}

function installFakeFileSystem(): void {
  fs.clear();
  mockFs.makeDirectoryAsync.mockImplementation(async (uri) => {
    fs.set(uri.endsWith('/') ? uri : `${uri}/`, { isDirectory: true, modificationTime: nowSeconds() });
  });
  mockFs.moveAsync.mockImplementation(async ({ from, to }) => {
    const entry = fs.get(from);
    if (!entry) throw new Error(`ENOENT ${from}`);
    fs.delete(from);
    fs.set(to, { ...entry, modificationTime: nowSeconds() });
  });
  mockFs.deleteAsync.mockImplementation(async (uri) => {
    for (const path of [...fs.keys()]) {
      if (path === uri || path.startsWith(uri.endsWith('/') ? uri : `${uri}/`)) fs.delete(path);
    }
  });
  mockFs.readDirectoryAsync.mockImplementation(async (uri) => {
    const names = new Set<string>();
    for (const path of fs.keys()) {
      if (path.startsWith(uri) && path !== uri) names.add(path.slice(uri.length).split('/')[0]);
    }
    return [...names];
  });
  mockFs.getInfoAsync.mockImplementation(async (uri) => {
    const entry = fs.get(uri) ?? fs.get(uri.endsWith('/') ? uri : `${uri}/`);
    const hasChildren = [...fs.keys()].some((path) => path.startsWith(uri.endsWith('/') ? uri : `${uri}/`));
    if (!entry && !hasChildren) return { exists: false, uri, isDirectory: false };
    return {
      exists: true,
      uri,
      isDirectory: entry?.isDirectory ?? true,
      modificationTime: entry?.modificationTime ?? nowSeconds(),
      size: 1,
    };
  });
  mockPrint.mockImplementation(async () => {
    printCount += 1;
    const uri = `${CACHE}Print/0000000${printCount}-aaaa-bbbb-cccc-dddddddddddd.pdf`;
    fs.set(uri, { isDirectory: false, modificationTime: nowSeconds() });
    return { uri, numberOfPages: 1 };
  });
}

function filesUnder(prefix: string): string[] {
  return [...fs.keys()].filter((path) => path.startsWith(prefix) && !path.endsWith('/'));
}

const TZ = 'America/Sao_Paulo';

function reading(measuredAt: Date, overrides: Partial<ReportSourceReading> = {}): ReportSourceReading {
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
    ...overrides,
  };
}

function model(note: string | null = null): ReportModel {
  const period = resolveReportPeriod({ kind: 'all' }, new Date('2026-11-26T17:03:00.000Z'), TZ);
  if (!period.ok) throw new Error(period.error);
  const built = buildReportModel(
    {
      readings: [
        reading(new Date('2026-11-20T11:00:00.000Z'), { note }),
        reading(new Date('2026-11-22T12:00:00.000Z'), { systolic: 140 }),
      ],
      fromCache: false,
      omittedCount: 0,
    },
    period.period,
  );
  if (!built.ok) throw new Error('esperava modelo');
  return built.model;
}

/**
 * Usa o pipeline direto: `loadPipeline` é `import('./report-print-pipeline')`, que o Jest não
 * executa sem --experimental-vm-modules (mesmo limite dos testes Web). O `import()` em si é
 * conferido pela guarda estática em report-lazy-loading.test.ts.
 */
async function render(reportModel: ReportModel = model()): Promise<PrintedReportPdf> {
  const artifact = await reportPrintPipeline.render(reportModel);
  if (!('kind' in artifact)) throw new Error('esperava arquivo');
  return artifact;
}

function expectNoDocumentDirectory(): void {
  const touched = [
    ...mockFs.makeDirectoryAsync.mock.calls.map(([uri]) => uri),
    ...mockFs.moveAsync.mock.calls.flatMap(([options]) => [options.from, options.to]),
    ...mockFs.deleteAsync.mock.calls.map(([uri]) => uri),
  ];
  expect(touched.some((uri) => uri.startsWith(DOCUMENTS))).toBe(false);
  expect(filesUnder(DOCUMENTS)).toEqual([]);
}

function expectLogsWithoutContent(): void {
  for (const call of jest.mocked(logError).mock.calls) {
    const serialized = JSON.stringify(call) + String((call[1] as Error).message);
    expect(serialized).not.toMatch(/file:|aferi-relatorio-|Observação|263|197/);
  }
}

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }).setSystemTime(new Date('2026-11-26T18:00:00.000Z'));
  installFakeFileSystem();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('adaptador Android — geração (expo-print simulado)', () => {
  it('está disponível, entrega por compartilhamento e não tem prévia embutida', () => {
    expect(reportPdfPlatform.isAvailable).toBe(true);
    expect(reportPdfPlatform.deliveryMode).toBe('share');
  });

  it('o pipeline do expo-print gera A4 a partir do template, com textZoom fixo', async () => {
    await render(model('<script>alert(1)</script>'));

    expect(mockPrint).toHaveBeenCalledTimes(1);
    const [options] = mockPrint.mock.calls[0];
    expect(options).toMatchObject({ width: 595, height: 842, textZoom: 100, base64: false });
    expect(options?.html).toContain('Aferi — Relatório de pressão arterial');
    expect(options?.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(options?.html).not.toMatch(/<script/);
  });

  it('o PDF vai para uma pasta de geração no cache, com nome sem identificador pessoal; nada em documentDirectory', async () => {
    const artifact = await render();

    expect(artifact.uri).toMatch(
      /^file:\/\/\/data\/user\/0\/app\.aferi\/cache\/aferi-relatorios\/\d{13}-[a-z0-9]{6,}\/aferi-relatorio-2026-11-20_a_2026-11-22\.pdf$/,
    );
    expect(filesUnder(`${CACHE}aferi-relatorios/`)).toEqual([artifact.uri]);
    // O original de nome aleatório do expo-print não fica para trás.
    expect(filesUnder(`${CACHE}Print/`)).toEqual([]);
    expectNoDocumentDirectory();
  });

  it('falha do expo-print: erro com código fixo, sem a mensagem do SDK, e nenhum arquivo', async () => {
    mockPrint.mockRejectedValueOnce(new Error(SENSITIVE_SDK_MESSAGE));

    await expect(render()).rejects.toThrow(/^report-print-failed$/);
    expect(filesUnder(CACHE)).toEqual([]);
    expectLogsWithoutContent();
  });

  it('falha ao mover: apaga o original e a pasta, sem deixar cópia clínica órfã', async () => {
    mockFs.moveAsync.mockRejectedValueOnce(new Error(SENSITIVE_SDK_MESSAGE));

    await expect(render()).rejects.toThrow(/^report-file-move-failed$/);
    expect(filesUnder(CACHE)).toEqual([]);
    expectLogsWithoutContent();
  });

  it('o pedido de período resolve igual ao pipeline Web (mesmo modelo nas duas plataformas)', () => {
    const preparedAt = new Date('2026-11-26T17:03:00.000Z');
    const requests: ReportPeriodRequest[] = [
      { kind: 'last7' },
      { kind: 'last30' },
      { kind: 'all' },
      { kind: 'custom', start: new Date('2026-10-01T03:00:00.000Z'), end: new Date('2026-10-23T03:00:00.000Z') },
      { kind: 'custom', start: new Date('2026-10-23T03:00:00.000Z'), end: new Date('2026-10-01T03:00:00.000Z') },
    ];

    for (const request of requests) {
      expect(reportPrintPipeline.resolvePeriod(request, preparedAt, TZ)).toEqual(webPipeline.resolvePeriod(request, preparedAt, TZ));
    }
    expect(reportPrintPipeline.buildModel).toBe(webPipeline.buildModel);
  });
});

describe('adaptador Android — compartilhamento e limpeza (PDF-15/16/17)', () => {
  it('compartilha o arquivo do cache como application/pdf e só apaga depois da folha fechar e da carência', async () => {
    const artifact = await render();
    const handle = reportPdfPlatform.openPreview(artifact);
    let closeSheet: () => void = () => undefined;
    mockShare.mockImplementation(() => new Promise<void>((resolve) => (closeSheet = resolve)));

    const delivery = reportPdfPlatform.deliver('aferi-relatorio-2026-11-20_a_2026-11-22.pdf', artifact);

    expect(handle.url).toBe('');
    expect(mockShare).toHaveBeenCalledWith(artifact.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Salvar ou compartilhar o relatório em PDF',
    });

    // Folha aberta: o destino lê o arquivo — nada é apagado, mesmo muito tempo depois.
    jest.advanceTimersByTime(SHARE_GRACE_MS * 3);
    await flush();
    expect(filesUnder(CACHE)).toEqual([artifact.uri]);

    closeSheet();
    await delivery;
    handle.release();
    handle.release();
    await flush();

    jest.advanceTimersByTime(SHARE_GRACE_MS - 1);
    await flush();
    expect(filesUnder(CACHE)).toEqual([artifact.uri]);

    jest.advanceTimersByTime(1);
    await flush();
    expect(filesUnder(CACHE)).toEqual([]);
    expect(reportFilesInUseForTests()).not.toContain(artifact.uri);
    expectNoDocumentDirectory();
  });

  it('cancelar a folha também resolve (não é prova de envio nem de falha) e segue a mesma carência', async () => {
    const artifact = await render();
    const handle = reportPdfPlatform.openPreview(artifact);
    mockShare.mockResolvedValueOnce(undefined);

    await reportPdfPlatform.deliver('aferi-relatorio-2026-11-20_a_2026-11-22.pdf', artifact);
    handle.release();
    await flush();
    expect(filesUnder(CACHE)).toEqual([artifact.uri]);

    jest.advanceTimersByTime(SHARE_GRACE_MS);
    await flush();
    expect(filesUnder(CACHE)).toEqual([]);
  });

  it('falha do compartilhamento: código fixo, sem caminho, e o arquivo nunca entregue sai na hora', async () => {
    const artifact = await render();
    const handle = reportPdfPlatform.openPreview(artifact);
    mockShare.mockRejectedValueOnce(new Error(SENSITIVE_SDK_MESSAGE));

    await expect(reportPdfPlatform.deliver('aferi-relatorio-2026-11-20_a_2026-11-22.pdf', artifact)).rejects.toThrow(
      /^report-share-failed$/,
    );
    handle.release();
    await flush();

    expect(filesUnder(CACHE)).toEqual([]);
    expectLogsWithoutContent();
  });

  it('sem compartilhar (cancelar, alterar período, trocar de conta): apagado na hora', async () => {
    const artifact = await render();
    reportPdfPlatform.openPreview(artifact).release();
    await flush();

    expect(filesUnder(CACHE)).toEqual([]);
    expect(mockShare).not.toHaveBeenCalled();
  });

  it('resultado descartado (prazo, cancelamento durante a geração) é apagado na hora', async () => {
    const artifact = await render();
    reportPdfPlatform.discard?.(artifact);
    await flush();

    expect(filesUnder(CACHE)).toEqual([]);
  });

  it('nome divergente do arquivo gerado é recusado antes de abrir o compartilhamento', async () => {
    const artifact = await render();

    expect(() => reportPdfPlatform.deliver('outro-nome.pdf', artifact)).toThrow('report-pdf-name-mismatch');
    expect(mockShare).not.toHaveBeenCalled();
  });

  it('Blob da Web no adaptador Android é recusado', () => {
    expect(() => reportPdfPlatform.deliver('a.pdf', { size: 1, type: 'application/pdf' } as Blob)).toThrow(
      'report-pdf-artifact-mismatch',
    );
  });
});

describe('adaptador Android — varredura de resíduos na geração seguinte (PDF-17)', () => {
  function residue(path: string, ageMs: number): void {
    fs.set(path, { isDirectory: path.endsWith('/'), modificationTime: (Date.now() - ageMs) / 1000 });
  }

  it('apaga gerações e saídas do expo-print antigas; mantém recentes, em uso e nomes desconhecidos', async () => {
    const inUse = await render();
    const old = RESIDUE_MIN_AGE_MS + 1;
    residue(`${CACHE}aferi-relatorios/1700000000000-abc123/`, old);
    residue(`${CACHE}aferi-relatorios/1700000000000-abc123/aferi-relatorio-2026-01-01_a_2026-01-31.pdf`, old);
    residue(`${CACHE}aferi-relatorios/1764100000000-recent/`, RESIDUE_MIN_AGE_MS - 60_000);
    residue(`${CACHE}aferi-relatorios/1764100000000-recent/aferi-relatorio-2026-11-01_a_2026-11-02.pdf`, 1);
    residue(`${CACHE}aferi-relatorios/nao-e-geracao.txt`, old);
    residue(`${CACHE}Print/12345678-aaaa-bbbb-cccc-1234567890ab.pdf`, old);
    residue(`${CACHE}Print/outro-arquivo.pdf`, old);
    residue(`${CACHE}pressao-2026-11-01.csv`, old);
    // O arquivo em uso também é "antigo": a varredura não pode alcançá-lo.
    fs.set(inUse.uri, { isDirectory: false, modificationTime: (Date.now() - old) / 1000 });
    const generationOfInUse = inUse.uri.slice(0, inUse.uri.lastIndexOf('/') + 1);
    fs.set(generationOfInUse, { isDirectory: true, modificationTime: (Date.now() - old) / 1000 });

    const removed = await sweepReportResidues();

    expect(removed).toBe(2);
    expect(fs.has(`${CACHE}aferi-relatorios/1700000000000-abc123/aferi-relatorio-2026-01-01_a_2026-01-31.pdf`)).toBe(false);
    expect(fs.has(`${CACHE}Print/12345678-aaaa-bbbb-cccc-1234567890ab.pdf`)).toBe(false);
    expect(fs.has(`${CACHE}aferi-relatorios/1764100000000-recent/aferi-relatorio-2026-11-01_a_2026-11-02.pdf`)).toBe(true);
    expect(fs.has(`${CACHE}aferi-relatorios/nao-e-geracao.txt`)).toBe(true);
    expect(fs.has(`${CACHE}Print/outro-arquivo.pdf`)).toBe(true);
    expect(fs.has(`${CACHE}pressao-2026-11-01.csv`)).toBe(true);
    expect(fs.has(inUse.uri)).toBe(true);
  });

  it('a geração seguinte faz a varredura antes de imprimir', async () => {
    residue(`${CACHE}aferi-relatorios/1700000000000-abc123/`, RESIDUE_MIN_AGE_MS + 1);
    residue(`${CACHE}aferi-relatorios/1700000000000-abc123/aferi-relatorio-2026-01-01_a_2026-01-31.pdf`, RESIDUE_MIN_AGE_MS + 1);

    await render();

    expect(fs.has(`${CACHE}aferi-relatorios/1700000000000-abc123/aferi-relatorio-2026-01-01_a_2026-01-31.pdf`)).toBe(false);
  });

  it('é limitada: examina no máximo MAX_SWEEP_ENTRIES entradas por geração', async () => {
    for (let index = 0; index < MAX_SWEEP_ENTRIES + 10; index += 1) {
      residue(`${CACHE}aferi-relatorios/17000000${String(index).padStart(5, '0')}-abc123/`, RESIDUE_MIN_AGE_MS + 1);
    }

    expect(await sweepReportResidues()).toBe(MAX_SWEEP_ENTRIES);
    expect(await sweepReportResidues()).toBe(10);
  });

  it('falha ao listar não interrompe a geração e não loga caminho', async () => {
    mockFs.readDirectoryAsync.mockRejectedValue(new Error(SENSITIVE_SDK_MESSAGE));
    residue(`${CACHE}aferi-relatorios/1700000000000-abc123/`, RESIDUE_MIN_AGE_MS + 1);

    await expect(render()).resolves.toMatchObject({ kind: 'printed-file' });
    expect(logError).toHaveBeenCalledWith('report.cleanup', new Error('report-sweep-list-failed'));
    expectLogsWithoutContent();
  });
});
