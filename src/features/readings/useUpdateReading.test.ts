import { act, renderHook } from '@testing-library/react-native';

import { useSession } from '@/features/auth/useSession';

import type { ReadingFormValues } from './useAddReading';
import { updateReading } from './readings.repo';
import { useUpdateReading } from './useUpdateReading';

// useUpdateReading fala direto com useSession e com o repositório — puxar a stack real de
// Firebase/Google Sign-In num teste de hook não agrega nada aqui, então ambos são trocados por
// stubs. O jest.fn() nasce dentro da própria factory (em vez de referenciar uma const externa)
// para não depender da ordem de hoisting do babel-plugin-jest-hoist; a referência usada nos
// testes é obtida importando o binding (já mockado) de volta.
jest.mock('@/features/auth/useSession', () => ({ useSession: jest.fn() }));
jest.mock('./readings.repo', () => ({ updateReading: jest.fn() }));

const mockUseSession = useSession as jest.Mock;
const mockUpdateReading = updateReading as jest.Mock;

const VALID_VALUES: ReadingFormValues = {
  systolic: '120',
  diastolic: '80',
  pulse: '70',
  note: '',
  measuredAt: new Date('2026-08-14T08:00:00'),
};

function signedInAs(uid: string) {
  mockUseSession.mockReturnValue({
    user: { uid },
    isLoading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  });
}

describe('useUpdateReading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('valida, chama o repositório com o uid/id certos e retorna sucesso', async () => {
    signedInAs('user-1');
    mockUpdateReading.mockResolvedValue(undefined);

    const { result } = await renderHook(() => useUpdateReading());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.updateReading('reading-1', VALID_VALUES);
    });

    expect(success).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.isSaving).toBe(false);
    expect(mockUpdateReading).toHaveBeenCalledTimes(1);
    expect(mockUpdateReading).toHaveBeenCalledWith(
      'user-1',
      'reading-1',
      expect.objectContaining({ systolic: 120, diastolic: 80 }),
    );
  });

  it('retorna erro amigável e não chama o repositório quando não há usuário autenticado', async () => {
    mockUseSession.mockReturnValue({ user: null, isLoading: false, signIn: jest.fn(), signOut: jest.fn() });

    const { result } = await renderHook(() => useUpdateReading());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.updateReading('reading-1', VALID_VALUES);
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Sessão expirada. Faça login novamente.');
    expect(mockUpdateReading).not.toHaveBeenCalled();
  });

  it('retorna erro de validação amigável e não chama o repositório quando a sistólica não é maior que a diastólica', async () => {
    signedInAs('user-1');

    const { result } = await renderHook(() => useUpdateReading());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.updateReading('reading-1', { ...VALID_VALUES, systolic: '80', diastolic: '120' });
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('A sistólica deve ser maior que a diastólica.');
    expect(mockUpdateReading).not.toHaveBeenCalled();
  });

  it('propaga a mensagem amigável lançada pelo repositório, nunca o texto cru do erro', async () => {
    signedInAs('user-1');
    mockUpdateReading.mockRejectedValue(new Error('Sem permissão para salvar. Faça login novamente.'));

    const { result } = await renderHook(() => useUpdateReading());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.updateReading('reading-1', VALID_VALUES);
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Sem permissão para salvar. Faça login novamente.');
  });
});
