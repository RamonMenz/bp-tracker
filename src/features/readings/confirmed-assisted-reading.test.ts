import { prepareAssistedReadingWriter } from './assisted-reading-writer';
import { createAssistedConfirmation, type AssistedWriteContext, type AssistedReviewValues } from './confirmed-assisted-reading';
import { addReading } from './readings.repo';

jest.mock('./readings.repo', () => ({ addReading: jest.fn() }));
const mockAdd = jest.mocked(addReading);
const DRAFT: AssistedReviewValues = {
  systolic: '120', diastolic: '80', pulse: '', note: '', measuredAt: new Date('2026-01-02T10:00:00Z'),
};
let context: AssistedWriteContext;
beforeEach(() => {
  jest.clearAllMocks();
  context = { uid: 'alice', epoch: {}, hasConsent: true, persistenceEnabled: true };
  mockAdd.mockResolvedValue('synthetic-id');
});

test.each(['photo', 'voice'] as const)('%s só chama repositório após confirmar revisão válida', async source => {
  const flow = prepareAssistedReadingWriter(() => context);
  const id = flow.begin(source, 'recognition')!;
  const ticket = flow.revise(id, DRAFT)!;
  expect(mockAdd).not.toHaveBeenCalled();
  expect(await flow.confirmAndSave(ticket)).toEqual({ kind: 'acknowledged', readingId: 'synthetic-id' });
  expect(mockAdd).toHaveBeenCalledTimes(1);
  expect(mockAdd).toHaveBeenCalledWith('alice', { systolic: 120, diastolic: 80,
    pulse: null, note: null, measuredAt: DRAFT.measuredAt, source, sessionReadings: null });
  expect(await flow.confirmAndSave(ticket)).toEqual({ kind: 'blocked' });
});
test('fixtures/simulação nunca chegam ao writer, mesmo com contexto habilitado', async () => {
  const flow = prepareAssistedReadingWriter(() => context);
  expect(flow.begin('photo', 'synthetic')).toBeNull();
  expect(flow.revise(1, DRAFT)).toBeNull();
  expect(await flow.confirmAndSave({ attemptId: 1, revision: 1 })).toEqual({ kind: 'blocked' });
  expect(mockAdd).not.toHaveBeenCalled();
});
test.each([
  { uid: null }, { hasConsent: false }, { persistenceEnabled: false },
])('bloqueia contexto inelegível %o', patch => {
  context = { ...context, ...patch };
  const flow = prepareAssistedReadingWriter(() => context);
  expect(flow.begin('voice', 'recognition')).toBeNull();
  expect(mockAdd).not.toHaveBeenCalled();
});
test('edição invalida ticket antigo, inclusive edição inválida', async () => {
  const flow = prepareAssistedReadingWriter(() => context);
  const id = flow.begin('photo', 'recognition')!;
  const first = flow.revise(id, DRAFT)!;
  expect(flow.revise(id, { ...DRAFT, systolic: '400' })).toBeNull();
  expect(await flow.confirmAndSave(first)).toEqual({ kind: 'blocked' });
  const final = flow.revise(id, { ...DRAFT, systolic: '135' })!;
  await flow.confirmAndSave(final);
  expect(mockAdd.mock.calls[0][1].systolic).toBe(135);
});
test('snapshot não muda com mutação externa e só contém whitelist clínica', async () => {
  const flow = prepareAssistedReadingWriter(() => context);
  const draft = { ...DRAFT, measuredAt: new Date(DRAFT.measuredAt), image: 'SENTINELA',
    transcript: 'SENTINELA', confidence: 0.99, sessionReadings: ['SENTINELA'], source: 'manual' };
  const ticket = flow.revise(flow.begin('voice', 'recognition')!, draft)!;
  draft.measuredAt.setFullYear(2040);
  draft.systolic = '200';
  await flow.confirmAndSave(ticket);
  expect(mockAdd.mock.calls[0][1]).toEqual({ systolic: 120, diastolic: 80, pulse: null,
    note: null, measuredAt: DRAFT.measuredAt, source: 'voice', sessionReadings: null });
});
test.each(['cancel', 'account', 'epoch', 'consent', 'disabled'] as const)('%s durante carga impede escrita', async change => {
  let release!: (writer: typeof addReading) => void;
  const flow = createAssistedConfirmation({ currentContext: () => context,
    loadWriter: () => new Promise(resolve => { release = resolve; }) });
  const ticket = flow.revise(flow.begin('photo', 'recognition')!, DRAFT)!;
  const pending = flow.confirmAndSave(ticket);
  if (change === 'cancel') flow.cancel();
  if (change === 'account') context = { ...context, uid: 'bob', epoch: {} };
  if (change === 'epoch') context = { ...context, epoch: {} }; // Mesmo UID, nova sessão.
  if (change === 'consent') context = { ...context, hasConsent: false };
  if (change === 'disabled') context = { ...context, persistenceEnabled: false };
  release(mockAdd);
  expect(await pending).toEqual({ kind: 'stale' });
  expect(mockAdd).not.toHaveBeenCalled();
});
test('aguarda uma única Promise; não repete escrita offline/sem ACK', async () => {
  let acknowledge!: (id: string) => void;
  mockAdd.mockImplementation(() => new Promise(resolve => { acknowledge = resolve; }));
  const flow = prepareAssistedReadingWriter(() => context);
  const ticket = flow.revise(flow.begin('photo', 'recognition')!, DRAFT)!;
  const pending = flow.confirmAndSave(ticket);
  // Espera somente a carga do módulo, não um timeout/retry de escrita.
  for (let tick = 0; tick < 10; tick++) await Promise.resolve();
  expect(mockAdd).toHaveBeenCalledTimes(1);
  expect(await flow.confirmAndSave(ticket)).toEqual({ kind: 'blocked' });
  expect(mockAdd).toHaveBeenCalledTimes(1);
  acknowledge('synthetic-id');
  expect(await pending).toEqual({ kind: 'acknowledged', readingId: 'synthetic-id' });
});
test('troca de conta após envio suprime ACK; não promete desfazer escrita enviada', async () => {
  let acknowledge!: (id: string) => void;
  mockAdd.mockImplementation(() => new Promise(resolve => { acknowledge = resolve; }));
  const flow = prepareAssistedReadingWriter(() => context);
  const ticket = flow.revise(flow.begin('voice', 'recognition')!, DRAFT)!;
  const pending = flow.confirmAndSave(ticket);
  for (let tick = 0; tick < 10; tick++) await Promise.resolve();
  expect(mockAdd).toHaveBeenCalledTimes(1);
  context = { ...context, uid: 'bob', epoch: {} };
  acknowledge('synthetic-id');
  expect(await pending).toEqual({ kind: 'stale' });
  expect(mockAdd.mock.calls[0][0]).toBe('alice');
  expect(mockAdd).toHaveBeenCalledTimes(1);
});
test('erro é seguro e retry precisa de nova revisão e confirmação', async () => {
  mockAdd.mockRejectedValueOnce(new Error('SENTINELA-CLINICA'));
  const flow = prepareAssistedReadingWriter(() => context);
  const id = flow.begin('voice', 'recognition')!;
  const ticket = flow.revise(id, DRAFT)!;
  expect(await flow.confirmAndSave(ticket)).toEqual({ kind: 'rejected' });
  expect(await flow.confirmAndSave(ticket)).toEqual({ kind: 'blocked' });
  mockAdd.mockResolvedValueOnce('retry-id');
  await flow.confirmAndSave(flow.revise(id, DRAFT)!);
  expect(mockAdd).toHaveBeenCalledTimes(2);
});
test('recaptura e ticket fabricado não confirmam a revisão atual', async () => {
  const flow = prepareAssistedReadingWriter(() => context);
  const old = flow.revise(flow.begin('photo', 'recognition')!, DRAFT)!;
  const id = flow.begin('voice', 'recognition')!;
  const current = flow.revise(id, DRAFT)!;
  expect(await flow.confirmAndSave(old)).toEqual({ kind: 'blocked' });
  expect(await flow.confirmAndSave({ ...current })).toEqual({ kind: 'blocked' });
  expect(mockAdd).not.toHaveBeenCalled();
});
test('duplo toque antes de carregar writer não inicia duas cargas', async () => {
  let release!: (writer: typeof addReading) => void;
  const loadWriter = jest.fn(() => new Promise<typeof addReading>(resolve => { release = resolve; }));
  const flow = createAssistedConfirmation({ currentContext: () => context, loadWriter });
  const ticket = flow.revise(flow.begin('photo', 'recognition')!, DRAFT)!;
  const pending = flow.confirmAndSave(ticket);
  expect(await flow.confirmAndSave(ticket)).toEqual({ kind: 'blocked' });
  expect(loadWriter).toHaveBeenCalledTimes(1);
  release(mockAdd);
  expect(await pending).toEqual({ kind: 'acknowledged', readingId: 'synthetic-id' });
});
