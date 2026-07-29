import { useState } from 'react';

import { deleteAccount as performDeleteAccount } from './deleteAccount';

export interface UseDeleteAccountResult {
  deleteAccount: () => Promise<boolean>;
  isDeleting: boolean;
  error: string | null;
}

const GENERIC_MESSAGE = 'Não foi possível excluir sua conta. Tente novamente.';

export function useDeleteAccount(): UseDeleteAccountResult {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount(): Promise<boolean> {
    setError(null);
    setIsDeleting(true);

    try {
      await performDeleteAccount();
      return true;
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : GENERIC_MESSAGE);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }

  return { deleteAccount, isDeleting, error };
}
