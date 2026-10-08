import { parsePrivacyConsent } from './user-profile.schema';

const ACCEPTED_AT = new Date('2026-10-02T12:00:00.000Z');
const TIMESTAMP = { toDate: () => ACCEPTED_AT };

describe('parsePrivacyConsent', () => {
  it('lê o aceite e converte o Timestamp do Firestore em Date', () => {
    expect(
      parsePrivacyConsent({ timezone: 'America/Sao_Paulo', privacyConsent: { version: '2026-10-01', acceptedAt: TIMESTAMP } }),
    ).toEqual({ version: '2026-10-01', acceptedAt: ACCEPTED_AT });
  });

  it.each([
    ['documento ausente', undefined],
    ['perfil sem o campo', { timezone: 'America/Sao_Paulo' }],
    ['acceptedAt ainda nulo', { privacyConsent: { version: '2026-10-01', acceptedAt: null } }],
    ['version vazia', { privacyConsent: { version: '', acceptedAt: TIMESTAMP } }],
    ['version longa demais', { privacyConsent: { version: 'x'.repeat(33), acceptedAt: TIMESTAMP } }],
    ['campo em formato errado', { privacyConsent: 'sim' }],
  ])('devolve null (sem aceite válido) para %s', (_label, profile) => {
    expect(parsePrivacyConsent(profile)).toBeNull();
  });
});
