import { useState } from 'react';

import { useSession } from '@/features/auth/useSession';
import { getAllReadings } from '@/features/readings/readings.repo';
import { readingsToCsv } from '@/lib/csv';
import { saveAndShareCsv } from '@/lib/file';

export interface UseExportCsvResult {
  exportCsv: () => Promise<void>;
  isExporting: boolean;
  error: string | null;
}

const NOT_SIGNED_IN_MESSAGE = 'Sessão expirada. Faça login novamente.';
const EMPTY_MESSAGE = 'Nenhuma medição para exportar ainda.';
const GENERIC_MESSAGE = 'Não foi possível exportar o arquivo. Tente novamente.';

function buildFilename(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `pressao-${year}-${month}-${day}.csv`;
}

export function useExportCsv(): UseExportCsvResult {
  const { user } = useSession();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportCsv(): Promise<void> {
    if (user === null) {
      setError(NOT_SIGNED_IN_MESSAGE);
      return;
    }

    setError(null);
    setIsExporting(true);

    try {
      const readings = await getAllReadings(user.uid);

      if (readings.length === 0) {
        setError(EMPTY_MESSAGE);
        return;
      }

      const csv = readingsToCsv(readings);

      try {
        await saveAndShareCsv(buildFilename(), csv);
      } catch (shareError) {
        setError(shareError instanceof Error ? shareError.message : GENERIC_MESSAGE);
      }
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : GENERIC_MESSAGE);
    } finally {
      setIsExporting(false);
    }
  }

  return { exportCsv, isExporting, error };
}
