import { useState } from 'react';

import { useSession } from '@/features/auth/useSession';

import { deleteReading as persistDelete } from './readings.repo';

export interface UseDeleteReadingResult {
  deleteReading: (readingId: string) => Promise<boolean>;
  isDeleting: boolean;
  error: string | null;
}

const NOT_SIGNED_IN_MESSAGE = 'Sessão expirada. Faça login novamente.';
const GENERIC_MESSAGE = 'Não foi possível excluir a medição. Tente novamente.';

export function useDeleteReading(): UseDeleteReadingResult {
  const { user } = useSession();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteReading(readingId: string): Promise<boolean> {
    if (user === null) {
      setError(NOT_SIGNED_IN_MESSAGE);
      return false;
    }

    setError(null);
    setIsDeleting(true);

    try {
      await persistDelete(user.uid, readingId);
      return true;
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : GENERIC_MESSAGE);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }

  return { deleteReading, isDeleting, error };
}
