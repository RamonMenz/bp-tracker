import { getFirestore } from 'firebase-admin/firestore';

// Fonte única dos caminhos usados pelas Functions. O `src/lib/firestore-paths.ts` do app não
// serve aqui: `functions/` é um projeto TypeScript isolado, com dependências próprias.
export function schedulePath(uid: string): string {
  return `schedules/${uid}`;
}

export function devicesPath(uid: string): string {
  return `users/${uid}/devices`;
}

/**
 * Tokens FCM válidos do usuário, sem duplicatas.
 *
 * O campo é validado em vez de confiado: um documento de device gravado fora do formato não
 * deve injetar `undefined` no array de tokens, que quebraria o envio em lote no disparo.
 */
export async function readDeviceTokens(uid: string): Promise<string[]> {
  const snapshot = await getFirestore().collection(devicesPath(uid)).get();
  const tokens = new Set<string>();

  for (const deviceDoc of snapshot.docs) {
    const token: unknown = deviceDoc.get('token');

    if (typeof token === 'string' && token !== '') {
      tokens.add(token);
    }
  }

  return [...tokens];
}
