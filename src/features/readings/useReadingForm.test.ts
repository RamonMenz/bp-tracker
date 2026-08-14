import { act, renderHook } from '@testing-library/react-native';

import { NOTE_MAX_LENGTH } from './reading.schema';
import { useReadingForm } from './useReadingForm';

const mockAddReading = jest.fn<Promise<boolean>, [unknown]>();

// useReadingForm delega a persistência a useAddReading — que, por sua vez, puxa useSession e todo
// o SDK do Firebase. Este teste é sobre o estado/validação do formulário, não sobre a stack de
// auth, então o hook de persistência é trocado por um stub que só registra a chamada.
jest.mock('./useAddReading', () => ({
  useAddReading: () => ({ addReading: mockAddReading, isSaving: false, error: null }),
}));

describe('useReadingForm — campo de observação', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddReading.mockResolvedValue(true);
  });

  it('começa vazio, sem erro, e não bloqueia o submit por causa dele', async () => {
    const { result } = await renderHook(() => useReadingForm());

    expect(result.current.note).toBe('');
    expect(result.current.fieldErrors.note).toBeNull();
  });

  it('repassa o texto digitado para addReading no submit', async () => {
    const { result } = await renderHook(() => useReadingForm());

    await act(async () => {
      result.current.setSystolic('120');
      result.current.setDiastolic('80');
      result.current.setNote('Medi após caminhada.');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(mockAddReading).toHaveBeenCalledTimes(1);
    expect(mockAddReading).toHaveBeenCalledWith(
      expect.objectContaining({ systolic: '120', diastolic: '80', note: 'Medi após caminhada.' }),
    );
  });

  it('limpa a observação junto com os outros campos após salvar com sucesso', async () => {
    const { result } = await renderHook(() => useReadingForm());

    await act(async () => {
      result.current.setSystolic('120');
      result.current.setDiastolic('80');
      result.current.setNote('Nota temporária');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.note).toBe('');
  });

  it('não acusa erro em observação vazia', async () => {
    const { result } = await renderHook(() => useReadingForm());

    await act(async () => {
      result.current.setNote('');
    });

    expect(result.current.fieldErrors.note).toBeNull();
  });

  it(`acusa erro amigável ao passar de ${NOTE_MAX_LENGTH} caracteres, e não a mensagem crua do Zod`, async () => {
    const { result } = await renderHook(() => useReadingForm());

    await act(async () => {
      result.current.setNote('a'.repeat(NOTE_MAX_LENGTH + 1));
    });

    expect(result.current.fieldErrors.note).toBe(`A observação deve ter no máximo ${NOTE_MAX_LENGTH} caracteres.`);
  });

  it('não acusa erro exatamente no limite de caracteres', async () => {
    const { result } = await renderHook(() => useReadingForm());

    await act(async () => {
      result.current.setNote('a'.repeat(NOTE_MAX_LENGTH));
    });

    expect(result.current.fieldErrors.note).toBeNull();
  });

  /**
   * A observação é opcional (campo vazio nunca bloqueia), mas, uma vez preenchida além do
   * limite, o erro trava o Salvar do mesmo jeito que um erro de faixa em sistólica/diastólica/
   * pulso — o texto seria rejeitado pelo schema Zod de qualquer forma, então é melhor barrar
   * aqui, com a mensagem amigável já visível no campo, do que deixar o submit falhar no
   * repositório e mostrar um erro genérico por cima do que já estava sinalizado.
   */
  it('bloqueia canSubmit quando a observação excede o limite, mesmo com sistólica/diastólica válidas', async () => {
    const { result } = await renderHook(() => useReadingForm());

    await act(async () => {
      result.current.setSystolic('120');
      result.current.setDiastolic('80');
    });

    expect(result.current.canSubmit).toBe(true);

    await act(async () => {
      result.current.setNote('a'.repeat(NOTE_MAX_LENGTH + 1));
    });

    expect(result.current.canSubmit).toBe(false);
  });
});
