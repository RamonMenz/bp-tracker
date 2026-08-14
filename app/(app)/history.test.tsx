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

/**
 * Regressão do bug em que a exclusão não funcionava na web: a confirmação usava `Alert.alert`,
 * que o react-native-web define como método vazio (`static alert() {}`) — o diálogo nunca
 * aparecia e o array de botões, que carregava o onPress real, era descartado em silêncio.
 * Hoje quem confirma é o ConfirmDialog (sobre o Modal), que renderiza nas duas plataformas.
 *
 * `getByLabelText('Excluir medição')` resolve para o botão PERSISTENTE de ReadingRow — o botão
 * revelado pelo swipe tem o mesmo rótulo, mas fica escondido da árvore de acessibilidade de
 * propósito (só um dos dois pode ser alcançável, senão o rótulo vira ambíguo). A cobertura dos
 * dois caminhos (botão persistente e a accessibilityAction "delete") mora em ReadingRow.test.tsx,
 * mais perto do componente que decide qual deles fica exposto.
 */
describe('HistoryScreen — exclusão de medição', () => {
  it('exclui a medição ao confirmar no diálogo aberto pela linha do histórico', async () => {
    await render(<HistoryScreen />);

    fireEvent.press(screen.getByLabelText('Excluir medição'));

    // O diálogo precisa existir de fato — é exatamente o que faltava na web.
    expect(await screen.findByText('Excluir medição?')).toBeTruthy();
    expect(screen.getByText('Essa ação não pode ser desfeita.')).toBeTruthy();

    // Abrir o diálogo não pode, sozinho, apagar nada.
    expect(deleteReadingMock).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Excluir' }));

    expect(deleteReadingMock).toHaveBeenCalledTimes(1);
    expect(deleteReadingMock).toHaveBeenCalledWith(READING.id);
  });

  it('não exclui nada ao cancelar a confirmação', async () => {
    await render(<HistoryScreen />);

    fireEvent.press(screen.getByLabelText('Excluir medição'));
    // Confirma que o diálogo abriu de fato — sem isto o teste passaria mesmo se o "Cancelar"
    // nunca tivesse chegado a existir.
    expect(await screen.findByText('Excluir medição?')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    // A asserção é sobre o efeito, não sobre a saída do diálogo da árvore: o Modal do RN mantém
    // o conteúdo montado depois de exibido uma vez no iOS (`_shouldShowModal`), então procurar
    // pelo título aqui testaria o interno do RN, não o nosso comportamento.
    expect(deleteReadingMock).not.toHaveBeenCalled();
  });
});

/**
 * BUG-06: useDeleteReading é um hook só, compartilhado pela lista inteira — sem identificar QUAL
 * linha está em exclusão, ou o indicador acende na lista toda, ou não acende em lugar nenhum.
 */
describe('HistoryScreen — progresso da exclusão', () => {
  it('mostra o indicador só na linha em exclusão e trava um novo pedido enquanto ela está em voo', async () => {
    // Nunca resolve nesta suíte: é o que mantém a exclusão "em voo" pelo tempo da asserção — sem
    // isso o `await` de handleConfirmDelete seguiria adiante já no próximo microtask.
    deleteReadingMock.mockReturnValue(new Promise<boolean>(() => {}));
    useDeleteReading.mockReturnValue({ deleteReading: deleteReadingMock, isDeleting: true, error: null });

    await render(<HistoryScreen />);

    fireEvent.press(screen.getByLabelText('Excluir medição'));
    expect(await screen.findByText('Excluir medição?')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByLabelText('Excluindo medição')).toBeTruthy();

    // Trava de duplo toque: pedir a exclusão de novo enquanto a primeira está em voo não pode
    // reabrir o diálogo de confirmação.
    fireEvent.press(screen.getByLabelText('Excluir medição'));
    expect(screen.queryByText('Excluir medição?')).toBeNull();
  });
});

/**
 * BUG-07: deleteError/exportError nasciam dentro do ListHeaderComponent da FlashList — o topo
 * absoluto da lista. Excluir uma linha várias rolagens abaixo deixava o erro fora da área visível.
 * Aqui eles vivem fora da lista (irmãos da FlashList na árvore), então aparecem qualquer que seja
 * a posição da rolagem.
 */
describe('HistoryScreen — feedback ancorado fora da lista', () => {
  it('exibe o erro de exclusão', async () => {
    const message = 'Não foi possível excluir a medição. Tente novamente.';
    useDeleteReading.mockReturnValue({ deleteReading: deleteReadingMock, isDeleting: false, error: message });

    await render(<HistoryScreen />);

    expect(screen.getByText(message)).toBeTruthy();
  });

  it('exibe o erro de exportação', async () => {
    const message = 'Não foi possível exportar o arquivo. Tente novamente.';
    useExportCsv.mockReturnValue({ exportCsv: jest.fn(), isExporting: false, error: message });

    await render(<HistoryScreen />);

    expect(screen.getByText(message)).toBeTruthy();
  });
});
