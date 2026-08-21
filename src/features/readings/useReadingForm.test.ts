import { act, renderHook } from '@testing-library/react-native';

import type { Reading } from '@/types/models';

import { NOTE_MAX_LENGTH } from './reading.schema';
import { useReadingForm, type EditableReading } from './useReadingForm';

const mockAddReading = jest.fn<Promise<string | false>, [unknown]>();
const mockUpdateReading = jest.fn<Promise<boolean>, [string, unknown]>();

// useReadingForm delega a persistência a useAddReading/useUpdateReading — que, por sua vez, puxam
// useSession e todo o SDK do Firebase. Este teste é sobre o estado/validação do formulário, não
// sobre a stack de auth, então os hooks de persistência são trocados por stubs que só registram a
// chamada. Os dois precisam de stub mesmo em modo criação: o hook chama ambos (regra dos hooks),
// e é só no submit que ele escolhe qual acionar.
jest.mock('./useAddReading', () => ({
  useAddReading: () => ({ addReading: mockAddReading, isSaving: false, error: null }),
}));

jest.mock('./useUpdateReading', () => ({
  useUpdateReading: () => ({ updateReading: mockUpdateReading, isSaving: false, error: null }),
}));

function makeEditableReading(overrides: Partial<Reading> = {}): EditableReading {
  return {
    id: 'reading-1',
    systolic: 128,
    diastolic: 82,
    pulse: 70,
    measuredAt: new Date(2026, 7, 13, 8, 30, 0),
    createdAt: new Date(2026, 7, 13, 8, 30, 0),
    note: 'Antes do café.',
    source: 'manual',
    ...overrides,
  };
}

describe('useReadingForm — campo de observação', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddReading.mockResolvedValue('reading-1');
    mockUpdateReading.mockResolvedValue(true);
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

/**
 * O CRUD nasceu sem o "U": corrigir um 210/90 digitado no lugar de 120/80 exigia excluir e
 * recriar, perdendo o `createdAt` original. O mesmo hook atende os dois modos — o que muda é a
 * semente dos campos e para onde o submit escreve.
 */
describe('useReadingForm — modo edição', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddReading.mockResolvedValue('reading-1');
    mockUpdateReading.mockResolvedValue(true);
  });

  it('nasce com os campos preenchidos pela medição existente, convertendo número em texto', async () => {
    const { result } = await renderHook(() => useReadingForm(makeEditableReading()));

    expect(result.current.systolic).toBe('128');
    expect(result.current.diastolic).toBe('82');
    expect(result.current.pulse).toBe('70');
    expect(result.current.note).toBe('Antes do café.');
    expect(result.current.measuredAt).toEqual(new Date(2026, 7, 13, 8, 30, 0));
  });

  it('deixa vazios os campos opcionais que a medição não tem, em vez de escrever "null"', async () => {
    const { result } = await renderHook(() => useReadingForm(makeEditableReading({ pulse: null, note: null })));

    expect(result.current.pulse).toBe('');
    expect(result.current.note).toBe('');
  });

  it('já começa podendo salvar: a medição existente é, por definição, um par válido', async () => {
    const { result } = await renderHook(() => useReadingForm(makeEditableReading()));

    expect(result.current.canSubmit).toBe(true);
  });

  it('salva pelo updateReading, com o id da medição e os valores corrigidos', async () => {
    const { result } = await renderHook(() => useReadingForm(makeEditableReading()));

    await act(async () => {
      result.current.setSystolic('120');
      result.current.setDiastolic('80');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(mockUpdateReading).toHaveBeenCalledTimes(1);
    expect(mockUpdateReading).toHaveBeenCalledWith(
      'reading-1',
      expect.objectContaining({ systolic: '120', diastolic: '80', note: 'Antes do café.' }),
    );
    // O caminho de criação não pode ser acionado por engano: seria uma medição duplicada.
    expect(mockAddReading).not.toHaveBeenCalled();
  });

  it('mantém os campos preenchidos depois de salvar — quem navega de volta é a tela', async () => {
    const { result } = await renderHook(() => useReadingForm(makeEditableReading()));

    await act(async () => {
      result.current.setSystolic('120');
    });

    let success: boolean | undefined;
    let readingId: string | null | undefined;
    await act(async () => {
      ({ success, readingId } = await result.current.submit());
    });

    expect(success).toBe(true);
    // Modo edição nunca cria documento novo — readingId é sempre null aqui, o único id envolvido
    // (initialReading.id) já era conhecido antes do submit.
    expect(readingId).toBeNull();
    expect(result.current.systolic).toBe('120');
    expect(result.current.diastolic).toBe('82');
  });

  it('não limpa nada quando a atualização falha', async () => {
    mockUpdateReading.mockResolvedValue(false);

    const { result } = await renderHook(() => useReadingForm(makeEditableReading()));

    let success: boolean | undefined;
    await act(async () => {
      ({ success } = await result.current.submit());
    });

    expect(success).toBe(false);
    expect(result.current.systolic).toBe('128');
  });

  it('aplica a mesma validação de faixa do modo criação', async () => {
    const { result } = await renderHook(() => useReadingForm(makeEditableReading()));

    await act(async () => {
      result.current.setSystolic('80');
      result.current.setDiastolic('120');
    });

    expect(result.current.fieldErrors.diastolic).toBe('Deve ser menor que a sistólica.');
    expect(result.current.canSubmit).toBe(false);
  });
});

/** Sem `initialReading` nada muda: é o caminho de registrar da home, que não pode ter regredido. */
describe('useReadingForm — modo criação continua intacto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddReading.mockResolvedValue('reading-1');
    mockUpdateReading.mockResolvedValue(true);
  });

  it('nasce vazio e salva pelo addReading, nunca pelo updateReading', async () => {
    const { result } = await renderHook(() => useReadingForm());

    expect(result.current.systolic).toBe('');
    expect(result.current.diastolic).toBe('');

    await act(async () => {
      result.current.setSystolic('120');
      result.current.setDiastolic('80');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(mockAddReading).toHaveBeenCalledTimes(1);
    expect(mockUpdateReading).not.toHaveBeenCalled();
  });

  it('continua limpando os campos após salvar, para o próximo registro', async () => {
    const { result } = await renderHook(() => useReadingForm());

    await act(async () => {
      result.current.setSystolic('120');
      result.current.setDiastolic('80');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.systolic).toBe('');
    expect(result.current.diastolic).toBe('');
  });

  it('devolve o id do documento criado quando o salvamento dá certo', async () => {
    const { result } = await renderHook(() => useReadingForm());

    await act(async () => {
      result.current.setSystolic('120');
      result.current.setDiastolic('80');
    });

    let readingId: string | null | undefined;
    await act(async () => {
      ({ readingId } = await result.current.submit());
    });

    expect(readingId).toBe('reading-1');
  });

  it('devolve readingId null quando o salvamento falha', async () => {
    mockAddReading.mockResolvedValue(false);

    const { result } = await renderHook(() => useReadingForm());

    await act(async () => {
      result.current.setSystolic('120');
      result.current.setDiastolic('80');
    });

    let success: boolean | undefined;
    let readingId: string | null | undefined;
    await act(async () => {
      ({ success, readingId } = await result.current.submit());
    });

    expect(success).toBe(false);
    expect(readingId).toBeNull();
  });
});
