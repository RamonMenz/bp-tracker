import { onSnapshot, setDoc } from 'firebase/firestore';

import { subscribePrivacyConsent, writePrivacyConsent, writeUserProfile } from './auth.repo';

jest.mock('@/services/firebase', () => ({ firestore: {} }));

jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => 'doc-ref'),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
  setDoc: jest.fn(),
}));

const mockSetDoc = setDoc as jest.Mock;
const mockOnSnapshot = onSnapshot as jest.Mock;

const PROFILE_INPUT = {
  displayName: 'Alice',
  email: 'alice@example.com',
  photoURL: null,
  timezone: 'America/Sao_Paulo',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSetDoc.mockResolvedValue(undefined);
});

describe('writeUserProfile — merge de cada login', () => {
  /**
   * O aceite só existe no servidor. Se o merge do login levasse `privacyConsent` (nem que fosse
   * para "limpar"), cada login apagaria ou reescreveria a prova do consentimento.
   */
  it.each([
    ['primeiro login', true],
    ['logins seguintes', false],
  ])('nunca toca em privacyConsent (%s) e grava com merge', async (_label, isFirstLogin) => {
    await writeUserProfile('alice', PROFILE_INPUT, isFirstLogin);

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, payload, options] = mockSetDoc.mock.calls[0] as [unknown, Record<string, unknown>, unknown];

    expect(payload).not.toHaveProperty('privacyConsent');
    expect(options).toEqual({ merge: true });
  });
});

describe('writePrivacyConsent', () => {
  it('grava a versão com o horário do servidor, em merge', async () => {
    await writePrivacyConsent('alice', '2026-10-01');

    expect(mockSetDoc).toHaveBeenCalledWith(
      'doc-ref',
      {
        privacyConsent: { version: '2026-10-01', acceptedAt: 'server-timestamp' },
        updatedAt: 'server-timestamp',
      },
      { merge: true },
    );
  });

  it.each([
    ['permission-denied', 'Sem permissão para registrar sua autorização. Faça login novamente.'],
    ['unavailable', 'Sem conexão com a internet. Verifique sua rede e tente novamente.'],
    ['internal', 'Não foi possível registrar sua autorização. Tente novamente.'],
  ])('troca o erro %s por mensagem amigável', async (code, message) => {
    mockSetDoc.mockRejectedValue({ code, message: 'FirebaseError cru' });

    await expect(writePrivacyConsent('alice', '2026-10-01')).rejects.toThrow(message);
  });
});

describe('subscribePrivacyConsent', () => {
  type FakeSnapshot = {
    metadata: { hasPendingWrites: boolean; fromCache: boolean };
    exists: () => boolean;
    data: () => unknown;
  };

  function emit(snapshot: FakeSnapshot): jest.Mock {
    const onNext = jest.fn();
    subscribePrivacyConsent('alice', onNext, jest.fn());
    const listener = mockOnSnapshot.mock.calls[0][2] as (snapshot: FakeSnapshot) => void;
    listener(snapshot);
    return onNext;
  }

  const ACCEPTED_AT = new Date('2026-10-02T12:00:00.000Z');
  const PROFILE_WITH_CONSENT = {
    timezone: 'America/Sao_Paulo',
    privacyConsent: { version: '2026-10-01', acceptedAt: { toDate: () => ACCEPTED_AT } },
  };

  it('entrega o aceite confirmado pelo servidor, já convertido para Date', () => {
    const onNext = emit({
      metadata: { hasPendingWrites: false, fromCache: false },
      exists: () => true,
      data: () => PROFILE_WITH_CONSENT,
    });

    expect(onNext).toHaveBeenCalledWith({ version: '2026-10-01', acceptedAt: ACCEPTED_AT });
  });

  it('entrega null quando o perfil não tem aceite', () => {
    const onNext = emit({
      metadata: { hasPendingWrites: false, fromCache: false },
      exists: () => true,
      data: () => ({ timezone: 'America/Sao_Paulo' }),
    });

    expect(onNext).toHaveBeenCalledWith(null);
  });

  it('ignora o aceite que ainda só existe no cache local (escrita pendente)', () => {
    const onNext = emit({
      metadata: { hasPendingWrites: true, fromCache: true },
      exists: () => true,
      data: () => PROFILE_WITH_CONSENT,
    });

    expect(onNext).not.toHaveBeenCalled();
  });

  it('não trata "offline e sem cache" como recusa', () => {
    const onNext = emit({
      metadata: { hasPendingWrites: false, fromCache: true },
      exists: () => false,
      data: () => undefined,
    });

    expect(onNext).not.toHaveBeenCalled();
  });
});
