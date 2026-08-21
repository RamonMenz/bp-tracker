import { act, renderHook } from '@testing-library/react-native';

import { useSession } from '@/features/auth/useSession';
import { getAllReadings, type ReadingDateRange } from '@/features/readings/readings.repo';
import { readingsToCsv } from '@/lib/csv';
import { saveAndShareCsv } from '@/lib/file';
import type { Reading } from '@/types/models';

import { useExportCsv } from './useExportCsv';

// useExportCsv fala direto com useSession, o repositório e as duas fronteiras de I/O (csv/file) —
// mesmo padrão de useUpdateReading.test.ts: puxar a stack real de auth/Firebase/sistema de
// arquivos num teste de hook não agrega nada aqui, então os quatro viram stubs.
jest.mock('@/features/auth/useSession', () => ({ useSession: jest.fn() }));
jest.mock('@/features/readings/readings.repo', () => ({ getAllReadings: jest.fn() }));
jest.mock('@/lib/csv', () => ({ readingsToCsv: jest.fn() }));
jest.mock('@/lib/file', () => ({ saveAndShareCsv: jest.fn() }));

const mockUseSession = useSession as jest.Mock;
const mockGetAllReadings = getAllReadings as jest.Mock;
const mockReadingsToCsv = readingsToCsv as jest.Mock;
const mockSaveAndShareCsv = saveAndShareCsv as jest.Mock;

const READING: Reading = {
  systolic: 120,
  diastolic: 80,
  pulse: 70,
  measuredAt: new Date(2026, 7, 13, 8, 30, 0),
  createdAt: new Date(2026, 7, 13, 8, 30, 0),
  note: null,
  source: 'manual',
};

const RANGE: ReadingDateRange = {
  start: new Date(2026, 6, 1),
  end: new Date(2026, 7, 21),
};

function signedInAs(uid: string) {
  mockUseSession.mockReturnValue({ user: { uid }, isLoading: false, signIn: jest.fn(), signOut: jest.fn() });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAllReadings.mockResolvedValue([READING]);
  mockReadingsToCsv.mockReturnValue('csv-content');
  mockSaveAndShareCsv.mockResolvedValue(undefined);
});

describe('useExportCsv — sem range (comportamento atual)', () => {
  it('chama getAllReadings sem range e nomeia o arquivo com a data de hoje', async () => {
    signedInAs('user-1');
    jest.useFakeTimers().setSystemTime(new Date(2026, 7, 21, 10, 0, 0));

    const { result } = await renderHook(() => useExportCsv());

    await act(async () => {
      await result.current.exportCsv();
    });

    expect(mockGetAllReadings).toHaveBeenCalledWith('user-1', undefined);
    expect(mockSaveAndShareCsv).toHaveBeenCalledWith('pressao-2026-08-21.csv', 'csv-content');
    expect(result.current.error).toBeNull();

    jest.useRealTimers();
  });

  it('mostra a mensagem genérica de vazio quando não há medição nenhuma', async () => {
    signedInAs('user-1');
    mockGetAllReadings.mockResolvedValue([]);

    const { result } = await renderHook(() => useExportCsv());

    await act(async () => {
      await result.current.exportCsv();
    });

    expect(result.current.error).toBe('Nenhuma medição para exportar ainda.');
    expect(mockSaveAndShareCsv).not.toHaveBeenCalled();
  });
});

describe('useExportCsv — com range', () => {
  it('repassa o range para getAllReadings e nomeia o arquivo com o período', async () => {
    signedInAs('user-1');

    const { result } = await renderHook(() => useExportCsv());

    await act(async () => {
      await result.current.exportCsv(RANGE);
    });

    expect(mockGetAllReadings).toHaveBeenCalledWith('user-1', RANGE);
    expect(mockSaveAndShareCsv).toHaveBeenCalledWith('pressao-2026-07-01_a_2026-08-21.csv', 'csv-content');
  });

  it('mostra a mensagem específica de período vazio, não a genérica de conta vazia', async () => {
    signedInAs('user-1');
    mockGetAllReadings.mockResolvedValue([]);

    const { result } = await renderHook(() => useExportCsv());

    await act(async () => {
      await result.current.exportCsv(RANGE);
    });

    expect(result.current.error).toBe('Nenhuma medição no período selecionado.');
    expect(mockSaveAndShareCsv).not.toHaveBeenCalled();
  });
});

describe('useExportCsv — sessão e erros', () => {
  it('não chama getAllReadings sem usuário autenticado', async () => {
    mockUseSession.mockReturnValue({ user: null, isLoading: false, signIn: jest.fn(), signOut: jest.fn() });

    const { result } = await renderHook(() => useExportCsv());

    await act(async () => {
      await result.current.exportCsv();
    });

    expect(result.current.error).toBe('Sessão expirada. Faça login novamente.');
    expect(mockGetAllReadings).not.toHaveBeenCalled();
  });

  it('propaga a mensagem amigável lançada pelo repositório, nunca o texto cru', async () => {
    signedInAs('user-1');
    mockGetAllReadings.mockRejectedValue(new Error('Sem permissão para ler seu histórico. Faça login novamente.'));

    const { result } = await renderHook(() => useExportCsv());

    await act(async () => {
      await result.current.exportCsv();
    });

    expect(result.current.error).toBe('Sem permissão para ler seu histórico. Faça login novamente.');
  });
});
