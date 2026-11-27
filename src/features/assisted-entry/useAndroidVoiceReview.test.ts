import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { loadAndroidVoiceBinding } from '@/services/recognition/voice-android';
import { VoiceCaptureError, type AndroidVoicePorts } from '@/services/recognition/voice-capture-contract';

import { useAndroidVoiceReview } from './useAndroidVoiceReview';

jest.mock('@/services/recognition/voice-android', () => ({ loadAndroidVoiceBinding: jest.fn() }));
jest.mock('@/features/readings/readings.repo', () => { throw new Error('Firebase proibido na avaliação'); });
jest.mock('@/features/readings/assisted-reading-writer', () => { throw new Error('Writer proibido na avaliação'); });
jest.mock('@/features/auth/useSession', () => { throw new Error('Auth proibida na avaliação'); });
const final = { kind: 'transcript-hypotheses', final: true, locale: 'pt-BR', capturedAtMs: 1793001600000,
  hypotheses: ['doze por oito, pulso setenta e dois'] };
let listeners: ((state: AppStateStatus) => void)[];
beforeEach(() => {
  jest.clearAllMocks(); listeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => { listeners.push(listener); return { remove: jest.fn() }; });
});
afterEach(() => jest.restoreAllMocks());
async function flush() { for (let i = 0; i < 45; i++) await Promise.resolve(); }
async function setup(onDiagnostic?: Parameters<typeof useAndroidVoiceReview>[0]) {
  let status: (event: unknown) => void = () => {};
  let deliver!: (value: unknown) => void;
  const unsubscribe = jest.fn();
  const ports: AndroidVoicePorts = { availability: jest.fn(async () => ({ code: 'ready' })), requestPermission: jest.fn(async () => true),
    prepare: jest.fn(async () => ({ code: 'ready' })), start: jest.fn(() => new Promise(resolve => { deliver = resolve; })),
    finish: jest.fn(async () => true), close: jest.fn(async () => true), listen: jest.fn(listener => { status = listener; return unsubscribe; }) };
  jest.mocked(loadAndroidVoiceBinding).mockReturnValue(ports);
  return { ...await renderHook(() => useAndroidVoiceReview(onDiagnostic)), ports, unsubscribe,
    event: (event: unknown) => status(event), deliver: (value: unknown = final) => deliver(value) };
}
async function start(t: Awaited<ReturnType<typeof setup>>) {
  await act(async () => { t.result.current.start(); await flush(); });
  await act(() => { t.event({ attemptId: t.result.current.state.attemptId, status: 'listening' }); });
}
test('porta final -> parser TASK-14 -> revisão TASK-15; só gesto explícito confirma em memória', async () => {
  const t = await setup(); expect(loadAndroidVoiceBinding).not.toHaveBeenCalled();
  await start(t); expect(t.result.current.state.phase).toBe('listening'); expect(t.result.current.review.state.draft).toBeNull();
  await act(() => { t.result.current.finish(); }); expect(t.result.current.review.state.confirmed).toBeNull();
  await act(async () => { t.deliver(); await flush(); });
  expect(t.result.current.review.state.draft).toMatchObject({ systolic: '120', diastolic: '80', pulse: '72', measuredAt: new Date(final.capturedAtMs) });
  expect(JSON.stringify(t.result.current)).not.toContain(final.hypotheses[0]); expect(t.result.current.review.isPreviewOnly).toBe(true);
  expect(t.result.current.review.state.confirmed).toBeNull(); expect(t.ports.close).toHaveBeenCalledTimes(1);
  await act(async () => { t.result.current.review.edit('systolic', '135'); await t.result.current.review.confirm(); });
  expect(t.result.current.review.state.confirmed?.systolic).toBe(135);
});
test('grafias diferentes com a mesma interpretação abrem revisão sem confirmar', async () => {
  const onDiagnostic = jest.fn();
  const t = await setup(onDiagnostic); await start(t);
  await act(async () => { t.deliver({ ...final, hypotheses: ['12 por 8', 'doze por oito'] }); await flush(); });
  expect(t.result.current.state).toMatchObject({ phase: 'reviewing', issue: null });
  expect(t.result.current.review.state.draft).toMatchObject({ systolic: '120', diastolic: '80', pulse: '', note: '' });
  expect(t.result.current.review.state.confirmed).toBeNull();
  expect(onDiagnostic.mock.calls).toEqual([[null], [{ count: 2, agreed: true }]]);
});
test.each([
  ['12 por 8', 'doze por oito', 'treze por nove'],
  ['SENTINELA-HIPOTESE-VAZIA', 'doze por oito'],
  ['doze por oito', '12 por 8, pulso 72'],
  ['doze por oito', '120 por 80'], // Valores iguais, bases de interpretação diferentes.
])('divergência no conjunto recusa a revisão (%#)', async (...hypotheses) => {
  const t = await setup(); await start(t);
  await act(async () => { t.deliver({ ...final, hypotheses }); await flush(); });
  expect(t.result.current.state).toMatchObject({ phase: 'failed', issue: 'ambiguous-result' });
  expect(t.result.current.review.state).toMatchObject({ phase: 'cancelled', draft: null, candidates: null });
  expect(t.result.current.review.canConfirm).toBe(false);
});
test('interpretações vazias que concordam preservam revisão vazia sem confirmação', async () => {
  const t = await setup(); await start(t);
  await act(async () => { t.deliver({ ...final, hypotheses: ['SENTINELA-INICIO', 'SENTINELA-FIM'] }); await flush(); });
  expect(t.result.current.state.phase).toBe('reviewing');
  expect(t.result.current.review.state.draft).toMatchObject({ systolic: '', diastolic: '', pulse: '', note: '' });
  expect(t.result.current.review.canConfirm).toBe(false);
  expect(JSON.stringify(t.result.current)).not.toContain('SENTINELA');
});
test('diagnóstico de divergência contém só faixa e concordância; hipóteses e erro bruto ficam fora do estado e dos logs', async () => {
  const onDiagnostic = jest.fn();
  const logs = (['log', 'info', 'warn', 'error', 'debug'] as const).map(method => jest.spyOn(console, method));
  const t = await setup(onDiagnostic); await start(t);
  const hypotheses = ['SENTINELA-HIPOTESE-UM', 'SENTINELA-HIPOTESE-DOIS', 'doze por oito'];
  await act(async () => { t.deliver({ ...final, hypotheses, message: 'SENTINELA-ERRO-BRUTO' }); await flush(); });
  expect(t.result.current.state.issue).toBe('ambiguous-result');
  expect(onDiagnostic.mock.calls).toEqual([[null], [{ count: '3+', agreed: false }]]);
  expect(JSON.stringify([t.result.current, logs.flatMap(log => log.mock.calls)])).not.toMatch(/SENTINELA|doze por oito/);
});
test('background fecha e descarta resultado tardio sem reinício ao retornar', async () => {
  const onDiagnostic = jest.fn();
  const t = await setup(onDiagnostic); await start(t);
  await act(async () => { listeners.forEach(listener => listener('background')); await flush(); });
  await act(async () => { t.deliver(); listeners.forEach(listener => listener('active')); await flush(); });
  expect(t.result.current.state.phase).toBe('cancelled'); expect(t.result.current.review.state.draft).toBeNull();
  expect(onDiagnostic.mock.calls).toEqual([[null], [null]]);
  expect(t.ports.start).toHaveBeenCalledTimes(1); expect(t.ports.close).toHaveBeenCalledTimes(1);
});
test('concessão após o diálogo interrompido só permite preparar em uma nova ação', async () => {
  const t = await setup();
  let grant!: (value: boolean) => void;
  jest.mocked(t.ports.requestPermission).mockImplementationOnce(() => new Promise(resolve => { grant = resolve; }));

  await act(async () => { t.result.current.start(); await flush(); });
  expect(t.result.current.state.phase).toBe('permission');
  await act(async () => { listeners.forEach(listener => listener('background')); await flush(); });
  await act(async () => { grant(true); listeners.forEach(listener => listener('active')); await flush(); });
  expect(t.result.current.state).toMatchObject({ phase: 'cancelled', issue: 'cancelled' });
  expect(t.ports.prepare).not.toHaveBeenCalled();
  expect(t.ports.start).not.toHaveBeenCalled();

  await start(t);
  expect(t.result.current.state.phase).toBe('listening');
  expect(t.ports.prepare).toHaveBeenCalledTimes(1);
  expect(t.ports.start).toHaveBeenCalledTimes(1);
  await act(async () => { t.result.current.review.cancel(); await flush(); });
});
test('módulo ausente mostra indisponibilidade segura sem solicitar microfone', async () => {
  const t = await setup(); jest.mocked(loadAndroidVoiceBinding).mockImplementation(() => { throw new VoiceCaptureError('unsupported'); });
  await act(async () => { t.result.current.start(); await flush(); });
  expect(t.result.current.state).toMatchObject({ phase: 'failed', issue: 'unsupported' });
  expect(t.ports.requestPermission).not.toHaveBeenCalled(); expect(t.result.current.review.state.draft).toBeNull();
});
test('API sem idioma comprovável fica indisponível antes da permissão', async () => {
  const t = await setup(); jest.mocked(t.ports.availability).mockResolvedValue({ code: 'language-unverified' });
  await act(async () => { t.result.current.start(); await flush(); });
  expect(t.result.current.state.issue).toBe('language-unverified'); expect(t.ports.requestPermission).not.toHaveBeenCalled();
});
test('nova tentativa descarta revisão; repetição não abre duas escutas', async () => {
  const t = await setup(); await start(t);
  await act(async () => { t.deliver(); await flush(); });
  await act(async () => { t.result.current.review.recapture(); t.result.current.start(); await flush(); });
  expect(t.result.current.review.state.draft).toBeNull(); expect(t.ports.start).toHaveBeenCalledTimes(2);
  await act(async () => { t.result.current.review.cancel(); await flush(); });
});
test('desmontagem remove listener, fecha mic e ignora retorno final', async () => {
  const t = await setup(); await start(t); await t.unmount(); await flush(); t.deliver(); await flush();
  expect(t.unsubscribe).toHaveBeenCalledTimes(1); expect(t.ports.close).toHaveBeenCalledTimes(1);
});
test('sair para manual só informa liberação depois do ACK, inclusive após desmontar voz', async () => {
  const t = await setup(); await start(t);
  let acknowledge!: (value: boolean) => void;
  jest.mocked(t.ports.close).mockImplementation(() => new Promise(resolve => { acknowledge = resolve; }));
  let released!: Promise<boolean>;
  await act(async () => { released = t.result.current.leaveForManual(); await flush(); });
  await t.unmount(); acknowledge(false);
  expect(await released).toBe(false); expect(t.ports.close).toHaveBeenCalledTimes(1);
});
