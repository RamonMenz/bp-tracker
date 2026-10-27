import type { FinalTranscript } from '@/domain/assisted-entry';

import type { createAndroidVoiceSession as Create, VoiceState } from './android-voice-session';
import type { AndroidVoicePorts } from './voice-capture-contract';

const final: FinalTranscript = { kind: 'transcript', final: true, locale: 'pt-BR', capturedAtMs: 1793001600000, text: 'doze por oito, pulso setenta e dois' };
let create: typeof Create;
beforeEach(() => { jest.resetModules(); create = jest.requireActual<typeof import('./android-voice-session')>('./android-voice-session').createAndroidVoiceSession; });
afterEach(() => jest.useRealTimers());
async function flush() { for (let i = 0; i < 35; i++) await Promise.resolve(); }
function rig() {
  let state: VoiceState = { phase: 'idle', attemptId: 0, issue: null };
  let listener: (event: unknown) => void = () => {};
  let deliver!: (value: unknown) => void;
  const unsubscribe = jest.fn();
  const ports: AndroidVoicePorts = { availability: jest.fn(async () => ({ code: 'ready' })), requestPermission: jest.fn(async () => true),
    prepare: jest.fn(async () => ({ code: 'ready' })), start: jest.fn(() => new Promise(resolve => { deliver = resolve; })),
    finish: jest.fn(async () => true), close: jest.fn(async () => true), listen: jest.fn(callback => { listener = callback; return unsubscribe; }) };
  const result = jest.fn();
  const session = create(ports, next => { state = next; }, result);
  return { session, ports, result, unsubscribe, state: () => state,
    event: (event: unknown) => listener(event), deliver: (value: unknown = final) => deliver(value),
    listening: async () => { session.start(); await flush(); listener({ attemptId: state.attemptId, status: 'listening' }); } };
}

