import { fireEvent, render, screen } from '@testing-library/react-native';

import { ExportPdfDialog } from './ExportPdfDialog';

const onGenerate = jest.fn();
const onCancel = jest.fn();

// Mesmo stub do ExportCsvDialog.test.tsx — ver o porquê lá.
jest.mock('@/components/ui/DateTimeField', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- ver comentário acima
  DateTimeField: require('./__testutils__/DateTimeFieldStub').DateTimeFieldStub,
}));

function renderDialog(props: Partial<React.ComponentProps<typeof ExportPdfDialog>> = {}) {
  return render(
    <ExportPdfDialog visible isGenerating={false} error={null} onGenerate={onGenerate} onCancel={onCancel} {...props} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date(2026, 10, 26, 10, 0, 0));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ExportPdfDialog', () => {
  it('explica a geração local e começa em "Últimos 30 dias"', async () => {
    await renderDialog();

    expect(screen.getByText(/preparado neste aparelho/)).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Últimos 30 dias' }).props.accessibilityState).toMatchObject({ checked: true });

    await fireEvent.press(screen.getByRole('button', { name: 'Gerar PDF' }));
    expect(onGenerate).toHaveBeenCalledWith({ kind: 'last30' });
  });

  it.each([
    ['Últimos 7 dias', 'last7'],
    ['Tudo', 'all'],
  ] as const)('atalho "%s" pede o período %s', async (label, kind) => {
    await renderDialog();

    await fireEvent.press(screen.getByRole('radio', { name: label }));
    await fireEvent.press(screen.getByRole('button', { name: 'Gerar PDF' }));

    expect(onGenerate).toHaveBeenCalledWith({ kind });
  });

  it('personalizado repassa as datas escolhidas', async () => {
    await renderDialog();

    await fireEvent.press(screen.getByRole('radio', { name: 'Personalizado' }));
    await fireEvent.press(screen.getByLabelText(/Início do período: .* Toque para editar\./));
    await fireEvent.changeText(screen.getByLabelText('Início do período'), '2026-10-01');
    await fireEvent.press(screen.getByLabelText(/Fim do período: .* Toque para editar\./));
    await fireEvent.changeText(screen.getByLabelText('Fim do período'), '2026-10-23');
    await fireEvent.press(screen.getByRole('button', { name: 'Gerar PDF' }));

    expect(onGenerate).toHaveBeenCalledWith({
      kind: 'custom',
      start: new Date(2026, 9, 1),
      end: new Date(2026, 9, 23),
    });
  });

  it('bloqueia data final anterior à inicial', async () => {
    await renderDialog();

    await fireEvent.press(screen.getByRole('radio', { name: 'Personalizado' }));
    await fireEvent.press(screen.getByLabelText(/Início do período: .* Toque para editar\./));
    await fireEvent.changeText(screen.getByLabelText('Início do período'), '2026-10-10');
    await fireEvent.press(screen.getByLabelText(/Fim do período: .* Toque para editar\./));
    await fireEvent.changeText(screen.getByLabelText('Fim do período'), '2026-10-01');

    expect(screen.getByText('A data de fim deve ser igual ou posterior à de início.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Gerar PDF' }));
    expect(onGenerate).not.toHaveBeenCalled();
  });

  it('durante a geração não aceita outro pedido, mas cancelar continua disponível', async () => {
    await renderDialog({ isGenerating: true });

    expect(screen.getByText('Preparando o relatório…')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Gerar PDF/ }));
    expect(onGenerate).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('mostra o erro amigável recebido', async () => {
    await renderDialog({ error: 'Nenhuma medição no período selecionado.' });

    expect(screen.getByText('Nenhuma medição no período selecionado.')).toBeTruthy();
  });
});
