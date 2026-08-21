import { fireEvent, render, screen } from '@testing-library/react-native';

import { SecondMeasurementOfferDialog } from './SecondMeasurementOfferDialog';

const onAccept = jest.fn();
const onDecline = jest.fn();

function renderDialog(props: Partial<React.ComponentProps<typeof SecondMeasurementOfferDialog>> = {}) {
  return render(
    <SecondMeasurementOfferDialog
      visible
      secondsRemaining={60}
      onAccept={onAccept}
      onDecline={onDecline}
      {...props}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SecondMeasurementOfferDialog — o convite', () => {
  /**
   * O título é uma pergunta inteira e vai como texto puro, sem SectionHeader: nada de reticências
   * cortando a pergunta ao meio, nem com a fonte ampliada pelo usuário (CLAUDE.md §4.7).
   */
  it('mostra a pergunta completa e explica o porquê em tom informativo', async () => {
    await renderDialog();

    expect(screen.getByText('Quer confirmar com uma segunda medição?')).toBeTruthy();
    expect(screen.getByText(/O protocolo clínico sugere medir de novo em cerca de 1 minuto/)).toBeTruthy();
  });

  it('não mostra nada quando não está visível', async () => {
    await renderDialog({ visible: false });

    expect(screen.queryByText('Quer confirmar com uma segunda medição?')).toBeNull();
  });
});

describe('SecondMeasurementOfferDialog — contador', () => {
  it('mostra os segundos restantes como sugestão enquanto ainda há espera', async () => {
    await renderDialog({ secondsRemaining: 42 });

    expect(screen.getByText('Sugestão: aguarde mais 42s')).toBeTruthy();
  });

  /** O contador nunca bloqueia — chegar a zero vira convite, não um "Aguarde..." que soa como trava. */
  it('troca o contador por um convite quando chega a zero', async () => {
    await renderDialog({ secondsRemaining: 0 });

    expect(screen.getByText('Pode medir quando quiser')).toBeTruthy();
    expect(screen.queryByText(/aguarde mais/)).toBeNull();
  });
});

describe('SecondMeasurementOfferDialog — as duas saídas', () => {
  it('oferece medir de novo ou dispensar', async () => {
    await renderDialog();

    expect(screen.getByRole('button', { name: 'Medir novamente' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Não, obrigado' })).toBeTruthy();
  });

  it('dispara onAccept ao tocar em "Medir novamente"', async () => {
    await renderDialog();

    await fireEvent.press(screen.getByRole('button', { name: 'Medir novamente' }));

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
  });

  it('dispara onDecline ao tocar em "Não, obrigado"', async () => {
    await renderDialog();

    await fireEvent.press(screen.getByRole('button', { name: 'Não, obrigado' }));

    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onAccept).not.toHaveBeenCalled();
  });
});
