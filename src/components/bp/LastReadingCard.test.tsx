import { render } from '@testing-library/react-native';

import type { ReadingListItem } from '@/features/readings/useReadings';

import { LastReadingCard } from './LastReadingCard';

function makeReading(overrides: Partial<ReadingListItem> = {}): ReadingListItem {
  return {
    id: 'reading-1',
    systolic: 128,
    diastolic: 82,
    pulse: 70,
    measuredAt: new Date(2026, 7, 13, 8, 30, 0),
    createdAt: new Date(2026, 7, 13, 8, 30, 0),
    note: null,
    source: 'manual',
    hasPendingWrites: false,
    ...overrides,
  };
}

describe('LastReadingCard', () => {
  it('mostra o par sistólica/diastólica da medição mais recente', async () => {
    const { getByText } = await render(<LastReadingCard lastReading={makeReading()} isLoading={false} />);

    expect(getByText('128/82')).toBeTruthy();
    expect(getByText('70')).toBeTruthy();
  });

  /** CLAUDE.md §4.7: o leitor de tela deve anunciar "128 por 82", nunca "128 barra 82". */
  it('anuncia o par com "por", não com a barra', async () => {
    const { getByLabelText } = await render(<LastReadingCard lastReading={makeReading()} isLoading={false} />);

    expect(getByLabelText(/128 por 82 milímetros de mercúrio/)).toBeTruthy();
  });

  it('sinaliza a medição que ainda não sincronizou, sem tratá-la como erro', async () => {
    const { getByText } = await render(
      <LastReadingCard lastReading={makeReading({ hasPendingWrites: true })} isLoading={false} />,
    );

    expect(getByText('· Pendente de sincronização')).toBeTruthy();
  });

  it('convida a registrar quando ainda não há nenhuma medição', async () => {
    const { getByText } = await render(<LastReadingCard lastReading={null} isLoading={false} />);

    expect(getByText(/Nenhuma medição registrada ainda/)).toBeTruthy();
  });
});
