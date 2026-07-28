import { useState } from 'react';
import { ZodError } from 'zod';

import { useSession } from '@/features/auth/useSession';
import type { ReadingInput } from '@/types/models';

import { parseReadingInput } from './reading.schema';
import { addReading as persistReading } from './readings.repo';

export interface ReadingFormValues {
  systolic: string;
  diastolic: string;
  pulse: string;
  note: string;
  measuredAt: Date;
}

export interface UseAddReadingResult {
  addReading: (values: ReadingFormValues) => Promise<boolean>;
  isSaving: boolean;
  error: string | null;
}

const INVALID_MESSAGE = 'Confira os valores da medição.';
const NOT_SIGNED_IN_MESSAGE = 'Sessão expirada. Faça login novamente.';
const GENERIC_MESSAGE = 'Não foi possível salvar sua medição. Tente novamente.';

export function useAddReading(): UseAddReadingResult {
  const { user } = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addReading(values: ReadingFormValues): Promise<boolean> {
    if (user === null) {
      setError(NOT_SIGNED_IN_MESSAGE);
      return false;
    }

    setError(null);
    setIsSaving(true);

    try {
      const candidate = {
        systolic: values.systolic === '' ? undefined : Number(values.systolic),
        diastolic: values.diastolic === '' ? undefined : Number(values.diastolic),
        pulse: values.pulse === '' ? null : Number(values.pulse),
        note: values.note === '' ? null : values.note,
        measuredAt: values.measuredAt,
        source: 'manual' as const,
      };

      let input: ReadingInput;

      try {
        input = parseReadingInput(candidate);
      } catch (validationError) {
        const message =
          validationError instanceof ZodError
            ? (validationError.issues[0]?.message ?? INVALID_MESSAGE)
            : INVALID_MESSAGE;
        setError(message);
        return false;
      }

      await persistReading(user.uid, input);
      return true;
    } catch (persistError) {
      setError(persistError instanceof Error ? persistError.message : GENERIC_MESSAGE);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return { addReading, isSaving, error };
}
