import { act, renderHook } from '@testing-library/react-native';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { ReactNode } from 'react';

import { ensureUserProfile } from './ensureUserProfile';
import { SessionProvider, useSession } from './useSession';

jest.mock('@/services/firebase', () => ({ auth: {} }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn(), signOut: jest.fn() }));
jest.mock('./ensureUserProfile', () => ({ ensureUserProfile: jest.fn() }));
jest.mock('./signInWithGoogle', () => ({ signInWithGoogle: jest.fn() }));
const alice = { uid: 'alice-synthetic' } as User;
const bob = { uid: 'bob-synthetic' } as User;
let authChanged: (user: User | null) => void;
let pending: Map<string, () => void>;
const wrapper = ({ children }: { children: ReactNode }) => <SessionProvider>{children}</SessionProvider>;
beforeEach(() => {
  jest.clearAllMocks(); pending = new Map();
  jest.mocked(onAuthStateChanged).mockImplementation((_auth, next) => { authChanged = next as (user: User | null) => void; return jest.fn(); });
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
