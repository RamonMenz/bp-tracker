import { requireOptionalNativeModule } from 'expo';

import { VoiceCaptureError, type AndroidVoicePorts } from './voice-capture-contract';

interface NativeVoice {
  availability(): Promise<unknown>;
  checkLocalLanguage(id: number): Promise<unknown>;
  requestMicrophonePermission(): Promise<boolean>;
  prepare(id: number): Promise<unknown>;
  start(id: number): Promise<unknown>;
  startWithHypotheses?(id: number): Promise<unknown>;
  finish(id: number): Promise<boolean>;
  cancel(id: number): Promise<boolean>;
  addListener(event: 'onVoiceStatus', listener: (event: unknown) => void): { remove(): void };
}
function getNativeVoice(): NativeVoice {
  const api = requireOptionalNativeModule<NativeVoice>('AferiLocalVoice');
  if (!api) throw new VoiceCaptureError('unsupported');
  return api;
}

let nextProbeId = 0;

/** Consulta única, sem solicitação de permissão ou captura. Chamar no gesto de verificar. */
export function checkAndroidVoiceCapability() {
  const api = getNativeVoice();
  const id = --nextProbeId;
  return {
    result: api.checkLocalLanguage(id).then(value => !!value && typeof value === 'object'
      && 'code' in value && value.code === 'ready'),
    cancel: async () => api.cancel(id),
  };
}

/** Não consulta módulo, serviço ou permissão ao importar. Chamar somente por ação explícita. */
export function loadAndroidVoiceBinding(withHypotheses = false): AndroidVoicePorts {
  const api = getNativeVoice();
  const start = withHypotheses ? api.startWithHypotheses : api.start;
  if (typeof start !== 'function') throw new VoiceCaptureError('unsupported');
  return { availability: () => api.availability(), requestPermission: () => api.requestMicrophonePermission(),
    prepare: id => api.prepare(id), start: id => start.call(api, id),
    finish: id => api.finish(id), close: id => api.cancel(id),
    listen: listener => { const subscription = api.addListener('onVoiceStatus', listener); return () => subscription.remove(); } };
}
