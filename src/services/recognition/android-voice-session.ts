// Compatibilidade Android: coordinator puro compartilhado, sem mudança de comportamento.
export { createVoiceSession as createAndroidVoiceSession } from './voice-session';
export type { VoicePhase, VoiceState } from './voice-session';
