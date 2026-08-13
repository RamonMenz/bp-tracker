import { useReadings } from './useReadings';
import type { ReadingListItem } from './useReadings';

export interface UseLastReadingResult {
  lastReading: ReadingListItem | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Deriva de `useReadings`, que já entrega a lista ordenada por `measuredAt` desc — nenhum
 * listener novo. Duas telas assinando a mesma query do Firestore compartilham o cache do SDK,
 * então o custo de a Home usar isto ao lado do Histórico é local, não de rede.
 */
export function useLastReading(): UseLastReadingResult {
  const { readings, isLoading, error } = useReadings();

  return { lastReading: readings[0] ?? null, isLoading, error };
}
