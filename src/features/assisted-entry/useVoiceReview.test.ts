import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { createAssistedConfirmation, type AssistedWriteContext } from '@/features/readings/confirmed-assisted-reading';

import { useVoiceReview } from './useVoiceReview';

const capturedAtMs = new Date('2026-01-02T10:30:00Z').getTime();
const final = (text: string) => ({ kind: 'transcript', locale: 'pt-BR', final: true, capturedAtMs, text });
beforeEach(() => { jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() }); });
afterEach(() => { jest.restoreAllMocks(); });

test('contrato final passa pelo parser, conserva início da fala e não confirma ao receber', async () => {
  const { result } = await renderHook(useVoiceReview);
  await act(() => { result.current.receiveFinal(result.current.newAttempt(), final('doze por oito'), 'synthetic'); });
  expect(result.current.state.draft).toEqual({ systolic: '120', diastolic: '80', pulse: '', note: '', measuredAt: new Date(capturedAtMs) });
  expect(result.current.state.phase).toBe('reviewing');
  expect(result.current.state.confirmed).toBeNull();
  expect(result.current.state).not.toHaveProperty('text');
});
test('decimais e pulso identificado chegam aos campos e são corrigíveis', async () => {
  const { result } = await renderHook(useVoiceReview);
  await act(() => { result.current.receiveFinal(result.current.newAttempt(),
    final('treze vírgula cinco por oito vírgula cinco, pulso setenta e dois'), 'synthetic'); });
  expect(result.current.state.draft).toMatchObject({ systolic: '135', diastolic: '85', pulse: '72' });
  await act(() => { result.current.edit('systolic', '140'); });
  await act(async () => { await result.current.confirm(); });
  expect(result.current.state.confirmed).toMatchObject({ systolic: 140, diastolic: 85, pulse: 72 });
});
test.each([
  null, {}, { ...final('120 por 80'), final: false }, { ...final('120 por 80'), locale: 'en-US' },
  { ...final('120 por 80'), capturedAtMs: NaN }, { ...final('120 por 80'), capturedAtMs: -1 },
  { ...final('120 por 80'), capturedAtMs: 1e20 }, { ...final('120 por 80'), text: 'x'.repeat(2001) },
])('resultado parcial/malformado é recusado antes da revisão (%j)', async value => {
  const { result } = await renderHook(useVoiceReview);
  await act(() => { expect(result.current.receiveFinal(result.current.newAttempt(), value, 'synthetic')).toBe(false); });
  expect(result.current.state.draft).toBeNull();
  expect(result.current.canConfirm).toBe(false);
  expect(result.current.inputIssue).toBe('Somente uma transcrição final válida em pt-BR pode ser revisada. Tente novamente.');
});
test.each(['', 'ruído', 'salvar', 'confirmar', '120 por 80 salvar'])('silêncio/comando/transcrição não autoriza confirmação: %s', async text => {
  const { result } = await renderHook(useVoiceReview);
  await act(() => { result.current.receiveFinal(result.current.newAttempt(), final(text), 'synthetic'); });
  expect(result.current.canConfirm).toBe(false);
  await act(async () => { expect(await result.current.confirm()).toBe(false); });
  expect(result.current.state.confirmed).toBeNull();
});
test.each([
  ['doze por oitenta', 'mixed-scale'], ['doze por oito, não, quatorze por nove', 'multiple-pairs'],
])('ambiguidade %s fica vazia até correção explícita', async (text, reason) => {
  const { result } = await renderHook(useVoiceReview);
  await act(() => { result.current.receiveFinal(result.current.newAttempt(), final(text), 'synthetic'); });
  expect(result.current.state.draft?.systolic).toBe('');
  expect(result.current.state.candidates?.fields.systolic).toEqual({ status: 'uncertain', reason });
  await act(() => { result.current.edit('systolic', '130'); result.current.edit('diastolic', '90'); });
  expect(result.current.canConfirm).toBe(true);
  expect(result.current.state.confirmed).toBeNull();
});
test('valor fora da faixa não é ajustado; erros impedem confirmação', async () => {
  const { result } = await renderHook(useVoiceReview);
  await act(() => { result.current.receiveFinal(result.current.newAttempt(), final('400 por 80, pulso 300'), 'synthetic'); });
  expect(result.current.state.draft?.systolic).toBe('400');
  expect(result.current.errors.systolic).toBeTruthy();
  expect(result.current.errors.pulse).toBeTruthy();
  expect(result.current.canConfirm).toBe(false);
});
test('resposta antiga, repetida ou parcial não sobrescreve correções', async () => {
  const { result } = await renderHook(useVoiceReview);
  let old = 0;
  await act(() => { old = result.current.newAttempt(); });
  await act(() => {
    const current = result.current.newAttempt();
    expect(result.current.receiveFinal(old, final('140 por 90'), 'synthetic')).toBe(false);
    expect(result.current.receiveFinal(current, { ...final('120 por 80'), final: false }, 'synthetic')).toBe(false);
    expect(result.current.receiveFinal(current, final('120 por 80'), 'synthetic')).toBe(true);
  });
  await act(() => { result.current.edit('systolic', '135'); });
  await act(() => { expect(result.current.receiveFinal(result.current.state.attempt, final('140 por 90'), 'synthetic')).toBe(false); });
  expect(result.current.state.draft?.systolic).toBe('135');
});
test.each(['cancel', 'newAttempt'] as const)('%s invalida confirmação pendente', async action => {
  const { result } = await renderHook(useVoiceReview);
  await act(() => { result.current.receiveFinal(result.current.newAttempt(), final('120 por 80'), 'synthetic'); });
  await act(async () => {
    const pending = result.current.confirm();
    result.current[action]();
    expect(await pending).toBe(false);
  });
  expect(result.current.state.confirmed).toBeNull();
  expect(result.current.state.draft).toBeNull();
});
test('duplo toque na simulação confirma uma vez', async () => {
  const { result } = await renderHook(useVoiceReview);
  await act(() => { result.current.receiveFinal(result.current.newAttempt(), final('120 por 80'), 'synthetic'); });
  await act(async () => { expect(await Promise.all([result.current.confirm(), result.current.confirm()])).toEqual([true, false]); });
});

