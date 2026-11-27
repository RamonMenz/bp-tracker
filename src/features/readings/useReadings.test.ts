import { act, renderHook } from '@testing-library/react-native';
import { onSnapshot, type FirestoreError, type QuerySnapshot } from 'firebase/firestore';

import { useSession } from '@/features/auth/useSession';
import { logError } from '@/lib/logger';

import { useReadings } from './useReadings';

jest.mock('@/features/auth/useSession', () => ({ useSession: jest.fn() }));
jest.mock('@/services/firebase', () => ({ firestore: {} }));
jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));
jest.mock('firebase/firestore', () => ({ collection: (_db: unknown, path: string) => path,
  query: (path: string) => path, orderBy: jest.fn(), onSnapshot: jest.fn() }));
let callbacks: { next: (snapshot: QuerySnapshot) => void; error: (error: FirestoreError) => void; unsubscribe: jest.Mock }[];
const alice = { uid: 'alice-synthetic' } as NonNullable<ReturnType<typeof useSession>['user']>;
const bob = { uid: 'bob-synthetic' } as NonNullable<ReturnType<typeof useSession>['user']>;
function account(user: typeof alice | null) { jest.mocked(useSession).mockReturnValue({ user, isLoading: false } as ReturnType<typeof useSession>); }
function snapshot(systolic = 120, patch: Record<string, unknown> = {}): QuerySnapshot {
  const data = { systolic, diastolic: 80, pulse: null, note: null, source: 'manual',
    createdAt: new Date('2026-01-01T10:00:00Z'), measuredAt: new Date('2026-01-01T10:00:00Z'), ...patch };
  return { docs: [{ id: 'synthetic-doc', data: () => data, metadata: { hasPendingWrites: false } }] } as unknown as QuerySnapshot;
}
beforeEach(() => {
  jest.clearAllMocks(); callbacks = []; account(alice);
  jest.mocked(onSnapshot).mockImplementation((...args: unknown[]) => {
    const unsubscribe = jest.fn(); callbacks.push({ next: args[2] as (s: QuerySnapshot) => void,
      error: args[3] as (e: FirestoreError) => void, unsubscribe }); return unsubscribe;
  });
});
test('trocar conta não expõe histórico anterior enquanto aguarda snapshot novo', async () => {
  const { result, rerender } = await renderHook(useReadings);
  await act(() => callbacks[0].next(snapshot(125)));
  expect(result.current.readings[0].systolic).toBe(125);
  account(bob); await rerender({});
  expect(result.current.readings).toEqual([]); expect(result.current.isLoading).toBe(true);
  expect(callbacks[0].unsubscribe).toHaveBeenCalledTimes(1);
  await act(() => callbacks[1].next(snapshot(135)));
  expect(result.current.readings[0].systolic).toBe(135);
});
test('callback e erro tardios da conta anterior não alteram a conta atual', async () => {
  const { result, rerender } = await renderHook(useReadings);
  account(bob); await rerender({}); await act(() => callbacks[1].next(snapshot(135)));
  await act(() => { callbacks[0].next(snapshot(190)); callbacks[0].error({ code: 'permission-denied', message: 'SENTINELA' } as FirestoreError); });
  expect(result.current.readings[0].systolic).toBe(135); expect(result.current.error).toBeNull();
  expect(logError).not.toHaveBeenCalled();
});
test('mesmo UID em outra sessão, logout e desmontagem invalidam listener antigo', async () => {
  const { result, rerender, unmount } = await renderHook(useReadings);
  await act(() => callbacks[0].next(snapshot()));
  account({ ...alice }); await rerender({}); expect(result.current.readings).toEqual([]);
  account(null); await rerender({}); await act(() => callbacks[1].next(snapshot(195)));
  expect(result.current.readings).toEqual([]); expect(result.current.isLoading).toBe(false);
  await unmount(); expect(callbacks[1].unsubscribe).toHaveBeenCalledTimes(1);
});
test('documento malformado e erro SDK não enviam mensagem bruta ao logger', async () => {
  const { result } = await renderHook(useReadings);
  await act(() => callbacks[0].next(snapshot(120, { measuredAt: { toDate: () => { throw new Error('SENTINELA-SINTETICA'); } } })));
  await act(() => callbacks[0].error({ code: 'permission-denied', message: 'SENTINELA-SINTETICA' } as FirestoreError));
  const errors = jest.mocked(logError).mock.calls.map(call => call[1] instanceof Error ? call[1].message : JSON.stringify(call[1]));
  expect(errors.join(' ')).not.toContain('SENTINELA');
  expect(result.current.error).toBe('Sem permissão para ver seu histórico. Faça login novamente.');
});
