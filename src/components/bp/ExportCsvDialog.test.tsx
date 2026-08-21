import { fireEvent, render, screen } from '@testing-library/react-native';

import { ExportCsvDialog } from './ExportCsvDialog';

const onExport = jest.fn();
const onCancel = jest.fn();

/**
 * `@/components/ui/DateTimeField` resolve, no Jest, para `DateTimeField.native.tsx` — o
 * `@react-native-community/datetimepicker` real por baixo (sem mock, disparar 'change' nele exige
 * `event.nativeEvent.timestamp`, que não existe num evento sintético comum). O que este teste
 * cobre é a lógica do PRÓPRIO ExportCsvDialog (abrir/fechar o seletor, validar o range, montá-lo),
 * não a conversão texto↔Date do seletor — essa já tem cobertura própria em
 * DateTimeField.web.test.tsx. `DateTimeFieldStub` (módulo à parte — ver o porquê lá) troca o
 * seletor por um TextInput simples que aceita "YYYY-MM-DD" e repassa como Date à meia-noite local.
 */
jest.mock('@/components/ui/DateTimeField', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- ver comentário acima
  DateTimeField: require('./__testutils__/DateTimeFieldStub').DateTimeFieldStub,
}));

function renderDialog(props: Partial<React.ComponentProps<typeof ExportCsvDialog>> = {}) {
  return render(
    <ExportCsvDialog visible isExporting={false} error={null} onExport={onExport} onCancel={onCancel} {...props} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date(2026, 7, 21, 10, 0, 0));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ExportCsvDialog — atalhos de período', () => {
  it('começa em "Tudo" e chama onExport(undefined) — mantém o comportamento atual por padrão', async () => {
    await renderDialog();

    const allOption = screen.getByRole('radio', { name: 'Tudo' });
    expect(allOption.props.accessibilityState?.checked).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Exportar' }));

    expect(onExport).toHaveBeenCalledWith(undefined);
  });

  it('"Últimos 7 dias" gera um range de 7 dias terminando agora', async () => {
    await renderDialog();

    await fireEvent.press(screen.getByRole('radio', { name: 'Últimos 7 dias' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Exportar' }));

    expect(onExport).toHaveBeenCalledWith({
      start: new Date(2026, 7, 14, 10, 0, 0),
      end: new Date(2026, 7, 21, 10, 0, 0),
    });
  });

  it('"Últimos 30 dias" gera um range de 30 dias terminando agora', async () => {
    await renderDialog();

    await fireEvent.press(screen.getByRole('radio', { name: 'Últimos 30 dias' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Exportar' }));

    expect(onExport).toHaveBeenCalledWith({
      start: new Date(2026, 6, 22, 10, 0, 0),
      end: new Date(2026, 7, 21, 10, 0, 0),
    });
  });

  it('só um atalho fica marcado por vez', async () => {
    await renderDialog();

    await fireEvent.press(screen.getByRole('radio', { name: 'Últimos 7 dias' }));

    expect(screen.getByRole('radio', { name: 'Últimos 7 dias' }).props.accessibilityState?.checked).toBe(true);
    expect(screen.getByRole('radio', { name: 'Tudo' }).props.accessibilityState?.checked).toBe(false);
  });
});

describe('ExportCsvDialog — período personalizado', () => {
  it('revela os campos de início e fim só quando "Personalizado" é escolhido', async () => {
    await renderDialog();

    expect(screen.queryByLabelText(/Início do período/)).toBeNull();

    await fireEvent.press(screen.getByRole('radio', { name: 'Personalizado' }));

    expect(screen.getByLabelText(/Início do período/)).toBeTruthy();
    expect(screen.getByLabelText(/Fim do período/)).toBeTruthy();
  });

  it('entrega start/end do range personalizado, com o fim no fim do dia', async () => {
    await renderDialog();

    await fireEvent.press(screen.getByRole('radio', { name: 'Personalizado' }));

    // Os dois campos nascem em "hoje" (mode="date", meia-noite local) — troca só o início, para
    // exercitar um range de verdade em vez de início === fim.
    await fireEvent.press(screen.getByLabelText(/Início do período/));
    await fireEvent.changeText(screen.getByLabelText('Início do período'), '2026-08-01');

    await fireEvent.press(screen.getByRole('button', { name: 'Exportar' }));

    expect(onExport).toHaveBeenCalledWith({
      start: new Date(2026, 7, 1),
      end: new Date(2026, 7, 21, 23, 59, 59, 999),
    });
  });

  it('bloqueia e explica quando a data de fim é anterior à de início', async () => {
    await renderDialog();

    await fireEvent.press(screen.getByRole('radio', { name: 'Personalizado' }));

    await fireEvent.press(screen.getByLabelText(/Fim do período/));
    await fireEvent.changeText(screen.getByLabelText('Fim do período'), '2026-08-01');

    await fireEvent.press(screen.getByLabelText(/Início do período/));
    await fireEvent.changeText(screen.getByLabelText('Início do período'), '2026-08-10');

    expect(screen.getByText('A data de fim deve ser igual ou posterior à de início.')).toBeTruthy();

    const exportButton = screen.getByRole('button', { name: 'Exportar' });
    expect(exportButton.props.accessibilityState?.disabled).toBe(true);

    await fireEvent.press(exportButton);
    expect(onExport).not.toHaveBeenCalled();
  });

  it('não bloqueia quando início e fim são o mesmo dia', async () => {
    await renderDialog();

    await fireEvent.press(screen.getByRole('radio', { name: 'Personalizado' }));

    expect(screen.queryByText('A data de fim deve ser igual ou posterior à de início.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Exportar' }).props.accessibilityState?.disabled).toBe(false);
  });
});

describe('ExportCsvDialog — cancelar, carregando e erro', () => {
  it('dispara onCancel ao tocar em "Cancelar"', async () => {
    await renderDialog();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onExport).not.toHaveBeenCalled();
  });

  it('marca "Exportar" como ocupado e trava "Cancelar" durante a exportação', async () => {
    await renderDialog({ isExporting: true });

    const exportButton = screen.getByRole('button', { name: 'Exportar' });
    expect(exportButton.props.accessibilityState?.busy).toBe(true);
    expect(exportButton.props.accessibilityState?.disabled).toBe(true);

    expect(screen.getByRole('button', { name: 'Cancelar' }).props.accessibilityState?.disabled).toBe(true);
  });

  it('mostra a mensagem amigável recebida por prop', async () => {
    await renderDialog({ error: 'Nenhuma medição no período selecionado.' });

    expect(screen.getByText('Nenhuma medição no período selecionado.')).toBeTruthy();
  });
});
