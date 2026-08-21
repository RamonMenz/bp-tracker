import { act, renderHook } from '@testing-library/react-native';

import type { SessionReading } from '@/domain/session-average';

import { useSecondMeasurementFlow, type FirstMeasurement } from './useSecondMeasurementFlow';

const mockUpdateReading = jest.fn<Promise<boolean>, [string, unknown]>();

// useSecondMeasurementFlow agora chama useUpdateReading para persistir a média — mesmo padrão de
// stub já usado nos testes de useReadingForm para useAddReading/useUpdateReading: o hook de
// escrita vira um mock que só registra a chamada, sem puxar useSession/Firebase de verdade.
jest.mock('./useUpdateReading', () => ({
  useUpdateReading: () => ({ updateReading: mockUpdateReading, isSaving: false, error: null }),
}));

const READING_A: FirstMeasurement = {
  id: 'reading-1',
  systolic: 120,
  diastolic: 80,
  pulse: 70,
  note: 'Antes do café.',
  measuredAt: new Date(2026, 7, 14, 8, 0, 0),
};
const READING_B: SessionReading = { systolic: 130, diastolic: 90, pulse: 80 };

describe('useSecondMeasurementFlow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUpdateReading.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('começa em idle, sem contador rodando', async () => {
    const { result } = await renderHook(() => useSecondMeasurementFlow());

    expect(result.current.state).toBe('idle');
    expect(result.current.secondsRemaining).toBe(0);
    expect(result.current.average).toBeNull();
  });

  it('idle → handleReadingSaved(A) vira offer, com o contador começando em 60', async () => {
    const { result } = await renderHook(() => useSecondMeasurementFlow());

    await act(async () => {
      result.current.handleReadingSaved(READING_A);
    });

    expect(result.current.state).toBe('offer');
    expect(result.current.secondsRemaining).toBe(60);
  });

  it('offer → acceptSecondMeasurement vira measuring sem reiniciar o contador', async () => {
    const { result } = await renderHook(() => useSecondMeasurementFlow());

    await act(async () => {
      result.current.handleReadingSaved(READING_A);
    });

    await act(async () => {
      jest.advanceTimersByTime(15_000);
    });

    expect(result.current.secondsRemaining).toBe(45);

    await act(async () => {
      result.current.acceptSecondMeasurement();
    });

    expect(result.current.state).toBe('measuring');
    // O aceite não reinicia o contador — continua de onde estava, não volta para 60.
    expect(result.current.secondsRemaining).toBe(45);
  });

  describe('submitSecondMeasurement', () => {
    it('measuring → ATUALIZA o documento da primeira medição com a média, e vira summary', async () => {
      const { result } = await renderHook(() => useSecondMeasurementFlow());

      await act(async () => {
        result.current.handleReadingSaved(READING_A);
      });

      await act(async () => {
        result.current.acceptSecondMeasurement();
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.submitSecondMeasurement(READING_B);
      });

      expect(success).toBe(true);
      expect(result.current.state).toBe('summary');
      // (120+130)/2 = 125, (80+90)/2 = 85, (70+80)/2 = 75 — nenhuma conta exige arredondamento,
      // o resultado fica óbvio de conferir.
      expect(result.current.average).toEqual({ systolic: 125, diastolic: 85, pulse: 75 });

      // Não cria um segundo documento — atualiza o MESMO id da primeira medição, com os valores
      // da média já como string (formato ReadingFormValues) e note/measuredAt preservados.
      expect(mockUpdateReading).toHaveBeenCalledTimes(1);
      expect(mockUpdateReading).toHaveBeenCalledWith('reading-1', {
        systolic: '125',
        diastolic: '85',
        pulse: '75',
        note: 'Antes do café.',
        measuredAt: READING_A.measuredAt,
      });
    });

    it('updateReading falhando mantém measuring, sem média, com saveError refletindo o hook', async () => {
      mockUpdateReading.mockResolvedValue(false);

      const { result } = await renderHook(() => useSecondMeasurementFlow());

      await act(async () => {
        result.current.handleReadingSaved(READING_A);
      });

      await act(async () => {
        result.current.acceptSecondMeasurement();
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.submitSecondMeasurement(READING_B);
      });

      expect(success).toBe(false);
      expect(result.current.state).toBe('measuring');
      expect(result.current.average).toBeNull();
      // saveError é o que useUpdateReading (mockado) expõe — o mock deste arquivo devolve null
      // por padrão, então é isso que se espera aqui: o hook nunca inventa a própria mensagem.
      expect(result.current.saveError).toBeNull();
    });

    it('fora de measuring é no-op: não chama updateReading, devolve false, não muda o estado', async () => {
      const { result } = await renderHook(() => useSecondMeasurementFlow());

      // Em 'idle'.
      let successFromIdle: boolean | undefined;
      await act(async () => {
        successFromIdle = await result.current.submitSecondMeasurement(READING_B);
      });

      expect(successFromIdle).toBe(false);
      expect(result.current.state).toBe('idle');
      expect(mockUpdateReading).not.toHaveBeenCalled();

      // Em 'offer' (primeira medição já salva, mas ainda não aceitou a segunda).
      await act(async () => {
        result.current.handleReadingSaved(READING_A);
      });

      let successFromOffer: boolean | undefined;
      await act(async () => {
        successFromOffer = await result.current.submitSecondMeasurement(READING_B);
      });

      expect(successFromOffer).toBe(false);
      expect(result.current.state).toBe('offer');
      expect(mockUpdateReading).not.toHaveBeenCalled();
    });
  });

  it('o contador nunca passa de 0 para negativo, e chegar a 0 não muda o estado sozinho', async () => {
    const { result } = await renderHook(() => useSecondMeasurementFlow());

    await act(async () => {
      result.current.handleReadingSaved(READING_A);
    });

    await act(async () => {
      jest.advanceTimersByTime(90_000);
    });

    expect(result.current.secondsRemaining).toBe(0);
    expect(result.current.state).toBe('offer');
  });

  it('decline a partir de offer volta para idle e para o contador', async () => {
    const { result } = await renderHook(() => useSecondMeasurementFlow());

    await act(async () => {
      result.current.handleReadingSaved(READING_A);
    });

    await act(async () => {
      result.current.decline();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.secondsRemaining).toBe(0);
  });

  it('decline a partir de measuring volta para idle e para o contador', async () => {
    const { result } = await renderHook(() => useSecondMeasurementFlow());

    await act(async () => {
      result.current.handleReadingSaved(READING_A);
    });

    await act(async () => {
      result.current.acceptSecondMeasurement();
    });

    await act(async () => {
      result.current.decline();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.secondsRemaining).toBe(0);
  });

  it('uma sessão nova depois de um decline recomeça limpa em 60, sem herdar o interval anterior', async () => {
    const { result } = await renderHook(() => useSecondMeasurementFlow());

    await act(async () => {
      result.current.handleReadingSaved(READING_A);
    });

    await act(async () => {
      jest.advanceTimersByTime(50_000);
    });

    expect(result.current.secondsRemaining).toBe(10);

    await act(async () => {
      result.current.decline();
    });

    await act(async () => {
      result.current.handleReadingSaved(READING_A);
    });

    expect(result.current.state).toBe('offer');
    expect(result.current.secondsRemaining).toBe(60);

    // Se o interval antigo tivesse vazado, este tick derrubaria mais de 1s de uma vez.
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });

    expect(result.current.secondsRemaining).toBe(59);
  });

  it('dismissSummary a partir de summary volta para idle e limpa a média', async () => {
    const { result } = await renderHook(() => useSecondMeasurementFlow());

    await act(async () => {
      result.current.handleReadingSaved(READING_A);
    });

    await act(async () => {
      result.current.acceptSecondMeasurement();
    });

    await act(async () => {
      await result.current.submitSecondMeasurement(READING_B);
    });

    await act(async () => {
      result.current.dismissSummary();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.average).toBeNull();
  });

  it('handleReadingSaved em offer é no-op: não lança e não muda o estado', async () => {
    const { result } = await renderHook(() => useSecondMeasurementFlow());

    await act(async () => {
      result.current.handleReadingSaved(READING_A);
    });

    // Se a chamada abaixo lançasse, o act a propagaria e o teste falharia — não é preciso um
    // try/catch explícito para cobrir "não lança". Reusa READING_A (não importa o conteúdo, só
    // que o estado e a média não se movem).
    await act(async () => {
      result.current.handleReadingSaved(READING_A);
    });

    expect(result.current.state).toBe('offer');
    expect(result.current.average).toBeNull();
  });

  it('handleReadingSaved em summary é no-op: não lança e não muda o estado', async () => {
    const { result } = await renderHook(() => useSecondMeasurementFlow());

    await act(async () => {
      result.current.handleReadingSaved(READING_A);
    });

    await act(async () => {
      result.current.acceptSecondMeasurement();
    });

    await act(async () => {
      await result.current.submitSecondMeasurement(READING_B);
    });

    const averageBeforeExtraCall = result.current.average;

    await act(async () => {
      result.current.handleReadingSaved(READING_A);
    });

    expect(result.current.state).toBe('summary');
    expect(result.current.average).toEqual(averageBeforeExtraCall);
  });
});
