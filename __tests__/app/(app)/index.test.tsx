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

const mockUpdateReading = jest.fn<Promise<boolean>, [string, unknown]>();

// useReadingForm continua mockado — o que se testa aqui é a ORQUESTRAÇÃO da tela (comentário mais
// abaixo). useSecondMeasurementFlow, porém, roda REAL, e agora chama useUpdateReading por baixo
// (para persistir a média da segunda medição) — que, por sua vez, puxa useSession e todo o SDK do
// Firebase. Mocked no nível do hook de escrita, mesmo padrão já usado em edit-reading.test.tsx.
jest.mock('@/features/readings/useUpdateReading', () => ({
  useUpdateReading: () => ({ updateReading: mockUpdateReading, isSaving: false, error: null }),
}));

const { useLastReading } = jest.requireMock('@/features/readings/useLastReading') as {
  useLastReading: jest.Mock;
};
const { useReadingForm } = jest.requireMock('@/features/readings/useReadingForm') as {
  useReadingForm: jest.Mock;
};

const setNoteMock = jest.fn();
const submitMock = jest.fn<Promise<{ success: boolean; readingId: string | null }>, []>();

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
  mockUpdateReading.mockResolvedValue(true);
});

describe('RecordScreen — campo de observação', () => {
  it('esconde pulso e observação até o usuário tocar em "Pulso e observação", e esconde de novo ao tocar outra vez', async () => {
    await render(<RecordScreen />);

    expect(screen.queryByLabelText('Observação')).toBeNull();

    // fireEvent.press é assíncrono nesta versão do RTL — sem o await, a asserção seguinte roda
    // antes do re-render que a revelação do campo dispara.
    const disclosure = screen.getByLabelText('Pulso e observação');
    await fireEvent.press(disclosure);

    expect(screen.getByLabelText('Observação')).toBeTruthy();

    // O mesmo controle que abriu também fecha — accordion de verdade, não uma revelação de mão
    // única sem jeito de voltar atrás.
    await fireEvent.press(disclosure);

    expect(screen.queryByLabelText('Observação')).toBeNull();
  });

  it('repassa o texto digitado para setNote do formulário', async () => {
    await render(<RecordScreen />);

    await fireEvent.press(screen.getByLabelText('Pulso e observação'));
    fireEvent.changeText(screen.getByLabelText('Observação'), 'Medi após caminhada.');

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

/**
 * Fluxo completo da sugestão de segunda medição (protocolo AHA). `useReadingForm` continua
 * mockado — o que se testa aqui é a ORQUESTRAÇÃO da tela: o retrato dos campos antes do submit,
 * a máquina de estados real de `useSecondMeasurementFlow` e o card certo em cada etapa.
 */
describe('RecordScreen — sugestão de segunda medição', () => {
  beforeEach(() => {
    submitMock.mockResolvedValue({ success: true, readingId: 'reading-1' });
  });

  it('não mostra nada sobre segunda medição antes de salvar a primeira', async () => {
    await render(<RecordScreen />);

    expect(screen.queryByText('Quer confirmar com uma segunda medição?')).toBeNull();
  });

  it('percorre idle → offer → measuring ao aceitar a segunda medição', async () => {
    await render(<RecordScreen />);

    // 1ª medição (120/80, sem pulso): o card de sugestão aparece com o contador cheio.
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar medição' }));

    expect(screen.getByText('Quer confirmar com uma segunda medição?')).toBeTruthy();
    expect(screen.getByText('Sugestão: aguarde mais 60s')).toBeTruthy();

    // O formulário é a MESMA instância de sempre — continua na tela, pronto para a segunda.
    useReadingForm.mockReturnValue(buildForm({ systolic: '130', diastolic: '90' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Medir novamente' }));

    expect(screen.getByText('Medição 2 de 2')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Medir novamente' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Salvar medição' })).toBeTruthy();
  });

  /**
   * O Prompt 4.2 tirou a transição measuring→'summary' de dentro de handleReadingSaved — ela
   * agora só acontece por `submitSecondMeasurement` (useSecondMeasurementFlow.test.ts cobre essa
   * transição isoladamente). Esta tela ainda não foi rewired para chamar
   * `submitSecondMeasurement` no lugar de `form.submit()` durante 'measuring' — isso, junto do
   * pop-up, é o Prompt 4.3. Até lá, tocar em "Salvar medição" na 2ª medição continua chamando só
   * `form.submit()` (mockado) e `handleReadingSaved`, que agora é NO-OP em 'measuring' — o fluxo
   * fica parado em 'measuring', de propósito, em vez de fingir uma conclusão que a tela ainda não
   * sabe fazer.
   */
  it('a 2ª medição ainda não fecha o resumo nesta tela — isso é o Prompt 4.3', async () => {
    await render(<RecordScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar medição' }));

    useReadingForm.mockReturnValue(buildForm({ systolic: '130', diastolic: '90' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Medir novamente' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar medição' }));

    expect(screen.queryByText('Média das duas medições')).toBeNull();
    expect(screen.getByText('Medição 2 de 2')).toBeTruthy();
  });

  it('dispensar a sugestão volta a tela ao estado comum, sem descartar o que já foi salvo', async () => {
    await render(<RecordScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar medição' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Não, obrigado' }));

    expect(screen.queryByText('Quer confirmar com uma segunda medição?')).toBeNull();
    // A medição em si já foi para o repositório — dispensar só descarta o estado da sessão.
    expect(submitMock).toHaveBeenCalledTimes(1);
  });

  it('não sugere segunda medição quando o salvamento falha', async () => {
    submitMock.mockResolvedValue({ success: false, readingId: null });

    await render(<RecordScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar medição' }));

    expect(screen.queryByText('Quer confirmar com uma segunda medição?')).toBeNull();
  });
});
