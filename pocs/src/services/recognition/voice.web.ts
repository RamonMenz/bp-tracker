import { PocError, type FinalTranscript } from '@/domain/contracts';
import type { Attempt } from '@/features/attempt';

interface SpeechResult { isFinal: boolean; 0: { transcript: string } }
interface LocalSpeech {
  processLocally: boolean; lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
interface LocalSpeechConstructor {
  new(): LocalSpeech;
  available?: (options: { langs: string[]; processLocally: true }) => Promise<string>;
  install?: (options: { langs: string[]; processLocally: true }) => Promise<boolean>;
}

export async function prepareVoiceModel(attempt: Attempt): Promise<void> {
  const host = window as unknown as { SpeechRecognition?: LocalSpeechConstructor; webkitSpeechRecognition?: LocalSpeechConstructor };
  const Speech = host.SpeechRecognition ?? host.webkitSpeechRecognition;
  if (!Speech?.install || !Speech.available || !('processLocally' in new Speech())) throw new PocError('local-unavailable');
  // Só o pacote estático; não cria sessão de captura nem pede microfone.
  const installed = await attempt.wait(Speech.install({ langs: ['pt-BR'], processLocally: true }), 120_000);
  if (!installed) throw new PocError('model-missing');
  const state = await attempt.wait(Speech.available({ langs: ['pt-BR'], processLocally: true }), 10_000);
  if (state !== 'available') throw new PocError('model-missing');
}

export async function recognizeVoice(attempt: Attempt, onListening: (finish: () => void) => void) {
  const host = window as unknown as { SpeechRecognition?: LocalSpeechConstructor; webkitSpeechRecognition?: LocalSpeechConstructor };
  const Speech = host.SpeechRecognition ?? host.webkitSpeechRecognition;
  if (!isSecureContext || !Speech?.available) throw new PocError('local-unavailable');
  const start = performance.now();
  const speech = new Speech();
  attempt.own(() => {
    speech.onresult = null; speech.onerror = null; speech.onend = null;
    try { speech.abort(); } catch { /* instância já encerrada; não expor erro do fornecedor */ }
  });
  if (!('processLocally' in speech)) throw new PocError('local-unavailable');
  const available = await attempt.wait(Speech.available({ langs: ['pt-BR'], processLocally: true }), 10_000);
  if (available !== 'available') throw new PocError(available === 'unavailable' ? 'local-unavailable' : 'model-missing');
  attempt.check(); speech.processLocally = true;
  if (speech.processLocally !== true) throw new PocError('local-unavailable');
  speech.lang = 'pt-BR'; speech.interimResults = false; speech.continuous = false;
  const initializationMs = performance.now() - start;
  const recognitionStart = performance.now();
  const capturedAtMs = Date.now();
  const final = new Promise<string>((resolve, reject) => {
    speech.onresult = event => {
      if (attempt.signal.aborted) return;
      const results = Array.from(event.results).filter(value => value.isFinal);
      const text = results.map(value => value[0].transcript).join(' ').trim();
      if (!text || text.length > 4096) { reject(new PocError('no-result')); return; }
      resolve(text);
    };
    speech.onerror = event => reject(new PocError(event.error === 'not-allowed' ? 'permission-denied'
      : event.error === 'language-not-supported' ? 'model-missing' : event.error === 'no-speech' ? 'no-result' : 'engine-failed'));
    speech.onend = () => reject(new PocError('no-result'));
    speech.start();
  });
  onListening(() => { attempt.check(); speech.stop(); });
  const finalText = await attempt.wait(final, 30_000);
  const finalTranscript: FinalTranscript = { kind: 'transcript', locale: 'pt-BR', final: true, capturedAtMs, text: finalText };
  return { finalTranscript, initializationMs, recognitionMs: performance.now() - recognitionStart };
}