test('carrega disponibilidade/idioma antes de escutar, só por ação; final só após close', async () => {
  const t = rig(); expect(t.ports.availability).not.toHaveBeenCalled();
  await t.listening(); expect(t.state().phase).toBe('listening');
  expect(t.ports.prepare).toHaveBeenCalledWith(t.state().attemptId);
  let release!: (value: boolean) => void;
  jest.mocked(t.ports.close).mockImplementation(() => new Promise(resolve => { release = resolve; }));
  t.deliver(); await flush(); expect(t.state().phase).toBe('closing'); expect(t.result).not.toHaveBeenCalled();
  release(true); await t.session.settled();
  expect(t.result).toHaveBeenCalledWith(t.state().attemptId, final); expect(t.state().phase).toBe('reviewing');
  expect(t.unsubscribe).toHaveBeenCalledTimes(1);
});
test.each(['local-unavailable','language-unverified'])('API %s não solicita permissão, idioma ou microfone', async code => {
  const t = rig(); jest.mocked(t.ports.availability).mockResolvedValue({ code });
  t.session.start(); await t.session.settled();
  expect(t.state().issue).toBe(code); expect(t.ports.requestPermission).not.toHaveBeenCalled(); expect(t.ports.start).not.toHaveBeenCalled();
});
test('pt-BR ausente ou apenas disponível online não autoriza começar', async () => {
  const t = rig(); jest.mocked(t.ports.prepare).mockResolvedValue({ code: 'model-missing', onlineLanguages: ['pt-BR'] });
  t.session.start(); await t.session.settled(); expect(t.state().issue).toBe('model-missing');
  expect(t.ports.start).not.toHaveBeenCalled(); expect(t.result).not.toHaveBeenCalled();
});
test('recusa de permissão não cria reconhecedor nem repete solicitação', async () => {
  const t = rig(); jest.mocked(t.ports.requestPermission).mockResolvedValue(false);
  t.session.start(); await t.session.settled(); expect(t.state().issue).toBe('permission-denied');
  expect(t.ports.prepare).not.toHaveBeenCalled(); expect(t.ports.start).not.toHaveBeenCalled();
  expect(t.ports.requestPermission).toHaveBeenCalledTimes(1);
});
test('parciais/eventos/IDs antigos não entregam candidatos; terminar repetido não confirma', async () => {
  const t = rig(); await t.listening(); const id = t.state().attemptId;
  t.event({ attemptId: id - 1, status: 'recognizing' }); expect(t.state().phase).toBe('listening');
  t.event({ attemptId: id, status: 'partial', text: final.text }); expect(t.result).not.toHaveBeenCalled();
  expect(t.session.finish()).toBe(true); expect(t.session.finish()).toBe(false); await flush();
  expect(t.ports.finish).toHaveBeenCalledTimes(1); expect(t.result).not.toHaveBeenCalled();
  t.event({ attemptId: id, status: 'listening' }); expect(t.state().phase).toBe('recognizing');
  t.deliver(); await t.session.settled(); expect(t.result).toHaveBeenCalledTimes(1);
});
test.each(['no-result','interrupted','ambiguous-result','engine-failed','permission-denied','model-missing'])('erro %s fecha sem resultado ou nova escuta', async code => {
  const t = rig(); await t.listening(); t.deliver({ code, message: 'SENTINELA-CLINICA' }); await t.session.settled();
  expect(t.state().issue).toBe(code); expect(t.result).not.toHaveBeenCalled(); expect(JSON.stringify(t.state())).not.toContain('SENTINELA');
  expect(t.ports.start).toHaveBeenCalledTimes(1); expect(t.ports.close).toHaveBeenCalledTimes(1);
});
test.each([null, { ...final, final: false }, { ...final, locale: 'pt-PT' }, { ...final, text: 'x'.repeat(2001) }])('saída inválida/parcial não atravessa fronteira final: %#', async value => {
  const t = rig(); await t.listening(); t.deliver(value); await t.session.settled();
  expect(t.state().issue).toBe('engine-failed'); expect(t.result).not.toHaveBeenCalled();
});
test('cancelar enquanto escuta invalida final tardio e libera antes de nova tentativa', async () => {
  const t = rig(); await t.listening(); expect(t.session.start()).toBe(false);
  await t.session.cancel(); t.deliver(); await flush(); expect(t.result).not.toHaveBeenCalled();
  expect(t.state().phase).toBe('cancelled'); expect(t.ports.close).toHaveBeenCalledTimes(1);
  expect(t.session.start()).toBe(true); await flush(); await t.session.cancel();
});
test('cancelar preparação não deixa resposta ready tardia abrir microfone', async () => {
  const t = rig(); let ready!: (value: unknown) => void;
  jest.mocked(t.ports.prepare).mockImplementation(() => new Promise(resolve => { ready = resolve; }));
  t.session.start(); await flush(); await t.session.cancel(); ready({ code: 'ready' }); await flush();
  expect(t.ports.start).not.toHaveBeenCalled(); expect(t.result).not.toHaveBeenCalled();
});
test('permissão tardia mantém exclusão global até retorno; nunca inicia reconhecedor', async () => {
  const t = rig(); let grant!: (value: boolean) => void;
  jest.mocked(t.ports.requestPermission).mockImplementation(() => new Promise(resolve => { grant = resolve; }));
  t.session.start(); await flush(); const closing = t.session.cancel(); await flush();
  const next = rig(); expect(next.session.start()).toBe(false); expect(next.state().issue).toBe('resource-busy');
  grant(true); await closing; expect(t.ports.prepare).not.toHaveBeenCalled();
  expect(next.session.start()).toBe(true); await flush(); await next.session.cancel();
});
test('timeout de permissão fica bloqueado sem abrir outra solicitação; retorno drena lease', async () => {
  jest.useFakeTimers(); const t = rig(); let grant!: (value: boolean) => void;
  jest.mocked(t.ports.requestPermission).mockImplementation(() => new Promise(resolve => { grant = resolve; }));
  t.session.start(); await flush(); await jest.advanceTimersByTimeAsync(40001); await t.session.settled();
  expect(t.state()).toMatchObject({ phase: 'blocked', issue: 'cleanup-failed' });
  const next = rig(); expect(next.session.start()).toBe(false); grant(true); await flush();
  expect(t.ports.start).not.toHaveBeenCalled(); expect(next.session.start()).toBe(true); await flush(); await next.session.cancel();
});
test('timeout de fala fecha e não entrega final que chegou depois', async () => {
  jest.useFakeTimers(); const t = rig(); await t.listening(); await jest.advanceTimersByTimeAsync(35001); await t.session.settled();
  expect(t.state().issue).toBe('timeout'); t.deliver(); await flush(); expect(t.result).not.toHaveBeenCalled();
});
test.each(['false','rejection','timeout'])('cleanup %s bloqueia reutilização global, sem alegar liberação', async mode => {
  jest.useFakeTimers(); const t = rig(); await t.listening();
  if (mode === 'false') jest.mocked(t.ports.close).mockResolvedValue(false);
  if (mode === 'rejection') jest.mocked(t.ports.close).mockRejectedValue(new Error('SENTINELA'));
  if (mode === 'timeout') jest.mocked(t.ports.close).mockImplementation(() => new Promise(() => {}));
  const done = t.session.cancel(); await jest.advanceTimersByTimeAsync(10001); await done;
  expect(t.state()).toMatchObject({ phase: 'blocked', issue: 'cleanup-failed' }); expect(t.session.start()).toBe(false);
  expect(rig().session.start()).toBe(false); expect(t.result).not.toHaveBeenCalled();
});
test('falha ao terminar fecha, sem transcrição ou erro bruto', async () => {
  const t = rig(); await t.listening(); jest.mocked(t.ports.finish).mockRejectedValue(new Error('SENTINELA'));
  t.session.finish(); await t.session.settled(); expect(t.state().issue).toBe('engine-failed'); expect(t.result).not.toHaveBeenCalled();
});
test('desmontar não publica estados/resultados tardios', async () => {
  const t = rig(); await t.listening(); t.session.dispose(); await t.session.settled(); const last = t.state();
  t.deliver(); await flush(); expect(t.state()).toBe(last); expect(t.result).not.toHaveBeenCalled(); expect(t.unsubscribe).toHaveBeenCalled();
});
test('falha na entrega ao parser/revisão permanece segura após liberação', async () => {
  const t = rig(); t.result.mockImplementation(() => { throw new Error('SENTINELA-CLINICA'); });
  await t.listening(); t.deliver(); await t.session.settled();
  expect(t.state()).toMatchObject({ phase: 'failed', issue: 'engine-failed' });
  expect(JSON.stringify(t.state())).not.toContain('SENTINELA'); expect(t.ports.close).toHaveBeenCalledTimes(1);
});
