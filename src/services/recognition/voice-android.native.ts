import { requireOptionalNativeModule } from 'expo';

import { VoiceCaptureError, type AndroidVoicePorts } from './voice-capture-contract';

interface NativeVoice {
  availability(): Promise<unknown>;
  requestMicrophonePermission(): Promise<boolean>;
  prepare(id: number): Promise<unknown>;
  start(id: number): Promise<unknown>;
  finish(id: number): Promise<boolean>;
  cancel(id: number): Promise<boolean>;
  addListener(event: 'onVoiceStatus', listener: (event: unknown) => void): { remove(): void };
}
/** Não consulta módulo, serviço ou permissão ao importar. Chamar somente por ação explícita. */
export function loadAndroidVoiceBinding(): AndroidVoicePorts {
  const api = requireOptionalNativeModule<NativeVoice>('AferiLocalVoice');
  if (!api) throw new VoiceCaptureError('unsupported');
  return { availability: () => api.availability(), requestPermission: () => api.requestMicrophonePermission(),
    prepare: id => api.prepare(id), start: id => api.start(id), finish: id => api.finish(id), close: id => api.cancel(id),
    listen: listener => { const subscription = api.addListener('onVoiceStatus', listener); return () => subscription.remove(); } };
}
