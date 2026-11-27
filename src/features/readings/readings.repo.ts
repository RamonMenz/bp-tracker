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
import type { ReportSourceReading, ReportSourceSnapshot } from '@/lib/report/report-model';
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

/** Recorte da leitura do relatório PDF: início inclusivo (null = sem limite) e fim EXCLUSIVO. */
export interface ReportReadingsRange {
  startInclusive: Date | null;
  endExclusive: Date;
}

export type ReadingsQueryFailure = 'permission' | 'network' | 'generic';

/**
 * Falha da leitura do relatório com o MOTIVO tipado: quem chama escolhe a própria mensagem
 * amigável pelo `reason`, sem nunca exibir `error.message` (CLAUDE.md §4.3).
 */
export class ReadingsQueryError extends Error {
  readonly reason: ReadingsQueryFailure;

  constructor(reason: ReadingsQueryFailure) {
    super(`readings-query-${reason}`);
    this.name = 'ReadingsQueryError';
    this.reason = reason;
  }
}

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

/**
 * Leitura única para o relatório PDF (spec-relatorio-pdf §4). NÃO substitui `getAllReadings`, que
 * segue intacta para o CSV: aqui o retorno precisa de mais do que os registros — o id (desempate
 * estável), `hasPendingWrites` por registro, `fromCache` do conjunto e QUANTOS documentos foram
 * omitidos por não passarem no schema. Sem isso, o PDF apresentaria um subconjunto como se fosse o
 * histórico completo.
 *
 * Filtra e ordena por `measuredAt` (nunca `createdAt`), o mesmo campo do índice de campo único já
 * existente — nenhum índice novo. Fim exclusivo (`<`), como o período civil do relatório.
 */
export async function getReadingsForReport(uid: string, range: ReportReadingsRange): Promise<ReportSourceSnapshot> {
  try {
    const constraints: QueryConstraint[] = [orderBy('measuredAt', 'asc')];

    if (range.startInclusive !== null) {
      constraints.push(where('measuredAt', '>=', range.startInclusive));
    }

    constraints.push(where('measuredAt', '<', range.endExclusive));

    const snapshot = await getDocs(query(collection(firestore, readingsCollectionPath(uid)), ...constraints));

    const readings: ReportSourceReading[] = [];
    let omittedCount = 0;

    for (const docSnapshot of snapshot.docs) {
      try {
        readings.push({
          ...parseReading(docSnapshot.data()),
          id: docSnapshot.id,
          hasPendingWrites: docSnapshot.metadata.hasPendingWrites,
        });
      } catch {
        omittedCount += 1;
        logError('readings.parse', new Error('reading-parse-failed'), { uid, docId: docSnapshot.id });
      }
    }

    return { readings, fromCache: snapshot.metadata.fromCache, omittedCount };
  } catch (error) {
    // Erro do SDK pode carregar conteúdo da consulta: só o código decide o motivo, nada é repassado.
    logError('readings.report-query', new Error('report-query-failed'), { uid });

    const code = getErrorCode(error);

    if (code === 'permission-denied') {
      throw new ReadingsQueryError('permission');
    }

    if (code === 'unavailable') {
      throw new ReadingsQueryError('network');
    }

    throw new ReadingsQueryError('generic');
  }
}
