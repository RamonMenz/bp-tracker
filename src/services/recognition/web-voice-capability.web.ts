import type { LocalWebSpeechConstructor } from './web-voice.web';

interface LocalModelOptions { langs: ['pt-BR']; processLocally: true }

export const localModelOptions = (): LocalModelOptions => ({ langs: ['pt-BR'], processLocally: true });

export function browserSpeechConstructor(): LocalWebSpeechConstructor | undefined {
  const host = globalThis as typeof globalThis & {
    SpeechRecognition?: LocalWebSpeechConstructor;
    webkitSpeechRecognition?: LocalWebSpeechConstructor;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition;
}

/** Pré-verificação passiva. A tentativa de captura ainda precisa validar a instância. */
export async function hasLocalWebVoice(): Promise<boolean> {
  try {
    if (globalThis.isSecureContext !== true) return false;
    const Speech = browserSpeechConstructor();
    return !!Speech && 'processLocally' in Speech.prototype && typeof Speech.available === 'function'
      && await Speech.available(localModelOptions()) === 'available';
  } catch {
    return false;
  }
}
