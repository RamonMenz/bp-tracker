import { fireEvent, render, screen } from '@testing-library/react-native';

import type { SessionReading } from '@/domain/session-average';

import { SecondMeasurementSummaryDialog } from './SecondMeasurementSummaryDialog';

const AVERAGE: SessionReading = { systolic: 125, diastolic: 85, pulse: 75 };

const onDismiss = jest.fn();

function renderDialog(props: Partial<React.ComponentProps<typeof SecondMeasurementSummaryDialog>> = {}) {
  return render(
    <SecondMeasurementSummaryDialog visible average={AVERAGE} onDismiss={onDismiss} {...props} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SecondMeasurementSummaryDialog — o resumo', () => {
  it('mostra a média das duas medições com a mesma cara do valor grande da última medição', async () => {
    await renderDialog();

    expect(screen.getByText('Média das duas medições')).toBeTruthy();
    expect(screen.getByText('125/85')).toBeTruthy();
    expect(screen.getByText('75')).toBeTruthy();
  });

  /** CLAUDE.md §4.7: o leitor de tela deve anunciar "125 por 85", nunca "125 barra 85". */
  it('anuncia o par com "por", não com a barra', async () => {
    await renderDialog();

    expect(screen.getByLabelText(/125 por 85 milímetros de mercúrio/)).toBeTruthy();
  });

  it('classifica a média, não uma das medições isoladas', async () => {
    await renderDialog();

    // 125/85: a diastólica em 85 é o que decide — estágio 1, não "elevada" pela sistólica.
    expect(screen.getByLabelText('Categoria: Estágio 1')).toBeTruthy();
  });

  /** A média substituiu a primeira leitura no mesmo documento — não é um resumo à parte. */
  it('diz que a média foi salva no histórico', async () => {
    await renderDialog();

    expect(screen.getByText('A média das duas medições foi salva no seu histórico.')).toBeTruthy();
  });

  it('não mostra o pulso quando a média não tem pulso — nada de "null" na tela', async () => {
    await renderDialog({ average: { ...AVERAGE, pulse: null } });

    expect(screen.queryByText('bpm')).toBeNull();
  });

  it('não mostra nada quando não está visível', async () => {
    await renderDialog({ visible: false });

    expect(screen.queryByText('Média das duas medições')).toBeNull();
  });
});

describe('SecondMeasurementSummaryDialog — concluir', () => {
  it('dispara onDismiss ao tocar em "Concluir"', async () => {
    await renderDialog();

    await fireEvent.press(screen.getByRole('button', { name: 'Concluir' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
