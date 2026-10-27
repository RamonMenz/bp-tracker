import type { FinalTranscript } from '@/domain/assisted-entry';

import type { createVoiceSession as Create, VoiceState } from './voice-session';
import { createWebVoicePorts, type LocalWebSpeech, type LocalWebSpeechConstructor } from './web-voice.web';

let create: typeof Create;
beforeEach(() => { jest.resetModules(); create = jest.requireActual<typeof import('./voice-session')>('./voice-session').createVoiceSession; });
afterEach(() => jest.useRealTimers());
async function flush() { for (let i = 0; i < 45; i++) await Promise.resolve(); }
function result(text: string, isFinal = true, alternatives = [text]) {
  return { isFinal, length: alternatives.length, ...Object.fromEntries(alternatives.map((transcript, i) => [i, { transcript }])) };
}
function event(text: string, isFinal = true) { return { resultIndex: 0, results: [result(text, isFinal)] }; }
function rig() {
  let state: VoiceState = { phase: 'idle', attemptId: 0, issue: null };
  const instances: FakeSpeech[] = [];
  class FakeSpeech implements LocalWebSpeech {
    static available = jest.fn(async (): Promise<unknown> => 'available');
    processLocally = false; lang = ''; continuous = true; interimResults = true; maxAlternatives = 4;
    onstart: LocalWebSpeech['onstart'] = null; onspeechend: LocalWebSpeech['onspeechend'] = null; onaudioend: LocalWebSpeech['onaudioend'] = null;
    onresult: LocalWebSpeech['onresult'] = null; onerror: LocalWebSpeech['onerror'] = null; onend: LocalWebSpeech['onend'] = null;
    start = jest.fn(); stop = jest.fn(); abort = jest.fn(() => this.onend?.());
    constructor() { instances.push(this); }
  }
  const env = { secure: jest.fn(() => true), constructorForSpeech: jest.fn((): LocalWebSpeechConstructor | undefined => FakeSpeech), now: () => 1793001600000 };
  const ports = createWebVoicePorts(env);
  const final = jest.fn();
  const session = create(ports, next => { state = next; }, final);
  return { session, ports, env, final, Speech: FakeSpeech, instances, state: () => state,
    speech: () => instances[instances.length - 1],
    listening: async () => { session.start(); await flush(); instances[0].onstart?.(); } };
}

