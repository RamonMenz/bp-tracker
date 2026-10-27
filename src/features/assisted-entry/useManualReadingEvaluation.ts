import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { classifyBloodPressure } from '@/domain/bp-classification';
import { computeBpFieldErrors } from '@/features/readings/reading-field-errors';
import { NOTE_MAX_LENGTH, readingInputSchema } from '@/features/readings/reading.schema';
import type { UseReadingFormResult } from '@/features/readings/useReadingForm';

/** Manual do cliente isolado, sem importar o hook clínico ou um writer. */
export function useManualReadingEvaluation() {
  const empty = () => ({ systolic: '', diastolic: '', pulse: '', note: '', measuredAt: new Date() });
  const [draft, setDraft] = useState(empty);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') { setDraft(empty()); setConfirmed(false); }
    });
    return () => subscription.remove();
  }, []);
  const parsed = readingInputSchema.safeParse({ systolic: draft.systolic.trim() ? Number(draft.systolic) : undefined,
    diastolic: draft.diastolic.trim() ? Number(draft.diastolic) : undefined,
    pulse: draft.pulse.trim() ? Number(draft.pulse) : null, note: draft.note || null,
    measuredAt: draft.measuredAt, source: 'manual', sessionReadings: null });
  function edit<K extends keyof typeof draft>(key: K, value: typeof draft[K]) {
    setConfirmed(false); setDraft(previous => ({ ...previous, [key]: value }));
  }
  const form: UseReadingFormResult = { ...draft,
    setSystolic: value => edit('systolic', value), setDiastolic: value => edit('diastolic', value),
    setPulse: value => edit('pulse', value), setNote: value => edit('note', value), setMeasuredAt: value => edit('measuredAt', value),
    fieldErrors: { ...computeBpFieldErrors(draft), note: draft.note.length > NOTE_MAX_LENGTH ? 'Observação muito longa.' : null },
    previewCategory: parsed.success ? classifyBloodPressure(parsed.data.systolic, parsed.data.diastolic) : null,
    canSubmit: parsed.success && !confirmed, isSaving: false, submitError: null,
    submit: async () => { if (parsed.success) setConfirmed(true); return { success: parsed.success, readingId: null }; },
  };
  return { form, confirmed };
}
