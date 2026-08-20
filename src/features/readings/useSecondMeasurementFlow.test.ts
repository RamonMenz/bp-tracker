import { act, renderHook } from '@testing-library/react-native';

import type { SessionReading } from '@/domain/session-average';

import { useSecondMeasurementFlow } from './useSecondMeasurementFlow';

const READING_A: SessionReading = { systolic: 120, diastolic: 80, pulse: 70 };
const READING_B: SessionReading = { systolic: 130, diastolic: 90, pulse: 80 };

describe('useSecondMeasurementFlow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
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

  it('measuring → handleReadingSaved(B) vira summary com a média de A e B', async () => {
    const { result } = await renderHook(() => useSecondMeasurementFlow());

    await act(async () => {
      result.current.handleReadingSaved(READING_A);
    });

    await act(async () => {
      result.current.acceptSecondMeasurement();
    });

    await act(async () => {
      result.current.handleReadingSaved(READING_B);
    });

    expect(result.current.state).toBe('summary');
    // (120+130)/2 = 125, (80+90)/2 = 85, (70+80)/2 = 75 — nenhuma conta exige arredondamento,
    // o resultado fica óbvio de conferir.
    expect(result.current.average).toEqual({ systolic: 125, diastolic: 85, pulse: 75 });
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
      result.current.handleReadingSaved(READING_B);
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
    // try/catch explícito para cobrir "não lança".
    await act(async () => {
      result.current.handleReadingSaved(READING_B);
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
      result.current.handleReadingSaved(READING_B);
    });

    const averageBeforeExtraCall = result.current.average;

    await act(async () => {
      result.current.handleReadingSaved(READING_A);
    });

    expect(result.current.state).toBe('summary');
    expect(result.current.average).toEqual(averageBeforeExtraCall);
  });
});
