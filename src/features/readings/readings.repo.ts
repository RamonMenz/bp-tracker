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
  where,
  type FieldValue,
  type QueryConstraint,
} from 'firebase/firestore';

import { readingDocPath, readingsCollectionPath } from '@/lib/firestore-paths';
import { logError } from '@/lib/logger';
import { firestore } from '@/services/firebase';
import type { Reading, ReadingInput } from '@/types/models';

import { parseReading, parseReadingInput } from './reading.schema';

type ReadingWritePayload = ReadingInput & { createdAt: FieldValue };

/** Recorte por período para `getAllReadings` — usado pela exportação de CSV com range escolhido. */
export interface ReadingDateRange {
  start: Date;
  end: Date;
}

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

export async function addReading(uid: string, input: ReadingInput): Promise<string> {
  try {
    // Validação também na fronteira do repositório. Campos extras são rejeitados,
    // inclusive mídia/transcrição/confiança; createdAt continua exclusivo do servidor.
    const validated = parseReadingInput(input);
    const payload: ReadingWritePayload = {
      ...validated,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(firestore, readingsCollectionPath(uid)), payload);
    return docRef.id;
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
    const validated = parseReadingInput(input);
    // Os hooks legados validam source manual; atualizar nunca reclassifica a
    // origem já armazenada, inclusive na edição e média de sessionReadings.
    const { source: _source, ...changes } = validated;
    await updateDoc(doc(firestore, readingDocPath(uid, readingId)), changes);
  } catch (error) {
    // Erros de validação/SDK são potencialmente clínicos: não encaminhar o objeto bruto.
    logError('readings.update', new Error('reading-update-failed'), { uid });

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
    logError('readings.delete', new Error('reading-delete-failed'), { uid });

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

/**
 * Leitura única (não é um listener) — usada pelo export, que só precisa de uma fotografia do
 * histórico. `range`, quando informado, filtra por `measuredAt` — o MESMO campo do `orderBy`, o
 * que não exige índice composto novo em firestore.indexes.json (o índice de campo único em
 * `measuredAt` já existe e cobre filtro + ordenação nele).
 */
export async function getAllReadings(uid: string, range?: ReadingDateRange): Promise<Reading[]> {
  try {
    const constraints: QueryConstraint[] = [orderBy('measuredAt', 'desc')];

    if (range !== undefined) {
      constraints.push(where('measuredAt', '>=', range.start), where('measuredAt', '<=', range.end));
    }

    const snapshot = await getDocs(query(collection(firestore, readingsCollectionPath(uid)), ...constraints));

    const readings: Reading[] = [];

    for (const docSnapshot of snapshot.docs) {
      try {
        readings.push(parseReading(docSnapshot.data()));
      } catch {
        // Mesma política do useReadings: um documento fora do formato não derruba o export inteiro.
        logError('readings.parse', new Error('reading-parse-failed'), { uid, docId: docSnapshot.id });
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
