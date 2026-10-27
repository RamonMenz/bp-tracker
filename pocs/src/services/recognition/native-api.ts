import { requireOptionalNativeModule } from 'expo-modules-core';

import { PocError, type SafeCode } from '@/domain/contracts';

export interface NativeApi {
  requestPermission(kind: 'camera' | 'audio'): Promise<boolean>;
  probeVoice(): Promise<unknown>;
  startVoice(): Promise<unknown>;
  finishVoice(): Promise<void>;
  cancelVoice(): Promise<void>;
}
export const nativeApi = requireOptionalNativeModule<NativeApi>('AferiLocalRecognition');

export function nativeResponse(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new PocError('engine-failed');
  const result = value as Record<string, unknown>;
  if (typeof result.code === 'string' && result.code !== 'ready') {
    const allowed: SafeCode[] = ['local-unavailable', 'language-unverified', 'model-missing', 'permission-denied',
      'timeout', 'cancelled', 'no-result', 'camera-failed'];
    throw new PocError(allowed.includes(result.code as SafeCode) ? result.code as SafeCode : 'engine-failed');
  }
  return result;
}