test('sem ação não consulta/cria/captura; apenas local disponível inicia, final aguarda onend e fecha handlers', async () => {
  const t = rig(); expect(t.instances).toHaveLength(0); expect(t.Speech.available).not.toHaveBeenCalled();
  await t.listening(); const speech = t.speech();
  expect(t.Speech.available).toHaveBeenCalledWith({ langs: ['pt-BR'], processLocally: true });
  expect(speech).toMatchObject({ processLocally: true, lang: 'pt-BR', continuous: false, interimResults: false, maxAlternatives: 1 });
  speech.onresult?.(event('doze por oito')); await flush(); expect(t.final).not.toHaveBeenCalled();
  speech.onend?.(); await t.session.settled();
  const final: FinalTranscript = { kind: 'transcript', final: true, locale: 'pt-BR', capturedAtMs: 1793001600000, text: 'doze por oito' };
  expect(t.final).toHaveBeenCalledWith(t.state().attemptId, final); expect(speech.start).toHaveBeenCalledTimes(1);
  expect(speech.onresult).toBeNull(); expect(speech.onend).toBeNull(); expect(speech.onerror).toBeNull();
});
test('contexto inseguro não consulta constructor nem reconhecimento', async () => {
  const t = rig(); t.env.secure.mockReturnValue(false); t.session.start(); await t.session.settled();
  expect(t.state().issue).toBe('unsupported'); expect(t.env.constructorForSpeech).not.toHaveBeenCalled();
});
test('API ausente não cria candidato nem simula reconhecimento', async () => {
  const t = rig(); t.env.constructorForSpeech.mockReturnValue(undefined); t.session.start(); await t.session.settled();
  expect(t.state().issue).toBe('local-unavailable'); expect(t.final).not.toHaveBeenCalled(); expect(t.instances).toHaveLength(0);
});
test('API remota antiga sem available não é sequer instanciada', async () => {
  const t = rig(); class RemoteOnly extends t.Speech {}
  Object.defineProperty(RemoteOnly, 'available', { value: undefined });
  t.env.constructorForSpeech.mockReturnValue(RemoteOnly); t.session.start(); await t.session.settled();
  expect(t.instances).toHaveLength(0); expect(t.state().issue).toBe('local-unavailable');
});
test.each(['missing','readback-false','setter-throws','lang-refused'])('capacidade local %s não inicia captura', async variant => {
  const t = rig(); class Unsupported extends t.Speech {
    constructor() { super();
      if (variant === 'missing') delete (this as Partial<LocalWebSpeech>).processLocally;
      if (variant === 'readback-false') Object.defineProperty(this, 'processLocally', { get: () => false, set: () => {} });
      if (variant === 'setter-throws') Object.defineProperty(this, 'processLocally', { get: () => false, set: () => { throw new Error('SENTINELA'); } });
      if (variant === 'lang-refused') Object.defineProperty(this, 'lang', { get: () => 'pt-PT', set: () => {} });
    }
  }
  t.env.constructorForSpeech.mockReturnValue(Unsupported); t.session.start(); await t.session.settled();
  expect(t.speech().start).not.toHaveBeenCalled(); expect(t.final).not.toHaveBeenCalled(); expect(t.state().issue).toBe('local-unavailable');
  expect(JSON.stringify(t.state())).not.toContain('SENTINELA');
});
test.each(['unavailable','downloadable','downloading','unknown',null,false])('estado local %s não habilita nem instala modelo', async value => {
  const t = rig(); t.Speech.available.mockResolvedValue(value); t.session.start(); await t.session.settled();
  expect(t.speech().start).not.toHaveBeenCalled(); expect(t.final).not.toHaveBeenCalled();
  expect(['local-unavailable','model-missing','language-unverified']).toContain(t.state().issue);
});
test('available rejeitado por policy/erro não propaga exceção nem começa remoto', async () => {
  const t = rig(); t.Speech.available.mockRejectedValue(new Error('SENTINELA-CLINICA'));
  t.session.start(); await t.session.settled(); expect(t.state().issue).toBe('language-unverified');
  expect(t.speech().start).not.toHaveBeenCalled(); expect(JSON.stringify(t.state())).not.toContain('SENTINELA');
});
test('troca de processLocally após probe é recusada imediatamente antes de start', async () => {
  const t = rig(); expect(await t.ports.availability()).toEqual({ code: 'ready' });
  expect(await t.ports.prepare(1)).toEqual({ code: 'ready' }); t.speech().processLocally = false;
  expect(await t.ports.start(1)).toEqual({ code: 'local-unavailable' }); expect(t.speech().start).not.toHaveBeenCalled();
  expect(await t.ports.close(1)).toBe(true);
});
test('parcial não é resultado final; final segmentado completo não perde correção/segunda medição', async () => {
  const t = rig(); await t.listening(); const speech = t.speech();
  speech.onresult?.(event('120 por 80', false)); await flush(); expect(t.final).not.toHaveBeenCalled();
  speech.onresult?.({ resultIndex: 0, results: [result('doze por oito')] });
  speech.onresult?.({ resultIndex: 1, results: [result('doze por oito'), result('não, quatorze por nove')] });
  speech.onend?.(); await t.session.settled();
  expect(t.final.mock.calls[0][1].text).toBe('doze por oito não, quatorze por nove');
});
test('parcial sem final ou silêncio termina sem candidatos', async () => {
  const t = rig(); await t.listening(); t.speech().onresult?.(event('120 por 80', false)); t.speech().onend?.();
  await t.session.settled(); expect(t.final).not.toHaveBeenCalled(); expect(t.state().issue).toBe('no-result');
});
test.each(['alternatives','changed-final','gap','too-long','malformed'])('resultado %s não vira candidato', async variant => {
  const t = rig(); await t.listening(); const speech = t.speech();
  if (variant === 'alternatives') speech.onresult?.({ resultIndex: 0, results: [result('', true, ['doze por oito','treze por nove'])] });
  if (variant === 'changed-final') { speech.onresult?.(event('doze por oito')); speech.onresult?.(event('treze por nove')); }
  if (variant === 'gap') speech.onresult?.({ resultIndex: 1, results: [result('doze', false), result('por oito')] });
  if (variant === 'too-long') speech.onresult?.(event('x'.repeat(2001)));
  if (variant === 'malformed') speech.onresult?.({ results: 'SENTINELA' });
  speech.onend?.(); await t.session.settled(); expect(t.final).not.toHaveBeenCalled();
});
test.each(['not-allowed','service-not-allowed','language-not-supported','no-speech','network','audio-capture','aborted'])('erro %s é seguro e não reinicia', async error => {
  const t = rig(); await t.listening(); t.speech().onerror?.({ error, message: 'SENTINELA-CLINICA' });
  await t.session.settled(); expect(t.final).not.toHaveBeenCalled(); expect(t.speech().start).toHaveBeenCalledTimes(1);
  expect(t.speech().abort).toHaveBeenCalledTimes(1); expect(JSON.stringify(t.state())).not.toContain('SENTINELA');
});
test('concorrência global; abort aguarda onend e final tardio não restaura revisão', async () => {
  const t = rig(); await t.listening(); const speech = t.speech(); speech.abort.mockImplementation(() => {});
  const late = speech.onresult; const done = t.session.cancel(); await flush();
  const next = rig(); expect(next.session.start()).toBe(false); expect(next.state().issue).toBe('resource-busy');
  late?.(event('120 por 80')); expect(t.final).not.toHaveBeenCalled(); speech.onend?.(); await done;
  expect(speech.onresult).toBeNull(); expect(next.session.start()).toBe(true); await flush(); await next.session.cancel();
});
test('consulta local cancelada drena sem captura ou leitura tardia', async () => {
  const t = rig(); let available!: (value: unknown) => void;
  t.Speech.available.mockImplementation(() => new Promise(resolve => { available = resolve; }));
  t.session.start(); await flush(); const done = t.session.cancel(); await flush();
  expect(rig().session.start()).toBe(false); available('available'); await done;
  expect(t.speech().start).not.toHaveBeenCalled(); expect(t.final).not.toHaveBeenCalled(); expect(t.session.isReleased()).toBe(true);
});
test('terminar repetido não confirma; só onend entrega após final', async () => {
  const t = rig(); await t.listening(); expect(t.session.finish()).toBe(true); expect(t.session.finish()).toBe(false); await flush();
  expect(t.speech().stop).toHaveBeenCalledTimes(1); expect(t.final).not.toHaveBeenCalled();
  t.speech().onresult?.(event('doze por oito')); t.speech().onend?.(); await t.session.settled(); expect(t.final).toHaveBeenCalledTimes(1);
});
test.each(['no-ack','abort-throws'])('cleanup %s não declara liberação nem permite nova captura', async variant => {
  jest.useFakeTimers(); const t = rig(); await t.listening();
  t.speech().abort.mockImplementation(() => { if (variant === 'abort-throws') throw new Error('SENTINELA'); });
  const done = t.session.cancel(); await jest.advanceTimersByTimeAsync(10001); await done;
  expect(t.state()).toMatchObject({ phase: 'blocked', issue: 'cleanup-failed' }); expect(t.session.isReleased()).toBe(false);
  expect(rig().session.start()).toBe(false); expect(t.final).not.toHaveBeenCalled();
  t.speech().onend?.(); await flush(); expect(t.speech().onresult).toBeNull();
});
test('timeout de captura aborta e descarta final acumulado', async () => {
  jest.useFakeTimers(); const t = rig(); await t.listening(); t.speech().onresult?.(event('doze por oito'));
  await jest.advanceTimersByTimeAsync(35001); await t.session.settled(); expect(t.state().issue).toBe('timeout'); expect(t.final).not.toHaveBeenCalled();
});
test('desmontagem remove callbacks e ignora eventos antigos', async () => {
  const t = rig(); await t.listening(); const late = t.speech().onresult; t.session.dispose(); await t.session.settled();
  late?.(event('120 por 80')); expect(t.final).not.toHaveBeenCalled(); expect(t.speech().onstart).toBeNull();
});
