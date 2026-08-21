import { useState } from 'react';

import { useSession } from '@/features/auth/useSession';
import { getAllReadings, type ReadingDateRange } from '@/features/readings/readings.repo';
import { readingsToCsv } from '@/lib/csv';
import { saveAndShareCsv } from '@/lib/file';

export interface UseExportCsvResult {
  /** Sem `range`, exporta o histórico inteiro (comportamento atual). Com `range`, só o período. */
  exportCsv: (range?: ReadingDateRange) => Promise<void>;
  isExporting: boolean;
  error: string | null;
}

const NOT_SIGNED_IN_MESSAGE = 'Sessão expirada. Faça login novamente.';
const EMPTY_MESSAGE = 'Nenhuma medição para exportar ainda.';
const EMPTY_RANGE_MESSAGE = 'Nenhuma medição no período selecionado.';
const GENERIC_MESSAGE = 'Não foi possível exportar o arquivo. Tente novamente.';

function formatDateComponents(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** Sem `range` (exportação de tudo), o nome carrega a data de hoje — comportamento atual, intacto. */
function buildFilename(range?: ReadingDateRange): string {
  if (range === undefined) {
    return `pressao-${formatDateComponents(new Date())}.csv`;
  }

  return `pressao-${formatDateComponents(range.start)}_a_${formatDateComponents(range.end)}.csv`;
}

export function useExportCsv(): UseExportCsvResult {
  const { user } = useSession();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportCsv(range?: ReadingDateRange): Promise<void> {
    if (user === null) {
      setError(NOT_SIGNED_IN_MESSAGE);
      return;
    }

    setError(null);
    setIsExporting(true);

    try {
      const readings = await getAllReadings(user.uid, range);

      if (readings.length === 0) {
        setError(range === undefined ? EMPTY_MESSAGE : EMPTY_RANGE_MESSAGE);
        return;
      }

      const csv = readingsToCsv(readings);

      try {
        await saveAndShareCsv(buildFilename(range), csv);
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
