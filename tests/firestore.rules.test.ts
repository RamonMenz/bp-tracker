import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

const ALICE = 'alice-uid';
const BOB = 'bob-uid';

// Data fixa no passado: measuredAt no futuro é rejeitado pelas rules.
const MEASURED_AT = Timestamp.fromDate(new Date('2026-01-15T10:00:00.000Z'));

let testEnv: RulesTestEnvironment;

/** As rules exigem provedor google.com; o token padrão do emulador vem como 'custom'. */
function asGoogleUser(uid: string) {
  return testEnv.authenticatedContext(uid, {
    firebase: { sign_in_provider: 'google.com', identities: {} },
  });
}

function validReading(): Record<string, unknown> {
  return {
    systolic: 120,
    diastolic: 80,
    pulse: 70,
    measuredAt: MEASURED_AT,
    createdAt: serverTimestamp(),
    note: null,
    source: 'manual',
  };
}

function validProfile(): Record<string, unknown> {
  return {
    displayName: 'Alice',
    email: 'alice@example.com',
    photoURL: null,
    timezone: 'America/Sao_Paulo',
    reminderTimes: ['08:00', '14:00', '20:00'],
    notificationsEnabled: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'bp-tracker-rules-test',
    firestore: {
      rules: readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Semeia dados da Alice ignorando as rules, para que os testes de acesso do Bob
  // falhem por permissão e não por documento inexistente.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, `users/${ALICE}`), {
      ...validProfile(),
      createdAt: MEASURED_AT,
      updatedAt: MEASURED_AT,
    });
    await setDoc(doc(db, `users/${ALICE}/readings/reading-1`), {
      ...validReading(),
      createdAt: MEASURED_AT,
    });
    await setDoc(doc(db, `schedules/${ALICE}`), {
      nextRunAt: MEASURED_AT,
      timezone: 'America/Sao_Paulo',
      reminderTimes: ['08:00'],
      tokens: [],
      lastSentAt: null,
    });
  });
});

describe('caminho feliz — as rules não são apenas "negue tudo"', () => {
  it('permite que o dono leia o próprio perfil', async () => {
    const db = asGoogleUser(ALICE).firestore();
    await assertSucceeds(getDoc(doc(db, `users/${ALICE}`)));
  });

  it('permite que o dono crie uma medição válida', async () => {
    const db = asGoogleUser(ALICE).firestore();
    await assertSucceeds(setDoc(doc(db, `users/${ALICE}/readings/nova`), validReading()));
  });

  it('permite que o dono liste as próprias medições (usado pelo histórico e pelo export)', async () => {
    const db = asGoogleUser(ALICE).firestore();
    await assertSucceeds(getDocs(collection(db, `users/${ALICE}/readings`)));
  });

  it('aceita medição sem pulse e sem note — ambos são opcionais no modelo', async () => {
    const db = asGoogleUser(ALICE).firestore();
    await assertSucceeds(
      setDoc(doc(db, `users/${ALICE}/readings/sem-opcionais`), {
        systolic: 118,
        diastolic: 76,
        measuredAt: MEASURED_AT,
        createdAt: serverTimestamp(),
        source: 'manual',
      }),
    );
  });

  it('permite que o dono apague a própria medição', async () => {
    const db = asGoogleUser(ALICE).firestore();
    await assertSucceeds(deleteDoc(doc(db, `users/${ALICE}/readings/reading-1`)));
  });

  // updateDoc (não setDoc): é o método que readings.repo.ts realmente usa (updateReading), e é
  // um merge — só o campo passado muda, o resto do documento (createdAt incluso) vem do que já
  // estava salvo. A rule de update compara request.resource.data.createdAt (o resultado do merge)
  // com resource.data.createdAt (o valor já salvo); os dois batem porque nenhum dos dois mudou.
  it('permite que o dono corrija um campo válido da própria medição (note)', async () => {
    const db = asGoogleUser(ALICE).firestore();
    await assertSucceeds(updateDoc(doc(db, `users/${ALICE}/readings/reading-1`), { note: 'Corrigido.' }));
  });
});

