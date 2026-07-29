import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type FirestoreError,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useSession } from '@/features/auth/useSession';
import { readingsCollectionPath } from '@/lib/firestore-paths';
import { logError } from '@/lib/logger';
import { firestore } from '@/services/firebase';
import type { Reading } from '@/types/models';

import { parseReading } from './reading.schema';

export interface ReadingListItem extends Reading {
  id: string;
  /** true enquanto a escrita só existe no cache local, ainda não confirmada pelo servidor. */
  hasPendingWrites: boolean;
}

export interface UseReadingsResult {
  readings: ReadingListItem[];
  isLoading: boolean;
  error: string | null;
}

const PERMISSION_MESSAGE = 'Sem permissão para ver seu histórico. Faça login novamente.';
const NETWORK_MESSAGE = 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
const GENERIC_MESSAGE = 'Não foi possível carregar seu histórico. Tente novamente.';

function mapFirestoreError(firestoreError: FirestoreError): string {
  if (firestoreError.code === 'permission-denied') {
    return PERMISSION_MESSAGE;
  }

  if (firestoreError.code === 'unavailable') {
    return NETWORK_MESSAGE;
  }

  return GENERIC_MESSAGE;
}

export function useReadings(): UseReadingsResult {
  const { user } = useSession();
  const [readings, setReadings] = useState<ReadingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user === null) {
      // Reset ao encerrar a sessão que assina o onSnapshot abaixo — não deriva estado do render,
      // sincroniza com o desligamento do listener externo (react-hooks/set-state-in-effect não
      // distingue esse caso do de deriving-state-from-props).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReadings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const readingsQuery = query(
      collection(firestore, readingsCollectionPath(user.uid)),
      orderBy('measuredAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      readingsQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const parsed: ReadingListItem[] = [];

        for (const docSnapshot of snapshot.docs) {
          try {
            const reading = parseReading(docSnapshot.data());
            parsed.push({
              ...reading,
              id: docSnapshot.id,
              hasPendingWrites: docSnapshot.metadata.hasPendingWrites,
            });
          } catch (parseError) {
            // Um documento fora do formato esperado não derruba a lista inteira —
            // só esse item some do histórico até o dado ser corrigido.
            logError('readings.parse', parseError, { uid: user.uid, docId: docSnapshot.id });
          }
        }

        setReadings(parsed);
        setError(null);
        setIsLoading(false);
      },
      (snapshotError) => {
        logError('readings.snapshot', snapshotError, { uid: user.uid });
        setError(mapFirestoreError(snapshotError));
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  return { readings, isLoading, error };
}
