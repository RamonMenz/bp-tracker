import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ReadingListItem } from '@/features/readings/useReadings';

import { FlashListStub as mockFlashListStub } from './__mocks__/flash-list-stub';
import HistoryScreen from './history';

const deleteReadingMock = jest.fn<Promise<boolean>, [string]>();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// FlashList real depende de import ESM que o transformIgnorePatterns do projeto não cobre (só
// firebase/lucide-react-native têm exceção — ver jest.config.js). Não é o alvo deste teste, então
// troca por uma lista simples que respeita o mesmo contrato (data/renderItem/ListHeaderComponent).
// Implementação em arquivo à parte: ver app/(app)/__mocks__/flash-list-stub.tsx.
jest.mock('@shopify/flash-list', () => ({
  FlashList: mockFlashListStub,
}));

jest.mock('@/features/readings/useReadings', () => ({
  useReadings: jest.fn(),
}));

jest.mock('@/features/readings/useReadingsTrend', () => ({
  useReadingsTrend: jest.fn(),
}));

jest.mock('@/features/export/useExportCsv', () => ({
  useExportCsv: jest.fn(),
}));

jest.mock('@/features/readings/useDeleteReading', () => ({
  useDeleteReading: jest.fn(),
}));

// TrendChart puxa react-native-gifted-charts, que publica ESM cru (mesmo problema do FlashList)
// e não tem exceção no transformIgnorePatterns do projeto. O gráfico não é o alvo deste teste.
jest.mock('@/components/bp/TrendChart', () => ({
  TrendChart: () => null,
}));

const { useReadings } = jest.requireMock('@/features/readings/useReadings') as {
  useReadings: jest.Mock;
};
const { useReadingsTrend } = jest.requireMock('@/features/readings/useReadingsTrend') as {
  useReadingsTrend: jest.Mock;
};
const { useExportCsv } = jest.requireMock('@/features/export/useExportCsv') as {
  useExportCsv: jest.Mock;
};
const { useDeleteReading } = jest.requireMock('@/features/readings/useDeleteReading') as {
  useDeleteReading: jest.Mock;
};

const READING: ReadingListItem = {
  id: 'reading-1',
  systolic: 128,
  diastolic: 82,
  pulse: 70,
  measuredAt: new Date(2026, 7, 13, 8, 30, 0),
  createdAt: new Date(2026, 7, 13, 8, 30, 0),
  note: null,
  source: 'manual',
  hasPendingWrites: false,
};

beforeEach(() => {
  jest.clearAllMocks();

  useReadings.mockReturnValue({ readings: [READING], isLoading: false, error: null });
  useReadingsTrend.mockReturnValue({ trend7d: [], trend30d: [], isLoading: false, error: null });
  useExportCsv.mockReturnValue({ exportCsv: jest.fn(), isExporting: false, error: null });
  useDeleteReading.mockReturnValue({ deleteReading: deleteReadingMock, isDeleting: false, error: null });
});

describe('HistoryScreen — exclusão de medição', () => {
  /**
   * Bug: handleRequestDelete (app/(app)/history.tsx) usa Alert.alert para confirmar a exclusão.
   * Alert.alert é um no-op na web (react-native-web não implementa diálogo nativo nenhum), então
   * nenhum diálogo de confirmação aparece e o botão "Excluir" da confirmação nunca existe na
   * árvore para o usuário tocar — a exclusão simplesmente não acontece.
   *
   * Este teste dispara a exclusão do jeito que o usuário real faria (aciona a ação da linha,
   * depois confirma no diálogo) e falha porque esse diálogo nunca é renderizado.
   */
  it('exclui a medição ao confirmar a exclusão pela linha do histórico', async () => {
    await render(<HistoryScreen />);

    fireEvent.press(screen.getByLabelText('Excluir medição'));

    const confirmButton = await screen.findByRole('button', { name: 'Excluir' });
    fireEvent.press(confirmButton);

    expect(deleteReadingMock).toHaveBeenCalledTimes(1);
    expect(deleteReadingMock).toHaveBeenCalledWith(READING.id);
  });
});
