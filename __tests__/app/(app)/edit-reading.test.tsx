import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { ReadingListItem } from '@/features/readings/useReadings';

// Fora de src/ (não elegível para o alias @/) — aponta para o arquivo de rota real em
// app/(app)/edit-reading/[id].tsx. Este teste vive em __tests__/ (fora da árvore que o Expo Router
// varre) porque um .test.tsx dentro de app/(app)/ vira rota de verdade — mesmo motivo de
// index.test.tsx e history.test.tsx.
import EditReadingScreen from '../../../app/(app)/edit-reading/[id]';

const mockBack = jest.fn();
const mockUpdateReading = jest.fn<Promise<boolean>, [string, unknown]>();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'reading-1' }),
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
}));

jest.mock('@/features/readings/useReadings', () => ({
  useReadings: jest.fn(),
}));

// Mockado no nível do hook de escrita, e não do useReadingForm: assim a tela roda com o
// useReadingForm REAL, que é justamente quem semeia os campos com a medição existente e escolhe
// entre criar e atualizar — o comportamento sob teste aqui.
jest.mock('@/features/readings/useUpdateReading', () => ({
  useUpdateReading: () => ({ updateReading: mockUpdateReading, isSaving: false, error: null }),
}));

jest.mock('@/features/readings/useAddReading', () => ({
  useAddReading: () => ({ addReading: jest.fn(), isSaving: false, error: null }),
}));

const { useReadings } = jest.requireMock('@/features/readings/useReadings') as {
  useReadings: jest.Mock;
};

const READING: ReadingListItem = {
  id: 'reading-1',
  systolic: 210,
  diastolic: 90,
  pulse: 70,
  measuredAt: new Date(2026, 7, 13, 8, 30, 0),
  createdAt: new Date(2026, 7, 13, 8, 30, 0),
  note: 'Antes do café.',
  source: 'manual',
  hasPendingWrites: false,
};

beforeEach(() => {
  jest.clearAllMocks();

  mockUpdateReading.mockResolvedValue(true);
  useReadings.mockReturnValue({ readings: [READING], isLoading: false, error: null });
});

describe('EditReadingScreen — formulário pré-preenchido', () => {
  it('abre com os valores da medição já nos campos', async () => {
    await render(<EditReadingScreen />);

    expect(screen.getByLabelText('Sistólica').props.value).toBe('210');
    expect(screen.getByLabelText('Diastólica').props.value).toBe('90');
    expect(screen.getByLabelText('Pulso').props.value).toBe('70');
    expect(screen.getByLabelText('Observação').props.value).toBe('Antes do café.');
  });

  it('anuncia que a tela é de edição, e não de registro', async () => {
    await render(<EditReadingScreen />);

    expect(screen.getByText('Editar medição')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeTruthy();
  });
});

/**
 * Digitar e salvar vão dentro de `act` assíncrono, e não soltos como no resto da suíte de telas.
 * Dois motivos: (1) o `act` do próprio `fireEvent` não dá conta de descarregar a renderização
 * concorrente aqui — sem o `act` de fora, o `submit` chega a ler os valores ANTIGOS dos campos;
 * (2) `submit()` encadeia gravação → háptico → navegação, e essa cauda de promessas precisa
 * terminar dentro do teste que a disparou, senão resolve durante o SEGUINTE e derruba testes que
 * passam sozinhos. O aninhamento cobra um aviso de "overlapping act()" no console — ruído
 * conhecido, preferível a testes que passam por acaso.
 */
describe('EditReadingScreen — salvar a correção', () => {
  it('atualiza a medição do id da rota com os novos valores e volta para a tela anterior', async () => {
    await render(<EditReadingScreen />);

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Sistólica'), '120');
      fireEvent.changeText(screen.getByLabelText('Diastólica'), '80');
    });

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Salvar alterações' }));
    });

    expect(mockUpdateReading).toHaveBeenCalledTimes(1);
    expect(mockUpdateReading).toHaveBeenCalledWith(
      'reading-1',
      expect.objectContaining({ systolic: '120', diastolic: '80', note: 'Antes do café.' }),
    );

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('não navega de volta quando a gravação falha — o usuário não pode perder o que digitou', async () => {
    mockUpdateReading.mockResolvedValue(false);

    await render(<EditReadingScreen />);

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Sistólica'), '120');
    });

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Salvar alterações' }));
    });

    expect(mockUpdateReading).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Sistólica').props.value).toBe('120');
  });

  it('volta sem gravar nada pelo Cancelar', async () => {
    await render(<EditReadingScreen />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockUpdateReading).not.toHaveBeenCalled();
  });
});

describe('EditReadingScreen — medição indisponível', () => {
  it('mostra aviso em vez de um formulário vazio quando o id não existe mais', async () => {
    useReadings.mockReturnValue({ readings: [], isLoading: false, error: null });

    await render(<EditReadingScreen />);

    expect(screen.getByText('Essa medição não está mais disponível. Ela pode ter sido excluída.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).toBeNull();
  });

  it('não monta o formulário enquanto o histórico ainda está carregando', async () => {
    useReadings.mockReturnValue({ readings: [], isLoading: true, error: null });

    await render(<EditReadingScreen />);

    // Sem isto o formulário nasceria vazio e assim ficaria: useReadingForm lê a medição só na
    // montagem, então montá-lo antes da carga terminar perderia os valores para sempre.
    expect(screen.getByLabelText('Carregando medição')).toBeTruthy();
    expect(screen.queryByLabelText('Sistólica')).toBeNull();
  });

  it('mostra o erro amigável do histórico quando a leitura falha', async () => {
    const message = 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
    useReadings.mockReturnValue({ readings: [], isLoading: false, error: message });

    await render(<EditReadingScreen />);

    expect(screen.getByText(message)).toBeTruthy();
  });
});
