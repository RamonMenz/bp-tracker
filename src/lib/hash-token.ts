/**
 * Hash não criptográfico (djb2) só para um ID de documento curto e estável a partir de um token
 * de push — não é um limite de segurança, é o que o PLAN §2.1 pede para evitar duplicar/inflar o
 * caminho do doc por token. Compartilhado entre `registerPushToken.native.ts` e
 * `registerPushToken.web.ts`: as duas plataformas persistem em `devices/{tokenHash}` do mesmo
 * jeito, e duplicar esta função entre os dois arquivos violaria o CLAUDE.md §3.2 (lógica pura não
 * se duplica entre arquivos de plataforma).
 */
export function hashToken(token: string): string {
  let hash = 5381;

  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 33) ^ token.charCodeAt(index);
  }

  return (hash >>> 0).toString(16);
}
