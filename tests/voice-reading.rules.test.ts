import { readFileSync } from 'node:fs';

import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  doc, serverTimestamp, setDoc, Timestamp,
} from 'firebase/firestore';

import { prepareAssistedReadingWriter } from '@/features/readings/assisted-reading-writer';
import { createAssistedConfirmation, type AssistedWriteContext } from '@/features/readings/confirmed-assisted-reading';
import { addReading } from '@/features/readings/readings.repo';
import { readingsCollectionPath } from '@/lib/firestore-paths';

let mockFirestore: ReturnType<typeof googleUser>;
jest.mock('@/services/firebase', () => ({
  get firestore() { return mockFirestore; },
}));
jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));

const ALICE = 'alice-voz';
const BOB = 'bob-voz';
const SYNTHETIC_DRAFT = {
  systolic: '135', diastolic: '85', pulse: '72', note: '', measuredAt: new Date('2026-01-15T10:00:00Z'),
};
let testEnv: RulesTestEnvironment;
let context: AssistedWriteContext;

function googleUser(uid: string) {
  return testEnv.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com', identities: {} } }).firestore();
}

function readings(db = mockFirestore, uid = ALICE) {
  return db.collection(readingsCollectionPath(uid));
}

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-aferi-voz-produto',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  });
});

afterAll(async () => { await testEnv?.cleanup(); });

beforeEach(async () => {
  await testEnv.clearFirestore();
  mockFirestore = googleUser(ALICE);
  context = { uid: ALICE, epoch: {}, hasConsent: true, persistenceEnabled: true };
});

describe('V2 · reconhecimento SIMULADO, repositório e regras reais no emulador', () => {
  it('só cria um documento após confirmação e persiste apenas os campos revisados', async () => {
    const flow = prepareAssistedReadingWriter(() => context);
    const attempt = flow.begin('voice', 'recognition')!;
    const draft = { ...SYNTHETIC_DRAFT, transcript: 'sintética', confidence: 0.99 };
    const ticket = flow.revise(attempt, draft)!;
    expect((await readings().get({ source: 'server' })).empty).toBe(true);

    const [saved, repeated] = await Promise.all([flow.confirmAndSave(ticket), flow.confirmAndSave(ticket)]);
    expect(saved).toEqual({ kind: 'acknowledged', readingId: expect.any(String) });
    expect(repeated).toEqual({ kind: 'blocked' });
    const result = await readings().get({ source: 'server' });
    expect(result.size).toBe(1);
    expect(result.docs[0].id).toBe(saved.kind === 'acknowledged' ? saved.readingId : null);
    expect(result.docs[0].data()).toEqual({
      systolic: 135, diastolic: 85, pulse: 72, note: null, sessionReadings: null, source: 'voice',
      measuredAt: Timestamp.fromDate(SYNTHETIC_DRAFT.measuredAt), createdAt: expect.any(Timestamp),
    });

    const bob = googleUser(BOB);
    await assertFails(readings(bob, ALICE).get({ source: 'server' }));
    expect((await readings(bob, BOB).get({ source: 'server' })).empty).toBe(true);
  });

  it('cancelamento, ausência de confirmação e revisão inválida deixam a fila offline vazia', async () => {
    const flow = prepareAssistedReadingWriter(() => context);
    await mockFirestore.disableNetwork();
    try {
      const cancelled = flow.revise(flow.begin('voice', 'recognition')!, SYNTHETIC_DRAFT)!;
      flow.cancel();
      expect(await flow.confirmAndSave(cancelled)).toEqual({ kind: 'blocked' });

      const invalid = flow.begin('voice', 'recognition')!;
      expect(flow.revise(invalid, { ...SYNTHETIC_DRAFT, systolic: '40' })).toBeNull();
      const abandoned = flow.begin('voice', 'recognition')!;
      expect(flow.revise(abandoned, SYNTHETIC_DRAFT)).not.toBeNull();
      expect((await readings().get({ source: 'cache' })).empty).toBe(true);
    } finally {
      await mockFirestore.enableNetwork();
    }
    await mockFirestore.waitForPendingWrites();
    expect((await readings().get({ source: 'server' })).empty).toBe(true);
  });

  it.each([BOB, ALICE])('descarta a confirmação pendente ao trocar o epoch (novo UID %s)', async uid => {
    let release!: (writer: typeof addReading) => void;
    const flow = createAssistedConfirmation({
      currentContext: () => context,
      loadWriter: () => new Promise(resolve => { release = resolve; }),
    });
    const ticket = flow.revise(flow.begin('voice', 'recognition')!, SYNTHETIC_DRAFT)!;
    const pending = flow.confirmAndSave(ticket);
    context = { ...context, uid, epoch: {} };
    if (uid !== ALICE) mockFirestore = googleUser(uid);
    release(addReading);
    expect(await pending).toEqual({ kind: 'stale' });
    expect((await readings(googleUser(ALICE), ALICE).get({ source: 'server' })).empty).toBe(true);
    expect((await readings(googleUser(BOB), BOB).get({ source: 'server' })).empty).toBe(true);
  });

  it.each(['outra conta', 'anônimo'])('rejeita a escrita no caminho de Alice por cliente %s', async client => {
    mockFirestore = client === 'anônimo' ? testEnv.unauthenticatedContext().firestore() : googleUser(BOB);
    const flow = prepareAssistedReadingWriter(() => context);
    const ticket = flow.revise(flow.begin('voice', 'recognition')!, SYNTHETIC_DRAFT)!;
    expect(await flow.confirmAndSave(ticket)).toEqual({ kind: 'rejected' });
    expect((await readings(googleUser(ALICE)).get({ source: 'server' })).empty).toBe(true);
  });

  it.each([{ transcript: 'sintética' }, { confidence: 0.99 }])('as regras rejeitam metadados do reconhecedor: %o', async metadata => {
    await assertFails(setDoc(doc(mockFirestore, readingsCollectionPath(ALICE), 'com-metadados'), {
      systolic: 135, diastolic: 85, pulse: 72, note: null, source: 'voice',
      measuredAt: Timestamp.fromDate(SYNTHETIC_DRAFT.measuredAt), createdAt: serverTimestamp(),
      ...metadata,
    }));
  });
});
