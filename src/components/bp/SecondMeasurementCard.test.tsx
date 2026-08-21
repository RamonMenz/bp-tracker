import { fireEvent, render, screen } from '@testing-library/react-native';

import type { SessionReading } from '@/domain/session-average';

import { SecondMeasurementCard } from './SecondMeasurementCard';

const AVERAGE: SessionReading = { systolic: 125, diastolic: 85, pulse: 75 };

const onAccept = jest.fn();
const onSubmitSecondMeasurement = jest.fn();
const onDecline = jest.fn();
const onDismissSummary = jest.fn();

function renderCard(props: Partial<React.ComponentProps<typeof SecondMeasurementCard>> = {}) {
  return render(
    <SecondMeasurementCard
      state="offer"
      secondsRemaining={60}
      average={null}
      isSaving={false}
      saveError={null}
      onAccept={onAccept}
      onSubmitSecondMeasurement={onSubmitSecondMeasurement}
      onDecline={onDecline}
      onDismissSummary={onDismissSummary}
      {...props}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SecondMeasurementCard — estado offer', () => {
  it('convida para a segunda medição em tom informativo, sem prometer precisão médica', async () => {
    await renderCard();

    expect(screen.getByText('Quer confirmar com uma segunda medição?')).toBeTruthy();
    expect(screen.getByText(/O protocolo clínico sugere medir de novo em cerca de 1 minuto/)).toBeTruthy();
  });

  it('mostra o contador como texto de apoio enquanto ainda há segundos sugeridos', async () => {
    await renderCard({ secondsRemaining: 42 });

    expect(screen.getByText('Sugestão: aguarde mais 42s')).toBeTruthy();
  });

  /** O contador nunca bloqueia — chegar a zero vira convite, não um "Aguarde..." que soa como trava. */
  it('troca o contador por um convite quando chega a zero', async () => {
    await renderCard({ secondsRemaining: 0 });

    expect(screen.getByText('Pode medir quando quiser')).toBeTruthy();
    expect(screen.queryByText(/aguarde mais/)).toBeNull();
  });

  it('oferece as duas saídas: medir de novo ou dispensar', async () => {
    await renderCard();

    expect(screen.getByRole('button', { name: 'Medir novamente' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Não, obrigado' })).toBeTruthy();
  });

  it('dispara onAccept ao tocar em "Medir novamente"', async () => {
    await renderCard();

    await fireEvent.press(screen.getByRole('button', { name: 'Medir novamente' }));

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
  });

  it('dispara onDecline ao tocar em "Não, obrigado"', async () => {
    await renderCard();

    await fireEvent.press(screen.getByRole('button', { name: 'Não, obrigado' }));

    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onAccept).not.toHaveBeenCalled();
  });
});

/**
 * 'measuring' deixou de ser um card na tela: os valores da segunda medição são digitados no
 * pop-up (SecondMeasurementDialog, com testes próprios), e não mais no ReadingForm grande
 * reaproveitado. O que se verifica aqui é só o encaixe — que o card monta o pop-up e repassa as
 * props certas.
 */
describe('SecondMeasurementCard — estado measuring', () => {
  it('abre o pop-up com os campos da segunda medição, sem observação nem horário', async () => {
    await renderCard({ state: 'measuring' });

    expect(screen.getByText('Medição 2 de 2')).toBeTruthy();
    expect(screen.getByLabelText('Sistólica')).toBeTruthy();
    expect(screen.getByLabelText('Diastólica')).toBeTruthy();
    expect(screen.getByLabelText('Pulso')).toBeTruthy();
    expect(screen.queryByLabelText('Observação')).toBeNull();
  });

  it('não mostra mais o convite nem o contador — o pop-up substituiu o card de fundo', async () => {
    await renderCard({ state: 'measuring', secondsRemaining: 30 });

    expect(screen.queryByRole('button', { name: 'Medir novamente' })).toBeNull();
    expect(screen.queryByText('Sugestão: aguarde mais 30s')).toBeNull();
  });

  it('repassa os valores digitados no pop-up para onSubmitSecondMeasurement', async () => {
    await renderCard({ state: 'measuring' });

    await fireEvent.changeText(screen.getByLabelText('Sistólica'), '130');
    await fireEvent.changeText(screen.getByLabelText('Diastólica'), '90');

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar segunda medição' }));

    expect(onSubmitSecondMeasurement).toHaveBeenCalledWith({ systolic: '130', diastolic: '90', pulse: '' });
  });

  it('dispara onDecline ao tocar em "Cancelar" — dá para desistir depois de aceitar', async () => {
    await renderCard({ state: 'measuring' });

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('mostra no pop-up o erro amigável de gravação vindo do fluxo', async () => {
    await renderCard({ state: 'measuring', saveError: 'Não foi possível salvar sua medição. Tente novamente.' });

    expect(screen.getByText('Não foi possível salvar sua medição. Tente novamente.')).toBeTruthy();
  });
});

describe('SecondMeasurementCard — estado summary', () => {
  it('mostra a média das duas medições com a mesma cara do valor grande da última medição', async () => {
    await renderCard({ state: 'summary', average: AVERAGE, secondsRemaining: 0 });

    expect(screen.getByText('Média das duas medições')).toBeTruthy();
    expect(screen.getByText('125/85')).toBeTruthy();
    expect(screen.getByText('75')).toBeTruthy();
  });

  /** CLAUDE.md §4.7: o leitor de tela deve anunciar "125 por 85", nunca "125 barra 85". */
  it('anuncia o par com "por", não com a barra', async () => {
    await renderCard({ state: 'summary', average: AVERAGE, secondsRemaining: 0 });

    expect(screen.getByLabelText(/125 por 85 milímetros de mercúrio/)).toBeTruthy();
  });

  it('classifica a média, não uma das medições isoladas', async () => {
    await renderCard({ state: 'summary', average: AVERAGE, secondsRemaining: 0 });

    // 125/85: a diastólica em 85 é o que decide — estágio 1, não "elevada" pela sistólica.
    expect(screen.getByLabelText('Categoria: Estágio 1')).toBeTruthy();
  });

  /** A média substituiu a primeira leitura no mesmo documento — não é um resumo à parte. */
  it('diz que a média foi salva no histórico', async () => {
    await renderCard({ state: 'summary', average: AVERAGE, secondsRemaining: 0 });

    expect(screen.getByText('A média das duas medições foi salva no seu histórico.')).toBeTruthy();
  });

  it('dispara onDismissSummary ao tocar em "Concluir"', async () => {
    await renderCard({ state: 'summary', average: AVERAGE, secondsRemaining: 0 });

    await fireEvent.press(screen.getByRole('button', { name: 'Concluir' }));

    expect(onDismissSummary).toHaveBeenCalledTimes(1);
  });

  it('não mostra o pulso quando a média não tem pulso — nada de "null" na tela', async () => {
    await renderCard({ state: 'summary', average: { ...AVERAGE, pulse: null }, secondsRemaining: 0 });

    expect(screen.queryByText('bpm')).toBeNull();
  });
});
