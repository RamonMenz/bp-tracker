import { getJwtExpiryMillis } from '@/lib/jwt-expiry';

function base64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeJwt(payload: unknown): string {
  return `${base64Url('{"alg":"RS256","typ":"JWT"}')}.${base64Url(JSON.stringify(payload))}.assinatura`;
}

describe('getJwtExpiryMillis', () => {
  it('converte o exp (segundos) em milissegundos', () => {
    expect(getJwtExpiryMillis(makeJwt({ exp: 1_760_000_000, sub: 'app' }))).toBe(1_760_000_000_000);
  });

  it('decodifica payload base64url com - e _ e sem padding', () => {
    // O "?>" e o "~" forçam bytes que viram '-'/'_' em base64url, e o tamanho deixa o segmento
    // sem múltiplo de 4 — os dois desvios do base64 comum que o decodificador precisa tratar.
    const jwt = makeJwt({ exp: 1_700_000_001, aud: ['projects/123'], x: '?>?>~~~á' });

    expect(jwt.split('.')[1]).toMatch(/[-_]/);
    expect(getJwtExpiryMillis(jwt)).toBe(1_700_000_001_000);
  });

  it.each([
    ['string vazia', ''],
    ['sem segmentos', 'nao-e-um-jwt'],
    ['dois segmentos', 'a.b'],
    ['payload vazio', 'a..c'],
    ['payload que não é base64', 'a.***.c'],
    ['payload que não é JSON', `a.${base64Url('isso não é json')}.c`],
    ['payload JSON que não é objeto', `a.${base64Url('42')}.c`],
  ])('devolve null para JWT malformado (%s)', (_label, jwt) => {
    expect(getJwtExpiryMillis(jwt)).toBeNull();
  });

  it.each([
    ['sem exp', { sub: 'app' }],
    ['exp como string', { exp: '1760000000' }],
    ['exp nulo', { exp: null }],
    ['exp zero', { exp: 0 }],
  ])('devolve null quando não há exp utilizável (%s)', (_label, payload) => {
    expect(getJwtExpiryMillis(makeJwt(payload))).toBeNull();
  });
});