describe('isolamento por uid', () => {
  it('nega que o usuário B leia uma medição de A', async () => {
    const db = asGoogleUser(BOB).firestore();
    await assertFails(getDoc(doc(db, `users/${ALICE}/readings/reading-1`)));
  });

  it('nega que o usuário B liste as medições de A', async () => {
    const db = asGoogleUser(BOB).firestore();
    await assertFails(getDocs(collection(db, `users/${ALICE}/readings`)));
  });

  it('nega que o usuário B escreva uma medição na conta de A', async () => {
    const db = asGoogleUser(BOB).firestore();
    await assertFails(setDoc(doc(db, `users/${ALICE}/readings/injetada`), validReading()));
  });

  it('nega que o usuário B apague uma medição de A', async () => {
    const db = asGoogleUser(BOB).firestore();
    await assertFails(deleteDoc(doc(db, `users/${ALICE}/readings/reading-1`)));
  });

  it('nega que o usuário B dê update numa medição de A', async () => {
    const db = asGoogleUser(BOB).firestore();
    await assertFails(updateDoc(doc(db, `users/${ALICE}/readings/reading-1`), { note: 'Invadido.' }));
  });

  it('nega que o usuário B leia o perfil de A', async () => {
    const db = asGoogleUser(BOB).firestore();
    await assertFails(getDoc(doc(db, `users/${ALICE}`)));
  });

  it('nega leitura para quem não está autenticado', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, `users/${ALICE}/readings/reading-1`)));
  });

  it('nega acesso a sessão que não veio do provedor Google', async () => {
    const db = testEnv
      .authenticatedContext(ALICE, { firebase: { sign_in_provider: 'password', identities: {} } })
      .firestore();
    await assertFails(getDoc(doc(db, `users/${ALICE}`)));
  });
});

describe('enumeração de contas', () => {
  it('nega o list na coleção users mesmo para usuário autenticado', async () => {
    const db = asGoogleUser(ALICE).firestore();
    await assertFails(getDocs(collection(db, 'users')));
  });
});

describe('validação de medições', () => {
  it('nega sistólica fora do range (999)', async () => {
    const db = asGoogleUser(ALICE).firestore();
    await assertFails(
      setDoc(doc(db, `users/${ALICE}/readings/fora-de-range`), { ...validReading(), systolic: 999 }),
    );
  });

  it('nega diastólica maior que a sistólica', async () => {
    const db = asGoogleUser(ALICE).firestore();
    await assertFails(
      setDoc(doc(db, `users/${ALICE}/readings/invertida`), {
        ...validReading(),
        systolic: 110,
        diastolic: 120,
      }),
    );
  });

  it('nega campo extra não declarado (isAdmin) injetado na medição', async () => {
    const db = asGoogleUser(ALICE).firestore();
    await assertFails(
      setDoc(doc(db, `users/${ALICE}/readings/campo-extra`), {
        ...validReading(),
        isAdmin: true,
      }),
    );
  });

  it('nega measuredAt no futuro', async () => {
    const db = asGoogleUser(ALICE).firestore();
    const future = Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000));
    await assertFails(
      setDoc(doc(db, `users/${ALICE}/readings/futuro`), { ...validReading(), measuredAt: future }),
    );
  });

  it('nega createdAt forjado pelo cliente — auditoria só com serverTimestamp', async () => {
    const db = asGoogleUser(ALICE).firestore();
    await assertFails(
      setDoc(doc(db, `users/${ALICE}/readings/createdat-forjado`), {
        ...validReading(),
        createdAt: Timestamp.fromDate(new Date('2020-01-01T00:00:00.000Z')),
      }),
    );
  });

  it('nega pulse fora do range', async () => {
    const db = asGoogleUser(ALICE).firestore();
    await assertFails(
      setDoc(doc(db, `users/${ALICE}/readings/pulso-invalido`), { ...validReading(), pulse: 300 }),
    );
  });
});

describe('validação de perfil', () => {
  it('nega campo extra não declarado (isAdmin) injetado no perfil', async () => {
    const db = asGoogleUser(BOB).firestore();
    await assertFails(
      setDoc(doc(db, `users/${BOB}`), { ...validProfile(), isAdmin: true }),
    );
  });

  it('nega mais de 8 horários de lembrete', async () => {
    const db = asGoogleUser(BOB).firestore();
    await assertFails(
      setDoc(doc(db, `users/${BOB}`), {
        ...validProfile(),
        reminderTimes: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
      }),
    );
  });
});

describe('schedules — exclusivo do Admin SDK', () => {
  it('nega escrita direta do cliente no próprio schedules/{uid}', async () => {
    const db = asGoogleUser(ALICE).firestore();
    await assertFails(
      setDoc(doc(db, `schedules/${ALICE}`), {
        nextRunAt: MEASURED_AT,
        timezone: 'America/Sao_Paulo',
        reminderTimes: ['08:00'],
        tokens: [],
        lastSentAt: null,
      }),
    );
  });

  it('nega leitura do cliente no próprio schedules/{uid}', async () => {
    const db = asGoogleUser(ALICE).firestore();
    await assertFails(getDoc(doc(db, `schedules/${ALICE}`)));
  });

  it('nega que o cliente apague o próprio schedules/{uid}', async () => {
    const db = asGoogleUser(ALICE).firestore();
    await assertFails(deleteDoc(doc(db, `schedules/${ALICE}`)));
  });
});
