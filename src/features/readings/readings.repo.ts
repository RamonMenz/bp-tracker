import { addDoc, collection, serverTimestamp, type FieldValue } from 'firebase/firestore';

import { readingsCollectionPath } from '@/lib/firestore-paths';
import { firestore } from '@/services/firebase';
import type { ReadingInput } from '@/types/models';

type ReadingWritePayload = ReadingInput & { createdAt: FieldValue };

const PERMISSION_MESSAGE = 'Sem permissão para salvar. Faça login novamente.';
const NETWORK_MESSAGE = 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
const GENERIC_MESSAGE = 'Não foi possível salvar sua medição. Tente novamente.';

function getErrorCode(error: unknown): string | undefined {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

export async function addReading(uid: string, input: ReadingInput): Promise<void> {
  try {
    const payload: ReadingWritePayload = {
      ...input,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(firestore, readingsCollectionPath(uid)), payload);
  } catch (error) {
    const code = getErrorCode(error);

    if (code === 'permission-denied') {
      throw new Error(PERMISSION_MESSAGE);
    }

    if (code === 'unavailable') {
      throw new Error(NETWORK_MESSAGE);
    }

    throw new Error(GENERIC_MESSAGE);
  }
}
