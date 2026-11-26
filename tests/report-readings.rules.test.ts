import { readFileSync } from 'node:fs';
import path from 'node:path';

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

import { getReadingsForReport, ReadingsQueryError } from '@/features/readings/readings.repo';
import { buildReportModel, type ReportModel } from '@/lib/report/report-model';
import { resolveReportPeriod, type ReportPeriod } from '@/lib/report/report-period';

/**
 * PDF-20 e isolamento do PDF-18, contra o EMULADOR do Firestore (`npm run test:rules`, projeto
 * fictício `demo-aferi-task11`): a função real `getReadingsForReport` lê com o contexto
 * autenticado da Alice, enquanto um segundo contexto da mesma conta ("outro aparelho") altera o
 * histórico. Dados sintéticos.
 *
 * Projeto PRÓPRIO no emulador (`demo-aferi-pdf20`): o Jest roda as suítes em paralelo e o
 * `clearFirestore` de uma apagaria os documentos da outra se compartilhassem o projeto.
 */

// O repositório importa o Firestore de `@/services/firebase`; aqui ele aponta para o contexto do
// emulador escolhido em cada teste. Getter: o valor é lido na hora da consulta.
jest.mock('@/services/firebase', () => ({
  get firestore() {
    return (globalThis as { mockReportFirestore?: unknown }).mockReportFirestore;
  },
}));
// O logger real depende de `__DEV__` (global do React Native); o que ele recebe é verificado em
// src/features/report/report-privacy.test.ts.
jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));

const ALICE = 'alice-uid';
const BOB = 'bob-uid';
const TZ = 'America/Sao_Paulo';
const READINGS_PATH = `users/${ALICE}/readings`;

let testEnv: RulesTestEnvironment;

function asGoogleUser(uid: string) {
  return testEnv.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com', identities: {} } });
}

function useFirestoreOf(context: ReturnType<RulesTestEnvironment['authenticatedContext']>): void {
  (globalThis as { mockReportFirestore?: unknown }).mockReportFirestore = context.firestore();
}

function readingDoc(iso: string, systolic: number, diastolic: number, extra: Record<string, unknown> = {}) {
  const instant = Timestamp.fromDate(new Date(iso));
  return { systolic, diastolic, pulse: null, measuredAt: instant, createdAt: instant, note: null, source: 'manual', ...extra };
}

/** Criação pelo cliente, sujeita às rules: `createdAt` precisa ser o horário do servidor. */
function clientReadingDoc(iso: string, systolic: number, diastolic: number) {
  return { ...readingDoc(iso, systolic, diastolic), createdAt: serverTimestamp() };
}

// Outubro/2026 em São Paulo (UTC-3): 01/10 00:00 = 03:00Z; 24/10 00:00 = 03:00Z do dia 24.
const PERIOD: ReportPeriod = (() => {
  const result = resolveReportPeriod(
    { kind: 'custom', startDay: { year: 2026, month: 10, day: 1 }, endDay: { year: 2026, month: 10, day: 23 } },
    new Date('2026-11-26T17:03:00.000Z'),
    TZ,
  );
  if (!result.ok) throw new Error(result.error);
  return result.period;
})();

const RANGE = { startInclusive: PERIOD.startInclusive, endExclusive: PERIOD.endExclusive };

function modelOf(snapshot: Awaited<ReturnType<typeof getReadingsForReport>>): ReportModel {
  const built = buildReportModel(snapshot, PERIOD);
  if (!built.ok) throw new Error(`modelo não gerado: ${built.reason}`);
  return built.model;
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-aferi-pdf20',
    firestore: {
      rules: readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, `${READINGS_PATH}/r1`), readingDoc('2026-10-05T12:00:00.000Z', 120, 80));
    await setDoc(doc(db, `${READINGS_PATH}/r2`), readingDoc('2026-10-06T12:00:00.000Z', 130, 90));
    await setDoc(doc(db, `${READINGS_PATH}/r3`), readingDoc('2026-10-07T12:00:00.000Z', 140, 100));
    // Bordas reais em Timestamp: 30/09 23:59:59.999 (fora), 01/10 00:00 (dentro),
    // 23/10 23:59:59.999 (dentro) e 24/10 00:00 (fora), no fuso de São Paulo.
    await setDoc(doc(db, `${READINGS_PATH}/borda-antes`), readingDoc('2026-10-01T02:59:59.999Z', 101, 61));
    await setDoc(doc(db, `${READINGS_PATH}/borda-inicio`), readingDoc('2026-10-01T03:00:00.000Z', 102, 62));
    await setDoc(doc(db, `${READINGS_PATH}/borda-fim`), readingDoc('2026-10-24T02:59:59.999Z', 103, 63));
    await setDoc(doc(db, `${READINGS_PATH}/borda-depois`), readingDoc('2026-10-24T03:00:00.000Z', 104, 64));
  });
  useFirestoreOf(asGoogleUser(ALICE));
});

