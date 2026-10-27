import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { loadAndroidVoiceBinding } from '@/services/recognition/voice-android';
import { VoiceCaptureError, type AndroidVoicePorts } from '@/services/recognition/voice-capture-contract';

import { useAndroidVoiceReview } from './useAndroidVoiceReview';

jest.mock('@/services/recognition/voice-android', () => ({ loadAndroidVoiceBinding: jest.fn() }));
jest.mock('@/features/readings/readings.repo', () => { throw new Error('Firebase proibido na avaliação'); });
jest.mock('@/features/readings/assisted-reading-writer', () => { throw new Error('Writer proibido na avaliação'); });
jest.mock('@/features/auth/useSession', () => { throw new Error('Auth proibida na avaliação'); });
const final = { kind: 'transcript', final: true, locale: 'pt-BR', capturedAtMs: 1793001600000, text: 'doze por oito, pulso setenta e dois' };
let listeners: ((state: AppStateStatus) => void)[];
beforeEach(() => {
  jest.clearAllMocks(); listeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => { listeners.push(listener); return { remove: jest.fn() }; });
});
afterEach(() => jest.restoreAllMocks());
async function flush() { for (let i = 0; i < 45; i++) await Promise.resolve(); }
async function setup() {
  let status: (event: unknown) => void = () => {};
  let deliver!: (value: unknown) => void;
  const unsubscribe = jest.fn();
  const ports: AndroidVoicePorts = { availability: jest.fn(async () => ({ code: 'ready' })), requestPermission: jest.fn(async () => true),
    prepare: jest.fn(async () => ({ code: 'ready' })), start: jest.fn(() => new Promise(resolve => { deliver = resolve; })),
    finish: jest.fn(async () => true), close: jest.fn(async () => true), listen: jest.fn(listener => { status = listener; return unsubscribe; }) };
  jest.mocked(loadAndroidVoiceBinding).mockReturnValue(ports);
  return { ...await renderHook(useAndroidVoiceReview), ports, unsubscribe, event: (event: unknown) => status(event), deliver: (value: unknown = final) => deliver(value) };
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
  expect(JSON.stringify(t.result.current)).not.toContain(final.text); expect(t.result.current.review.isPreviewOnly).toBe(true);
  expect(t.result.current.review.state.confirmed).toBeNull(); expect(t.ports.close).toHaveBeenCalledTimes(1);
  await act(async () => { t.result.current.review.edit('systolic', '135'); await t.result.current.review.confirm(); });
  expect(t.result.current.review.state.confirmed?.systolic).toBe(135);
});
test('background fecha e descarta resultado tardio sem reinício ao retornar', async () => {
  const t = await setup(); await start(t);
  await act(async () => { listeners.forEach(listener => listener('background')); await flush(); });
  await act(async () => { t.deliver(); listeners.forEach(listener => listener('active')); await flush(); });
  expect(t.result.current.state.phase).toBe('cancelled'); expect(t.result.current.review.state.draft).toBeNull();
  expect(t.ports.start).toHaveBeenCalledTimes(1); expect(t.ports.close).toHaveBeenCalledTimes(1);
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
