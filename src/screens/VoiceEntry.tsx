import type { ComponentType } from 'react';

import type { FirstMeasurement } from '@/features/readings/useSecondMeasurementFlow';

export interface VoiceEntryProps {
  onSaved: (reading: FirstMeasurement) => void;
}

export const VoiceEntry: ComponentType<VoiceEntryProps> = () => null;
