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
  const [state, setState] = useState<UseReadingsResult & { owner: typeof user }>({
    owner: null, readings: [], isLoading: true, error: null,
  });

  useEffect(() => {
    // Sincronização do listener externo, inclusive limpeza na troca/logout.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ owner: user, readings: [], isLoading: user !== null, error: null });
    if (user === null) return;
    let active = true;

    const readingsQuery = query(
      collection(firestore, readingsCollectionPath(user.uid)),
      orderBy('measuredAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      readingsQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!active) return;
        const parsed: ReadingListItem[] = [];

        for (const docSnapshot of snapshot.docs) {
          try {
            const reading = parseReading(docSnapshot.data());
            parsed.push({
              ...reading,
              id: docSnapshot.id,
              hasPendingWrites: docSnapshot.metadata.hasPendingWrites,
            });
          } catch {
            // Um documento fora do formato esperado não derruba a lista inteira —
            // só esse item some do histórico até o dado ser corrigido.
            logError('readings.parse', new Error('reading-parse-failed'), { uid: user.uid, docId: docSnapshot.id });
          }
        }

        setState({ owner: user, readings: parsed, error: null, isLoading: false });
      },
      (snapshotError) => {
        if (!active) return;
        logError('readings.snapshot', new Error('reading-snapshot-failed'), { uid: user.uid });
        setState(previous => ({ ...previous, error: mapFirestoreError(snapshotError), isLoading: false }));
      },
    );

    return () => { active = false; unsubscribe(); };
  }, [user]);

  // Também protege o primeiro render da nova conta, antes do cleanup do effect.
  if (state.owner !== user) return { readings: [], isLoading: user !== null, error: null };
  return { readings: state.readings, isLoading: state.isLoading, error: state.error };
}