function clinicalFlow() {
  const context: AssistedWriteContext = { uid: 'alice', epoch: {}, hasConsent: true, persistenceEnabled: true };
  const writer = jest.fn(async () => 'synthetic-id');
  const loadWriter = jest.fn(async () => writer);
  const confirmation = createAssistedConfirmation({ currentContext: () => context, loadWriter });
  return { context, writer, loadWriter, confirmation };
}
test('integração local com TASK-11 exige confirmação explícita e usa source voice', async () => {
  const flow = clinicalFlow();
  const { result } = await renderHook(() => useVoiceReview({ mode: 'recognition', confirmation: flow.confirmation }));
  await act(() => { result.current.receiveFinal(result.current.newAttempt(), final('doze por oito'), 'recognition'); });
  expect(flow.loadWriter).not.toHaveBeenCalled();
  await act(() => { result.current.edit('systolic', '135'); result.current.edit('note', 'Sintético'); });
  await act(async () => { expect(await result.current.confirm()).toBe(true); });
  expect(flow.writer).toHaveBeenCalledWith('alice', { systolic: 135, diastolic: 80, pulse: null,
    note: 'Sintético', measuredAt: new Date(capturedAtMs), source: 'voice', sessionReadings: null });
  expect(flow.writer).toHaveBeenCalledTimes(1);
});
test('fixture não entra no modo clínico; resultado real não entra no modo demonstrativo', async () => {
  const flow = clinicalFlow();
  const live = await renderHook(() => useVoiceReview({ mode: 'recognition', confirmation: flow.confirmation }));
  await act(() => { expect(live.result.current.receiveFinal(live.result.current.newAttempt(), final('120 por 80'), 'synthetic')).toBe(false); });
  expect(flow.loadWriter).not.toHaveBeenCalled();
  const demo = await renderHook(useVoiceReview);
  await act(() => { expect(demo.result.current.receiveFinal(demo.result.current.newAttempt(), final('120 por 80'), 'recognition')).toBe(false); });
  expect(demo.result.current.state.draft).toBeNull();
});
test('mudança de epoch entre revisão e confirmação impede escrita', async () => {
  const flow = clinicalFlow();
  const { result } = await renderHook(() => useVoiceReview({ mode: 'recognition', confirmation: flow.confirmation }));
  await act(() => { result.current.receiveFinal(result.current.newAttempt(), final('120 por 80'), 'recognition'); });
  flow.context.epoch = {};
  await act(async () => { expect(await result.current.confirm()).toBe(false); });
  expect(flow.writer).not.toHaveBeenCalled();
  expect(result.current.confirmationError).toBeTruthy();
});
test('background invalida o ticket clínico, desmontagem recusa callback retido', async () => {
  let onChange: ((state: AppStateStatus) => void) | undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => { onChange = listener; return { remove: jest.fn() }; });
  const flow = clinicalFlow();
  const { result, unmount } = await renderHook(() => useVoiceReview({ mode: 'recognition', confirmation: flow.confirmation }));
  let attempt = 0;
  await act(() => { attempt = result.current.newAttempt(); result.current.receiveFinal(attempt, final('120 por 80'), 'recognition'); });
  await act(() => { onChange?.('background'); onChange?.('active'); });
  expect(result.current.state.phase).toBe('cancelled');
  const retained = result.current;
  await unmount();
  expect(retained.receiveFinal(attempt, final('120 por 80'), 'recognition')).toBe(false);
  expect(await retained.confirm()).toBe(false);
  expect(flow.writer).not.toHaveBeenCalled();
});
test('não promove revisão sintética para clínica por mudança de props', async () => {
  const flow = clinicalFlow();
  const { result, rerender } = await renderHook(({ live }: { live: boolean }) => useVoiceReview(live
    ? { mode: 'recognition', confirmation: flow.confirmation } : { mode: 'simulation' }), { initialProps: { live: false } });
  await act(() => { result.current.receiveFinal(result.current.newAttempt(), final('120 por 80'), 'synthetic'); });
  await rerender({ live: true });
  await act(async () => { await result.current.confirm(); });
  expect(result.current.isSimulation).toBe(true);
  expect(flow.loadWriter).not.toHaveBeenCalled();
});
test('cancelar durante carga da porta clínica bloqueia escrita e resultado tardio', async () => {
  let release!: (writer: (uid: string, input: unknown) => Promise<string>) => void;
  const writer = jest.fn(async () => 'synthetic-id');
  const confirmation = createAssistedConfirmation({
    currentContext: () => ({ uid: 'alice', epoch, hasConsent: true, persistenceEnabled: true }),
    loadWriter: () => new Promise(resolve => { release = resolve; }),
  });
  const epoch = {};
  const { result } = await renderHook(() => useVoiceReview({ mode: 'recognition', confirmation }));
  await act(() => { result.current.receiveFinal(result.current.newAttempt(), final('120 por 80'), 'recognition'); });
  await act(async () => {
    const pending = result.current.confirm();
    result.current.cancel();
    release(writer);
    expect(await pending).toBe(false);
  });
  expect(writer).not.toHaveBeenCalled();
  expect(result.current.state.phase).toBe('cancelled');
});

test('preview aceita apenas contrato real e confirmação permanece em memória ao trocar props', async () => {
  const flow = clinicalFlow();
  const { result, rerender } = await renderHook(({ clinical }: { clinical: boolean }) => useVoiceReview(clinical
    ? { mode: 'recognition', confirmation: flow.confirmation } : { mode: 'preview' }), { initialProps: { clinical: false } });
  await act(() => {
    const id = result.current.newAttempt();
    expect(result.current.receiveFinal(id, final('doze por oito'), 'synthetic')).toBe(false);
    expect(result.current.receiveFinal(id, final('doze por oito'), 'recognition')).toBe(true);
  });
  await rerender({ clinical: true });
  await act(async () => { await result.current.confirm(); });
  expect(result.current.isPreviewOnly).toBe(true); expect(result.current.state.confirmed?.systolic).toBe(120);
  expect(flow.loadWriter).not.toHaveBeenCalled();
});
