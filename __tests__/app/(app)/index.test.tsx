import { fireEvent, render, screen } from '@testing-library/react-native';

// Fora de src/ (não elegível para o alias @/) — aponta para o arquivo de rota real em
// app/(app)/index.tsx. Este teste vive em __tests__/ (fora da árvore que o Expo Router varre)
// porque um .test.tsx dentro de app/(app)/ vira rota de verdade e aparece como item extra na
// barra de abas — mesmo motivo de history.test.tsx e settings.test.tsx.
import RecordScreen from '../../../app/(app)/index';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/features/readings/useLastReading', () => ({
  useLastReading: jest.fn(),
}));

jest.mock('@/features/readings/useReadingForm', () => ({
  useReadingForm: jest.fn(),
}));

const { useLastReading } = jest.requireMock('@/features/readings/useLastReading') as {
  useLastReading: jest.Mock;
};
const { useReadingForm } = jest.requireMock('@/features/readings/useReadingForm') as {
  useReadingForm: jest.Mock;
};

const setNoteMock = jest.fn();
const submitMock = jest.fn<Promise<boolean>, []>();

function buildForm(overrides: Record<string, unknown> = {}) {
  return {
    systolic: '120',
    diastolic: '80',
    pulse: '',
    note: '',
    measuredAt: new Date(2026, 7, 14, 8, 0, 0),
    setSystolic: jest.fn(),
    setDiastolic: jest.fn(),
    setPulse: jest.fn(),
    setNote: setNoteMock,
    setMeasuredAt: jest.fn(),
    fieldErrors: { systolic: null, diastolic: null, pulse: null, note: null },
    previewCategory: null,
    canSubmit: true,
    submit: submitMock,
    isSaving: false,
    submitError: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  useLastReading.mockReturnValue({ lastReading: null, isLoading: false });
  useReadingForm.mockReturnValue(buildForm());
});

describe('RecordScreen — campo de observação', () => {
  it('mostra o campo de observação, opcional, depois do horário da medição', async () => {
    await render(<RecordScreen />);

    expect(screen.getByLabelText('Observação (opcional)')).toBeTruthy();
  });

  it('repassa o texto digitado para setNote do formulário', async () => {
    await render(<RecordScreen />);

    fireEvent.changeText(screen.getByLabelText('Observação (opcional)'), 'Medi após caminhada.');

    expect(setNoteMock).toHaveBeenCalledWith('Medi após caminhada.');
  });

  it('mostra a mensagem de erro amigável quando a observação excede o limite', async () => {
    useReadingForm.mockReturnValue(
      buildForm({
        note: 'a'.repeat(281),
        fieldErrors: { systolic: null, diastolic: null, pulse: null, note: 'A observação deve ter no máximo 280 caracteres.' },
        canSubmit: false,
      }),
    );

    await render(<RecordScreen />);

    expect(screen.getByText('A observação deve ter no máximo 280 caracteres.')).toBeTruthy();
  });

  it('desabilita o botão Salvar quando canSubmit é false por causa da observação', async () => {
    useReadingForm.mockReturnValue(
      buildForm({
        canSubmit: false,
        fieldErrors: { systolic: null, diastolic: null, pulse: null, note: 'A observação deve ter no máximo 280 caracteres.' },
      }),
    );

    await render(<RecordScreen />);

    const button = screen.getByRole('button', { name: 'Salvar medição' });
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });
});
