/**
 * Lê o claim `exp` de um JWT e devolve a expiração em milissegundos, ou `null` quando o token está
 * malformado ou não tem um `exp` numérico.
 *
 * NÃO verifica assinatura, de propósito: quem confia no token é o backend do Firebase, que o
 * valida a cada requisição. Aqui o `exp` serve só para o cliente saber QUANDO pedir um novo — um
 * token adulterado continua sendo rejeitado no servidor, então decodificar sem verificar não abre
 * nada.
 *
 * Existe porque o `getToken` do `@react-native-firebase/app-check` devolve apenas `{ token }`, sem
 * a expiração que o `CustomProvider` do Firebase JS SDK exige (ver `appCheckBridge.native.ts`).
 */
export function getJwtExpiryMillis(jwt: string): number | null {
  const segments = jwt.split('.');

  if (segments.length !== 3 || segments[1] === undefined || segments[1] === '') {
    return null;
  }

  let payload: unknown;

  try {
    payload = JSON.parse(decodeBase64Url(segments[1]));
  } catch {
    // Base64 inválido ou JSON inválido: o contrato desta função é "null para token malformado",
    // e quem chama trata o null como falha (não há token utilizável para devolver).
    return null;
  }

  if (typeof payload !== 'object' || payload === null || !('exp' in payload)) {
    return null;
  }

  const { exp } = payload;

  // `exp` é NumericDate (RFC 7519): segundos desde a época.
  if (typeof exp !== 'number' || !Number.isFinite(exp) || exp <= 0) {
    return null;
  }

  return exp * 1000;
}

/**
 * base64url → string. `atob` é global no Hermes e no Node — sem dependência nova. O resultado é
 * uma string binária (um char por byte): suficiente aqui, porque só os claims numéricos importam e
 * eles são ASCII mesmo se outro claim tiver UTF-8 multibyte.
 */
function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

  return atob(padded);
}
