import type { FirstMeasurement } from '@/features/readings/useSecondMeasurementFlow';

export interface VoiceEntryProps {
  onSaved: (reading: FirstMeasurement) => void;
}
