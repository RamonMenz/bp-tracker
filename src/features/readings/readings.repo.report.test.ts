import { getDocs, orderBy, where } from 'firebase/firestore';

import { logError } from '@/lib/logger';

import { getAllReadings, getReadingsForReport, ReadingsQueryError } from './readings.repo';

jest.mock('@/services/firebase', () => ({ firestore: {} }));
jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn((path: string, ...constraints: unknown[]) => ({ path, constraints })),
  orderBy: jest.fn((field: string, direction: string) => ({ orderBy: [field, direction] })),
  where: jest.fn((field: string, op: string, value: unknown) => ({ where: [field, op, value] })),
  serverTimestamp: () => 'SERVER-TIME',
  collection: (_db: unknown, path: string) => path,
  doc: (_db: unknown, path: string) => path,
}));

const mockGetDocs = jest.mocked(getDocs);

const GOOD = {
  systolic: 120,
  diastolic: 80,
  pulse: null,
  note: null,
  source: 'manual',
  sessionReadings: null,
  measuredAt: new Date('2026-11-20T12:00:00.000Z'),
  createdAt: new Date('2026-11-20T12:00:00.000Z'),
};

function docSnap(id: string, data: unknown, hasPendingWrites = false) {
  return { id, data: () => data, metadata: { hasPendingWrites, fromCache: false } };
}

function resolveDocs(docs: ReturnType<typeof docSnap>[], fromCache = false): void {
  mockGetDocs.mockResolvedValue({ docs, metadata: { fromCache, hasPendingWrites: false } } as unknown as Awaited<
    ReturnType<typeof getDocs>
  >);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getReadingsForReport', () => {
  const range = { startInclusive: new Date('2026-11-20T03:00:00.000Z'), endExclusive: new Date('2026-11-27T03:00:00.000Z') };

  it('consulta o caminho do dono por measuredAt, início inclusivo e fim exclusivo, em ordem crescente', async () => {
    resolveDocs([]);

    await getReadingsForReport('alice', range);

    expect(orderBy).toHaveBeenCalledWith('measuredAt', 'asc');
    expect(where).toHaveBeenCalledWith('measuredAt', '>=', range.startInclusive);
    expect(where).toHaveBeenCalledWith('measuredAt', '<', range.endExclusive);
    expect(where).not.toHaveBeenCalledWith('createdAt', expect.anything(), expect.anything());
    expect(mockGetDocs.mock.calls[0][0]).toMatchObject({ path: 'users/alice/readings' });
  });

  it('em "Tudo" não aplica limite inferior', async () => {
    resolveDocs([]);

    await getReadingsForReport('alice', { startInclusive: null, endExclusive: range.endExclusive });

    expect(where).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledWith('measuredAt', '<', range.endExclusive);
  });

  it('devolve id e pendência por registro, fromCache do conjunto e conta os inválidos omitidos', async () => {
    resolveDocs(
      [
        docSnap('good-1', GOOD),
        docSnap('bad-1', { ...GOOD, systolic: 'SENTINELA-SINTETICA' }),
        docSnap('good-2', { ...GOOD, systolic: 130 }, true),
        docSnap('bad-2', { ...GOOD, diastolic: 500 }),
      ],
      true,
    );

    const snapshot = await getReadingsForReport('alice', range);

    expect(snapshot.fromCache).toBe(true);
    expect(snapshot.omittedCount).toBe(2);
    expect(snapshot.readings.map((reading) => [reading.id, reading.systolic, reading.hasPendingWrites])).toEqual([
      ['good-1', 120, false],
      ['good-2', 130, true],
    ]);
    // O log do documento omitido só leva uid e id — nunca o conteúdo.
    expect(logError).toHaveBeenCalledWith('readings.parse', new Error('reading-parse-failed'), { uid: 'alice', docId: 'bad-1' });
    expect(JSON.stringify(jest.mocked(logError).mock.calls)).not.toMatch(/SENTINELA/);
  });

  it.each([
    ['permission-denied', 'permission'],
    ['unavailable', 'network'],
    ['internal', 'generic'],
  ] as const)('erro %s vira ReadingsQueryError(%s) sem repassar a mensagem do SDK', async (code, reason) => {
    mockGetDocs.mockRejectedValue(Object.assign(new Error('SENTINELA-SDK'), { code }));

    const failure = getReadingsForReport('alice', range);

    await expect(failure).rejects.toBeInstanceOf(ReadingsQueryError);
    await expect(failure).rejects.toMatchObject({ reason });
    expect(JSON.stringify(jest.mocked(logError).mock.calls)).not.toMatch(/SENTINELA/);
  });
});

describe('getAllReadings permanece com o contrato legado do CSV', () => {
  it('continua devolvendo só os registros válidos, sem id nem metadados', async () => {
    resolveDocs([docSnap('good-1', GOOD), docSnap('bad-1', { ...GOOD, systolic: 'x' })]);

    const readings = await getAllReadings('alice');

    expect(readings).toHaveLength(1);
    expect(readings[0]).not.toHaveProperty('id');
    expect(readings[0]).not.toHaveProperty('hasPendingWrites');
    expect(orderBy).toHaveBeenCalledWith('measuredAt', 'desc');
  });
});