describe('getReadingsForReport no emulador — período e omissões', () => {
  it('respeita as bordas reais do período (início inclusivo, fim exclusivo) e ordena por measuredAt', async () => {
    const snapshot = await getReadingsForReport(ALICE, RANGE);

    expect(snapshot.readings.map((reading) => reading.id)).toEqual(['borda-inicio', 'r1', 'r2', 'r3', 'borda-fim']);
    expect(snapshot.fromCache).toBe(false);
    expect(snapshot.omittedCount).toBe(0);
    expect(snapshot.readings.every((reading) => reading.hasPendingWrites === false)).toBe(true);
  });

  it('documento inválido no período é omitido e contado, sem derrubar a leitura', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `${READINGS_PATH}/invalido`), readingDoc('2026-10-10T12:00:00.000Z', 90, 120));
    });

    const snapshot = await getReadingsForReport(ALICE, RANGE);

    expect(snapshot.omittedCount).toBe(1);
    expect(snapshot.readings.map((reading) => reading.id)).not.toContain('invalido');
    expect(modelOf(snapshot).coverage.isConfirmed).toBe(false);
  });
});

describe('getReadingsForReport no emulador — retrato congelado (PDF-20)', () => {
  it('alterações feitas por outro aparelho DEPOIS da leitura não mudam o retrato; nova geração as incorpora', async () => {
    const firstSnapshot = await getReadingsForReport(ALICE, RANGE);
    const firstModel = modelOf(firstSnapshot);
    const frozen = JSON.stringify(firstModel);

    // "Outro aparelho" da mesma conta: contexto separado, sujeito às rules.
    const otherDevice = asGoogleUser(ALICE).firestore();
    await updateDoc(doc(otherDevice, `${READINGS_PATH}/r2`), { systolic: 170, diastolic: 110 });
    await deleteDoc(doc(otherDevice, `${READINGS_PATH}/r1`));
    await setDoc(doc(otherDevice, `${READINGS_PATH}/r4`), clientReadingDoc('2026-10-08T12:00:00.000Z', 150, 95));

    // O retrato já entregue é valor, não consulta viva: nada muda nele nem no modelo dele.
    expect(JSON.stringify(firstModel)).toBe(frozen);
    expect(JSON.stringify(modelOf(firstSnapshot))).toBe(frozen);
    expect(firstModel.coverage.lines[0]).toBe('Registros incluídos: 5');

    const secondModel = modelOf(await getReadingsForReport(ALICE, RANGE));
    expect(secondModel.coverage.lines[0]).toBe('Registros incluídos: 5');
    expect(secondModel.table.rows.map((row) => row[2])).toEqual(['102', '170', '140', '150', '103']);
    expect(firstModel.table.rows.map((row) => row[2])).toEqual(['102', '120', '130', '140', '103']);
  });

  it('escritas CONCORRENTES com a leitura: o retrato é um estado coerente e o modelo é calculado só sobre ele', async () => {
    const otherDevice = asGoogleUser(ALICE).firestore();

    const [snapshot] = await Promise.all([
      getReadingsForReport(ALICE, RANGE),
      updateDoc(doc(otherDevice, `${READINGS_PATH}/r2`), { systolic: 171, diastolic: 111 }),
      setDoc(doc(otherDevice, `${READINGS_PATH}/r5`), clientReadingDoc('2026-10-09T12:00:00.000Z', 155, 97)),
    ]);

    // Cada documento aparece inteiro, na versão antiga OU na nova — nunca um meio-termo.
    const r2 = snapshot.readings.find((reading) => reading.id === 'r2');
    expect([
      [130, 90],
      [171, 111],
    ]).toContainEqual([r2?.systolic, r2?.diastolic]);
    expect([5, 6]).toContain(snapshot.readings.length);

    // Médias e contagens vêm exclusivamente do retrato entregue (mesmo valor recalculado).
    const model = modelOf(snapshot);
    const expectedSystolic = snapshot.readings.reduce((sum, reading) => sum + reading.systolic, 0) / snapshot.readings.length;
    expect(model.stats.systolic.mean).toBeCloseTo(expectedSystolic, 10);
    expect(model.stats.systolic.n).toBe(snapshot.readings.length);
    expect(model.table.rows).toHaveLength(snapshot.readings.length);

    // A geração seguinte vê as duas escritas.
    const next = await getReadingsForReport(ALICE, RANGE);
    expect(next.readings.map((reading) => reading.id)).toContain('r5');
    expect(next.readings.find((reading) => reading.id === 'r2')?.systolic).toBe(171);
  });
});

describe('getReadingsForReport no emulador — isolamento entre contas', () => {
  it('outra conta autenticada não lê o histórico da Alice', async () => {
    useFirestoreOf(asGoogleUser(BOB));

    await expect(getReadingsForReport(ALICE, RANGE)).rejects.toMatchObject({ reason: 'permission' });
    await expect(getReadingsForReport(ALICE, RANGE)).rejects.toBeInstanceOf(ReadingsQueryError);
  });

  it('sem autenticação também é recusado', async () => {
    (globalThis as { mockReportFirestore?: unknown }).mockReportFirestore = testEnv.unauthenticatedContext().firestore();

    await expect(getReadingsForReport(ALICE, RANGE)).rejects.toMatchObject({ reason: 'permission' });
  });

  it('a própria conta do Bob lê só o que é dele (vazio aqui)', async () => {
    useFirestoreOf(asGoogleUser(BOB));

    const snapshot = await getReadingsForReport(BOB, RANGE);
    expect(snapshot.readings).toEqual([]);
    expect(snapshot.omittedCount).toBe(0);
  });
});
