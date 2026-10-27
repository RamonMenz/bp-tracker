import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import type { CandidateSet } from '@/domain/assisted-entry';

import { usePhotoReview } from './usePhotoReview';

const capturedAtMs = new Date(2026, 0, 2, 10, 30).getTime();
const fixture = (): CandidateSet => ({ modality: 'photo', capturedAtMs, fields: {
  systolic: { status: 'candidate', value: 120, basis: 'label' },
  diastolic: { status: 'candidate', value: 80, basis: 'label' }, pulse: { status: 'missing' },
} });

beforeEach(() => {
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
});
afterEach(() => { jest.restoreAllMocks(); });

test('receber candidatos não confirma; preservar instante e permitir edição', async () => {
  const { result } = await renderHook(usePhotoReview);
  await act(() => { result.current.receive(result.current.recapture(), fixture()); });
  expect(result.current.state.phase).toBe('reviewing');
  expect(result.current.state.confirmed).toBeNull();
  expect(result.current.state.draft?.measuredAt.getTime()).toBe(capturedAtMs);
  await act(() => { result.current.edit('systolic', '130'); result.current.edit('note', 'Sintético'); });
  await act(async () => { await result.current.confirm(); });
  expect(result.current.state.confirmed).toEqual({ systolic: 130, diastolic: 80, pulse: null,
    note: 'Sintético', measuredAt: new Date(capturedAtMs) });
  expect(result.current.state.candidates).toBeNull();
  expect(result.current.state.draft).toBeNull();
});

test('confirma uma única vez mesmo com chamadas no mesmo ciclo', async () => {
  const { result } = await renderHook(usePhotoReview);
  await act(() => { result.current.receive(result.current.recapture(), fixture()); });
  let results: boolean[] = [];
  await act(async () => { results = await Promise.all([result.current.confirm(), result.current.confirm()]); });
  expect(results).toEqual([true, false]);
  await act(async () => { expect(await result.current.confirm()).toBe(false); });
});

test.each(['cancel', 'recapture'] as const)('%s invalida confirmação pendente e resposta tardia', async action => {
  const { result } = await renderHook(usePhotoReview);
  let ticket = 0;
  await act(() => { ticket = result.current.recapture(); result.current.receive(ticket, fixture()); });
  await act(async () => {
    const confirmation = result.current.confirm();
    result.current[action]();
    expect(result.current.receive(ticket, fixture())).toBe(false);
    expect(await confirmation).toBe(false);
  });
  expect(result.current.state.confirmed).toBeNull();
  expect(result.current.state.draft).toBeNull();
});

test('resposta repetida não sobrescreve correção; tentativa antiga não restaura revisão', async () => {
  const { result } = await renderHook(usePhotoReview);
  let old = 0;
  await act(() => { old = result.current.recapture(); result.current.receive(old, fixture()); });
  await act(() => { result.current.edit('systolic', '125'); });
  await act(() => { expect(result.current.receive(old, fixture())).toBe(false); });
  expect(result.current.state.draft?.systolic).toBe('125');
  await act(() => { result.current.recapture(); expect(result.current.receive(old, fixture())).toBe(false); });
  expect(result.current.state.draft).toBeNull();
});

test.each([
  ['systolic', ''], ['systolic', '49'], ['systolic', '301'], ['systolic', '120.5'],
  ['diastolic', '201'], ['diastolic', '120'], ['pulse', '19'], ['pulse', '251'],
  ['pulse', '72.5'], ['note', 'x'.repeat(281)], ['measuredAt', new Date(Date.now() + 120000)],
  ['measuredAt', new Date(NaN)],
] as const)('bloqueia %s inválido (%s) usando schema existente', async (key, value) => {
  const { result } = await renderHook(usePhotoReview);
  await act(() => { result.current.receive(result.current.recapture(), fixture()); });
  await act(() => { result.current.edit(key, value); });
  expect(result.current.canConfirm).toBe(false);
  expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);
  await act(async () => { expect(await result.current.confirm()).toBe(false); });
  expect(result.current.state.confirmed).toBeNull();
});

test('incerteza obrigatória começa vazia e correção libera confirmação; pulso ausente não vira zero', async () => {
  const { result } = await renderHook(usePhotoReview);
  const partial = fixture();
  const candidates: CandidateSet = { ...partial, fields: { ...partial.fields,
    systolic: { status: 'uncertain', reason: 'ambiguous-label' } } };
  await act(() => { result.current.receive(result.current.recapture(), candidates); });
  expect(result.current.state.draft?.systolic).toBe('');
  expect(result.current.canConfirm).toBe(false);
  await act(() => { result.current.edit('systolic', '135'); });
  expect(result.current.canConfirm).toBe(true);
});

test('background limpa candidatos e invalida confirmação; voltar não restaura', async () => {
  let onChange: ((state: AppStateStatus) => void) | undefined;
  const remove = jest.fn();
  const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    onChange = listener;
    return { remove };
  });
  const { result, unmount } = await renderHook(usePhotoReview);
  await act(() => { result.current.receive(result.current.recapture(), fixture()); });
  await act(async () => {
    const confirmation = result.current.confirm();
    onChange?.('background');
    expect(await confirmation).toBe(false);
  });
  await act(() => { onChange?.('active'); });
  expect(result.current.state.phase).toBe('cancelled');
  expect(result.current.state.confirmed).toBeNull();
  await unmount();
  expect(remove).toHaveBeenCalled();
  spy.mockRestore();
});

test('desmontar invalida referência retida e novas confirmações', async () => {
  const { result, unmount } = await renderHook(usePhotoReview);
  await act(() => { result.current.receive(result.current.recapture(), fixture()); });
  const controller = result.current;
  await unmount();
  expect(await controller.confirm()).toBe(false);
  expect(controller.receive(controller.recapture(), fixture())).toBe(false);
});
