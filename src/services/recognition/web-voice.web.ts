import type { FinalTranscript } from '@/domain/assisted-entry';

import { VoiceCaptureError, VOICE_MESSAGES, type VoiceCapturePorts, type VoiceCaptureCode } from './voice-capture-contract';

export const WEB_VOICE_MESSAGES: Record<VoiceCaptureCode, string> = { ...VOICE_MESSAGES,
  unsupported: 'Voz local indisponível neste navegador. Use HTTPS/localhost ou o registro manual.',
  'language-unverified': 'Não foi possível verificar pt-BR local neste navegador. Use o registro manual.',
  'model-missing': 'Pacote pt-BR local não está pronto neste navegador. Use o registro manual; nenhum download será iniciado.',
  'cleanup-failed': 'Liberação da voz não confirmada. Use o manual e feche esta página antes de tentar voz novamente.',
};
export interface LocalWebSpeech {
  processLocally: boolean; lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onstart: (() => void) | null; onspeechend: (() => void) | null; onaudioend: (() => void) | null;
  onresult: ((event: unknown) => void) | null; onerror: ((event: unknown) => void) | null; onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
export interface LocalWebSpeechConstructor {
  new(): LocalWebSpeech;
  available?: (options: { langs: ['pt-BR']; processLocally: true }) => Promise<unknown>;
}
export interface WebVoiceEnvironment {
  secure(): boolean;
  constructorForSpeech(): LocalWebSpeechConstructor | undefined;
  now(): number;
}
const browser: WebVoiceEnvironment = {
  secure: () => globalThis.isSecureContext === true,
  constructorForSpeech: () => {
    const host = window as unknown as { SpeechRecognition?: LocalWebSpeechConstructor; webkitSpeechRecognition?: LocalWebSpeechConstructor };
    return host.SpeechRecognition ?? host.webkitSpeechRecognition;
  },
  now: () => Date.now(),
};
const record = (value: unknown): Record<string | number, unknown> | null => value && typeof value === 'object' ? value as Record<string | number, unknown> : null;
const fail = (code: VoiceCaptureCode) => ({ code });
interface Scope {
  speech: LocalWebSpeech; Speech: LocalWebSpeechConstructor; id: number; verified: boolean; started: boolean;
  ended: boolean; closing: boolean; abortSent: boolean; capturedAtMs: number;
  chunks: Map<number, string>; resolve: ((value: unknown) => void) | null;
  query: Promise<unknown> | null; end: Promise<void>; acknowledge: () => void; close: Promise<boolean> | null;
}

/** Base TASK-05: nunca chama start sem API local + modelo pronto. Sem gravador/getUserMedia paralelo. */
export function createWebVoicePorts(environment: WebVoiceEnvironment = browser): VoiceCapturePorts {
  let scope: Scope | null = null;
  let listener: ((event: unknown) => void) | null = null;
  function settle(run: Scope, value: unknown) { const resolve = run.resolve; run.resolve = null; resolve?.(value); }
  function status(run: Scope, value: string) { if (scope === run && !run.closing && !run.ended) listener?.({ attemptId: run.id, status: value }); }
  function detach(run: Scope): boolean {
    try {
      run.speech.onstart = null; run.speech.onspeechend = null; run.speech.onaudioend = null;
      run.speech.onresult = null; run.speech.onerror = null; run.speech.onend = null;
      run.chunks.clear(); run.resolve = null; run.verified = false;
      if (scope === run) scope = null;
      return true;
    } catch { return false; }
  }
  function validLocal(run: Scope): boolean {
    return 'processLocally' in run.speech && run.speech.processLocally === true
      && run.speech.lang.toLowerCase() === 'pt-br'
      && run.speech.continuous === false && run.speech.interimResults === false && run.speech.maxAlternatives === 1;
  }
  function collect(run: Scope, event: unknown) {
    if (scope !== run || run.closing || run.ended || !run.resolve) return;
    try {
      const raw = record(event), results = record(raw?.results);
      const length = results?.length, index = raw?.resultIndex;
      if (typeof length !== 'number' || !Number.isInteger(length) || length < 0 || length > 32
        || typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index > length) throw new VoiceCaptureError('engine-failed');
      for (let i = 0; i < length; i++) {
        const result = record(results![i]);
        if (result?.isFinal === false) continue; // Parcial não vira erro, candidato ou texto na UI.
        if (result?.isFinal !== true) throw new VoiceCaptureError('engine-failed');
        const alternatives = result.length;
        if (typeof alternatives !== 'number' || !Number.isInteger(alternatives) || alternatives < 1 || alternatives > 5) throw new VoiceCaptureError('ambiguous-result');
        const texts = new Set<string>();
        for (let j = 0; j < alternatives; j++) {
          const text = record(result[j])?.transcript;
          if (typeof text !== 'string' || !text.trim() || text.length > 2000) throw new VoiceCaptureError('no-result');
          texts.add(text.trim());
        }
        if (texts.size !== 1) throw new VoiceCaptureError('ambiguous-result');
        const text = [...texts][0];
        if (run.chunks.has(i) && run.chunks.get(i) !== text) throw new VoiceCaptureError('ambiguous-result');
        run.chunks.set(i, text);
      }
      if ([...run.chunks.values()].join(' ').length > 2000) throw new VoiceCaptureError('no-result');
      // Não resolve aqui: aguarda todos os segmentos finais e onend como ACK de encerramento.
    } catch (error) {
      run.chunks.clear(); settle(run, fail(error instanceof VoiceCaptureError ? error.code : 'engine-failed'));
    }
  }
  async function availability(): Promise<unknown> {
    try {
      if (!environment.secure()) return fail('unsupported');
      if (scope) return fail('resource-busy');
      const Speech = environment.constructorForSpeech();
      if (!Speech || typeof Speech.available !== 'function') return fail('local-unavailable');
      const speech = new Speech();
      let acknowledge!: () => void;
      const end = new Promise<void>(resolve => { acknowledge = resolve; });
      const run: Scope = { speech, Speech, id: 0, verified: false, started: false, ended: false,
        closing: false, abortSent: false, capturedAtMs: 0, chunks: new Map(), resolve: null, query: null, end, acknowledge, close: null };
      scope = run; // Registra propriedade antes de configurar/consultar APIs potencialmente falhas.
      if (!('processLocally' in speech)) return fail('local-unavailable');
      speech.processLocally = true; speech.lang = 'pt-BR'; speech.continuous = false;
      speech.interimResults = false; speech.maxAlternatives = 1;
      return validLocal(run) ? { code: 'ready' } : fail('local-unavailable');
    } catch { return fail('local-unavailable'); }
  }
  async function prepare(id: number): Promise<unknown> {
    const run = scope;
    if (!run || run.closing || run.started) return fail('language-unverified');
    run.id = id;
    try {
      run.query = Promise.resolve().then(() => run.Speech.available!({ langs: ['pt-BR'], processLocally: true }));
      const available = await run.query;
      if (scope !== run || run.closing) return fail('cancelled');
      if (available !== 'available') return fail(available === 'downloadable' || available === 'downloading' ? 'model-missing'
        : available === 'unavailable' ? 'local-unavailable' : 'language-unverified');
      if (!validLocal(run)) return fail('local-unavailable');
      run.verified = true; return { code: 'ready' };
    } catch { return fail('language-unverified'); }
  }
  async function start(id: number): Promise<unknown> {
    const run = scope;
    if (!run || run.id !== id || run.closing || run.started || !run.verified) return fail('language-unverified');
    try { if (!validLocal(run)) return fail('local-unavailable'); }
    catch { return fail('local-unavailable'); }
    return new Promise(resolve => {
      run.resolve = resolve;
      try {
        run.speech.onstart = () => status(run, 'listening');
        run.speech.onspeechend = run.speech.onaudioend = () => status(run, 'recognizing');
        run.speech.onresult = event => collect(run, event);
        run.speech.onerror = event => {
          if (scope !== run || run.closing || run.ended) return;
          const error = record(event)?.error;
          run.chunks.clear();
          settle(run, fail(error === 'not-allowed' || error === 'service-not-allowed' ? 'permission-denied'
            : error === 'language-not-supported' ? 'model-missing' : error === 'no-speech' ? 'no-result'
              : error === 'audio-capture' ? 'interrupted' : error === 'aborted' ? 'cancelled' : 'engine-failed'));
        };
        run.speech.onend = () => {
          if (scope !== run || run.ended) return;
          run.ended = true; run.acknowledge();
          if (run.closing) { detach(run); return; }
          if (!run.closing && run.resolve) {
            const chunks = [...run.chunks].sort(([a], [b]) => a - b);
            const text = chunks.map(([, text]) => text).join(' ');
            const contiguous = chunks.every(([index], offset) => index === offset);
            const final: FinalTranscript = { kind: 'transcript', final: true, locale: 'pt-BR', capturedAtMs: run.capturedAtMs, text };
            settle(run, text && contiguous ? final : fail('no-result'));
          }
          run.chunks.clear();
        };
        run.capturedAtMs = environment.now(); run.started = true;
        run.speech.start(); // Única chamada de captura; sem ramo remoto ou nova tentativa automática.
      } catch (error) {
        const name = record(error)?.name;
        settle(run, fail(name === 'NotAllowedError' || name === 'SecurityError' ? 'permission-denied' : 'engine-failed'));
      }
    });
  }
  async function finish(id: number): Promise<boolean> {
    const run = scope;
    if (!run || run.id !== id || !run.started || run.closing || run.ended) return false;
    try { run.speech.stop(); return true; } catch { return false; }
  }
  function close(id: number): Promise<boolean> {
    const run = scope;
    if (!run) return Promise.resolve(true);
    if (run.id && run.id !== id) return Promise.resolve(false);
    if (run.close) return run.close;
    run.closing = true; run.chunks.clear(); run.verified = false; settle(run, fail('cancelled'));
    run.close = (async () => {
      try {
        // Abort não é ACK: conserva onend e exclusão até o navegador confirmar o fim.
        if (run.started && !run.ended && !run.abortSent) { run.abortSent = true; run.speech.abort(); }
        if (run.started && !run.ended) await run.end;
        if (run.query) await run.query.catch(() => undefined);
        return detach(run);
      } catch { return false; }
    })();
    return run.close;
  }
  return { availability, prepare, start, finish, close,
    requestPermission: async () => true, // Permissão é solicitada pelo próprio SpeechRecognition.start, sem captura paralela.
    listen: callback => { listener = callback; return () => { if (listener === callback) listener = null; }; } };
}
