import { fireEvent, render, screen } from '@testing-library/react-native';

import { SecondMeasurementDialog } from './SecondMeasurementDialog';

const onSubmit = jest.fn();
const onCancel = jest.fn();

function renderDialog(props: Partial<React.ComponentProps<typeof SecondMeasurementDialog>> = {}) {
  return render(
    <SecondMeasurementDialog
      visible
      isSaving={false}
      error={null}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />,
  );
}

/** Preenche o par obrigatório com um valor válido — o atalho de quase todo teste daqui. */
async function fillValidPair(): Promise<void> {
  await fireEvent.changeText(screen.getByLabelText('Sistólica'), '130');
  await fireEvent.changeText(screen.getByLabelText('Diastólica'), '90');
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SecondMeasurementDialog — só os números da segunda medição', () => {
  /**
   * Decisão de produto: a segunda medição é uma confirmação rápida, e herda observação e horário
   * do registro original (é o mesmo documento que será atualizado com a média). Se um destes
   * campos reaparecer aqui, o pop-up voltou a ser o formulário grande.
   */
  it('não pede observação nem horário — só sistólica, diastólica e pulso', async () => {
    await renderDialog();

    expect(screen.getByLabelText('Sistólica')).toBeTruthy();
    expect(screen.getByLabelText('Diastólica')).toBeTruthy();
    expect(screen.getByLabelText('Pulso')).toBeTruthy();

    expect(screen.queryByLabelText('Observação')).toBeNull();
    expect(screen.queryByLabelText(/Horário da medição/)).toBeNull();
  });
});

describe('SecondMeasurementDialog — validação bloqueia o salvar', () => {
  it('começa com o salvar desabilitado: nenhum campo preenchido ainda', async () => {
    await renderDialog();

    const button = screen.getByRole('button', { name: 'Salvar segunda medição' });
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('habilita o salvar quando o par obrigatório fica válido', async () => {
    await renderDialog();

    await fillValidPair();

    const button = screen.getByRole('button', { name: 'Salvar segunda medição' });
    expect(button.props.accessibilityState?.disabled).toBe(false);
  });

  it('bloqueia e explica quando a sistólica sai da faixa', async () => {
    await renderDialog();

    await fireEvent.changeText(screen.getByLabelText('Sistólica'), '400');
    await fireEvent.changeText(screen.getByLabelText('Diastólica'), '90');

    expect(screen.getByText('Informe um valor entre 50 e 300.')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Salvar segunda medição' }).props.accessibilityState?.disabled,
    ).toBe(true);
  });

  /** Mesma regra do formulário grande (reading-field-errors.ts) — não uma segunda cópia dela. */
  it('bloqueia e explica quando a diastólica não é menor que a sistólica', async () => {
    await renderDialog();

    await fireEvent.changeText(screen.getByLabelText('Sistólica'), '90');
    await fireEvent.changeText(screen.getByLabelText('Diastólica'), '120');

    expect(screen.getByText('Deve ser menor que a sistólica.')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Salvar segunda medição' }).props.accessibilityState?.disabled,
    ).toBe(true);
  });

  /** O pulso é opcional, mas, uma vez preenchido fora de faixa, trava o salvar como os outros. */
  it('bloqueia quando o pulso preenchido está fora da faixa, mesmo com o par válido', async () => {
    await renderDialog();

    await fillValidPair();
    await fireEvent.changeText(screen.getByLabelText('Pulso'), '400');

    expect(screen.getByText('Informe um valor entre 20 e 250.')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Salvar segunda medição' }).props.accessibilityState?.disabled,
    ).toBe(true);
  });
});

describe('SecondMeasurementDialog — salvar e cancelar', () => {
  it('entrega os três valores em string ao tocar em "Salvar segunda medição"', async () => {
    await renderDialog();

    await fillValidPair();
    await fireEvent.changeText(screen.getByLabelText('Pulso'), '72');

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar segunda medição' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ systolic: '130', diastolic: '90', pulse: '72' });
  });

  it('entrega o pulso vazio quando ele não foi preenchido — o campo é opcional', async () => {
    await renderDialog();

    await fillValidPair();
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar segunda medição' }));

    expect(onSubmit).toHaveBeenCalledWith({ systolic: '130', diastolic: '90', pulse: '' });
  });

  it('dispara onCancel ao tocar em "Cancelar"', async () => {
    await renderDialog();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('SecondMeasurementDialog — salvando', () => {
  it('marca o salvar como ocupado e trava o cancelar enquanto grava', async () => {
    await renderDialog({ isSaving: true });

    const saveButton = screen.getByRole('button', { name: 'Salvar segunda medição' });
    expect(saveButton.props.accessibilityState?.busy).toBe(true);
    expect(saveButton.props.accessibilityState?.disabled).toBe(true);

    expect(screen.getByRole('button', { name: 'Cancelar' }).props.accessibilityState?.disabled).toBe(true);
  });
});

describe('SecondMeasurementDialog — erro de gravação', () => {
  it('mostra a mensagem amigável recebida por prop', async () => {
    await renderDialog({ error: 'Sem conexão com a internet. Verifique sua rede e tente novamente.' });

    expect(
      screen.getByText('Sem conexão com a internet. Verifique sua rede e tente novamente.'),
    ).toBeTruthy();
  });

  /**
   * Depois de uma falha o usuário precisa poder tentar de novo sem redigitar: o componente não
   * limpa os campos sozinho ao receber um `error`, e quem decide fechar é quem o monta.
   */
  it('preserva o que já foi digitado quando o erro chega, e deixa tentar de novo', async () => {
    const { rerender } = await renderDialog();

    await fillValidPair();

    await rerender(
      <SecondMeasurementDialog
        visible
        isSaving={false}
        error="Não foi possível salvar sua medição. Tente novamente."
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByLabelText('Sistólica').props.value).toBe('130');
    expect(screen.getByLabelText('Diastólica').props.value).toBe('90');

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar segunda medição' }));

    expect(onSubmit).toHaveBeenCalledWith({ systolic: '130', diastolic: '90', pulse: '' });
  });
});
