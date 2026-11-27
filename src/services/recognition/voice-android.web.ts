import { VoiceCaptureError, type AndroidVoicePorts } from './voice-capture-contract';

// Não usa SpeechRecognition remoto, microfone ou módulo Android no Web.
export function loadAndroidVoiceBinding(): AndroidVoicePorts { throw new VoiceCaptureError('unsupported'); }
