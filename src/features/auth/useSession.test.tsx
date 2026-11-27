import { act, renderHook } from '@testing-library/react-native';
import { onIdTokenChanged, type User } from 'firebase/auth';
import type { ReactNode } from 'react';

import { auth } from '@/services/firebase';

import { ensureUserProfile } from './ensureUserProfile';
import { SessionProvider, useSession } from './useSession';

jest.mock('@/services/firebase', () => ({ auth: {} }));
jest.mock('firebase/auth', () => ({ onIdTokenChanged: jest.fn(), signOut: jest.fn() }));
jest.mock('./ensureUserProfile', () => ({ ensureUserProfile: jest.fn() }));
jest.mock('./signInWithGoogle', () => ({ signInWithGoogle: jest.fn() }));
const alice = { uid: 'alice-synthetic' } as User;
const bob = { uid: 'bob-synthetic' } as User;
let authChanged: (user: User | null) => void;
let pending: Map<string, () => void>;
const wrapper = ({ children }: { children: ReactNode }) => <SessionProvider>{children}</SessionProvider>;
beforeEach(() => {
  jest.clearAllMocks(); pending = new Map();
  Object.defineProperty(auth, 'currentUser', { value: null, configurable: true, writable: true });
  jest.mocked(onIdTokenChanged).mockImplementation((_auth, next) => {
    authChanged = user => {
      Object.defineProperty(auth, 'currentUser', { value: user });
      (next as (user: User | null) => void)(user);
    };
    return jest.fn();
  });
  jest.mocked(ensureUserProfile).mockImplementation(user => new Promise(resolve => { pending.set(user.uid, resolve); }));
});
async function flush() { for (let i = 0; i < 10; i++) await Promise.resolve(); }
test('sincronização de perfil atrasada não ressuscita usuário após logout', async () => {
  const { result } = await renderHook(useSession, { wrapper });
  await act(() => { authChanged(alice); authChanged(null); });
  await act(async () => { pending.get(alice.uid)!(); await flush(); });
  expect(result.current.user).toBeNull(); expect(result.current.isLoading).toBe(false);
});
test('conta anterior some durante troca e perfil atrasado não sobrescreve a conta nova', async () => {
  const { result } = await renderHook(useSession, { wrapper });
  await act(() => { authChanged(alice); });
  await act(async () => { pending.get(alice.uid)!(); await flush(); });
  expect(result.current.user?.uid).toBe(alice.uid);
  await act(() => { authChanged(bob); });
  expect(result.current.user).toBeNull(); expect(result.current.isLoading).toBe(true);
  await act(async () => { pending.get(bob.uid)!(); await flush(); });
  expect(result.current.user?.uid).toBe(bob.uid);
});
test('callbacks fora de ordem A→B não restauram A nem executam perfil após desmontar', async () => {
  const { result, unmount } = await renderHook(useSession, { wrapper });
  await act(() => { authChanged(alice); authChanged(bob); });
  await act(async () => { pending.get(bob.uid)!(); await flush(); pending.get(alice.uid)!(); await flush(); });
  expect(result.current.user?.uid).toBe(bob.uid);
  await unmount(); authChanged(alice); expect(ensureUserProfile).toHaveBeenCalledTimes(2);
});
test('logout seguido de login com o mesmo UID invalida o epoch imediatamente e cria outro', async () => {
  const { result } = await renderHook(useSession, { wrapper });
  await act(() => { authChanged(alice); });
  await act(async () => { pending.get(alice.uid)!(); await flush(); });
  const previous = result.current;
  expect(previous.sessionEpoch).not.toBeNull();
  expect(previous.getSessionEpoch()).toBe(previous.sessionEpoch);

  await act(() => {
    authChanged(null);
    authChanged(alice);
    expect(previous.getSessionEpoch()).toBeNull();
  });
  await act(async () => { pending.get(alice.uid)!(); await flush(); });
  expect(result.current.user?.uid).toBe(alice.uid);
  expect(result.current.getSessionEpoch()).toBe(result.current.sessionEpoch);
  expect(result.current.sessionEpoch).not.toBe(previous.sessionEpoch);
});

test('refresh conserva o epoch, enquanto um login que substitui o User do mesmo UID o renova', async () => {
  const { result } = await renderHook(useSession, { wrapper });
  await act(() => authChanged(alice));
  await act(async () => { pending.get(alice.uid)!(); await flush(); });
  const previous = result.current.sessionEpoch;

  await act(() => authChanged(alice));
  expect(result.current.sessionEpoch).toBe(previous);
  expect(ensureUserProfile).toHaveBeenCalledTimes(1);

  await act(() => authChanged({ ...alice }));
  expect(result.current.getSessionEpoch()).toBeNull();
  await act(async () => { pending.get(alice.uid)!(); await flush(); });
  expect(result.current.sessionEpoch).not.toBe(previous);
  expect(result.current.getSessionEpoch()).toBe(result.current.sessionEpoch);
});
