import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type FieldValue,
} from 'firebase/firestore';

import { readingDocPath, readingsCollectionPath } from '@/lib/firestore-paths';
import { logError } from '@/lib/logger';
import { firestore } from '@/services/firebase';
import type { Reading, ReadingInput } from '@/types/models';

import { parseReading } from './reading.schema';

type ReadingWritePayload = ReadingInput & { createdAt: FieldValue };

const PERMISSION_MESSAGE = 'Sem permissão para salvar. Faça login novamente.';
const NETWORK_MESSAGE = 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
const GENERIC_MESSAGE = 'Não foi possível salvar sua medição. Tente novamente.';
const DELETE_PERMISSION_MESSAGE = 'Sem permissão para excluir. Faça login novamente.';
const DELETE_GENERIC_MESSAGE = 'Não foi possível excluir a medição. Tente novamente.';
const READ_PERMISSION_MESSAGE = 'Sem permissão para ler seu histórico. Faça login novamente.';
const READ_GENERIC_MESSAGE = 'Não foi possível carregar suas medições. Tente novamente.';

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

export async function updateReading(uid: string, readingId: string, input: ReadingInput): Promise<void> {
  try {
    await updateDoc(doc(firestore, readingDocPath(uid, readingId)), input);
  } catch (error) {
    logError('readings.update', error, { uid });

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

export async function deleteReading(uid: string, readingId: string): Promise<void> {
  try {
    await deleteDoc(doc(firestore, readingDocPath(uid, readingId)));
  } catch (error) {
    logError('readings.delete', error, { uid });

    const code = getErrorCode(error);

    if (code === 'permission-denied') {
      throw new Error(DELETE_PERMISSION_MESSAGE);
    }

    if (code === 'unavailable') {
      throw new Error(NETWORK_MESSAGE);
    }

    throw new Error(DELETE_GENERIC_MESSAGE);
  }
}

/** Leitura única (não é um listener) — usada pelo export, que só precisa de uma fotografia do histórico. */
export async function getAllReadings(uid: string): Promise<Reading[]> {
  try {
    const snapshot = await getDocs(
      query(collection(firestore, readingsCollectionPath(uid)), orderBy('measuredAt', 'desc')),
    );

    const readings: Reading[] = [];

    for (const docSnapshot of snapshot.docs) {
      try {
        readings.push(parseReading(docSnapshot.data()));
      } catch (parseError) {
        // Mesma política do useReadings: um documento fora do formato não derruba o export inteiro.
        logError('readings.parse', parseError, { uid, docId: docSnapshot.id });
      }
    }

    return readings;
  } catch (error) {
    const code = getErrorCode(error);

    if (code === 'permission-denied') {
      throw new Error(READ_PERMISSION_MESSAGE);
    }

    if (code === 'unavailable') {
      throw new Error(NETWORK_MESSAGE);
    }

    throw new Error(READ_GENERIC_MESSAGE);
  }
}
