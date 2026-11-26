import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ReportReview } from '@/features/report/useReportPdf';

import { ExportPdfDialog } from './ExportPdfDialog';

const onPrepare = jest.fn();
const onSave = jest.fn();
const onRetry = jest.fn();
const onChangePeriod = jest.fn();
const onCancel = jest.fn();

// Mesmo stub do ExportCsvDialog.test.tsx — ver o porquê lá.
jest.mock('@/components/ui/DateTimeField', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- ver comentário acima
  DateTimeField: require('./__testutils__/DateTimeFieldStub').DateTimeFieldStub,
}));

const REVIEW: ReportReview = {
  fileName: 'aferi-relatorio-2026-10-28_a_2026-11-26.pdf',
  previewUrl: 'blob:previa-sintetica',
  requestedPeriod: 'Últimos 30 dias — 28/10/2026 a 26/11/2026 (até o horário da geração)',
  coverageLines: ['Registros incluídos: 3', 'Dias com registro: 2'],
  averages: [
    { label: 'Sistólica média', value: '130,0 mmHg', denominator: 'N = 3 registros' },
    { label: 'Diastólica média', value: '90,0 mmHg', denominator: 'N = 3 registros' },
    { label: 'Pulso médio', value: '70,0 bpm', denominator: 'N = 2 de 3 registros com pulso informado' },
  ],
  isCoverageConfirmed: true,
  coverageStatement: 'Leitura confirmada pelo servidor no momento da geração; nenhum registro do período foi omitido.',
  warnings: [],
};

const PARTIAL_REVIEW: ReportReview = {
  ...REVIEW,
  isCoverageConfirmed: false,
  coverageStatement: 'Cobertura não confirmada: este relatório pode não conter todo o histórico do período (ver avisos).',
  warnings: ['Dados lidos do armazenamento local do aparelho, sem confirmação do servidor.'],
};

function renderDialog(props: Partial<React.ComponentProps<typeof ExportPdfDialog>> = {}) {
  return render(
    <ExportPdfDialog
      visible
      stage="idle"
      review={null}
      error={null}
      onPrepare={onPrepare}
      onSave={onSave}
      onRetry={onRetry}
      onChangePeriod={onChangePeriod}
      onCancel={onCancel}
      {...props}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date(2026, 10, 26, 10, 0, 0));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ExportPdfDialog — escolha do período', () => {
  it('explica a geração local e a revisão, e começa em "Últimos 30 dias"', async () => {
    await renderDialog();

    expect(screen.getByText(/preparado neste aparelho.*revisa a prévia antes de salvar/)).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Últimos 30 dias' }).props.accessibilityState).toMatchObject({ checked: true });

    await fireEvent.press(screen.getByRole('button', { name: 'Preparar relatório' }));
    expect(onPrepare).toHaveBeenCalledWith({ kind: 'last30' });
  });

  it.each([
    ['Últimos 7 dias', 'last7'],
    ['Tudo', 'all'],
  ] as const)('atalho "%s" pede o período %s', async (label, kind) => {
    await renderDialog();

    await fireEvent.press(screen.getByRole('radio', { name: label }));
    await fireEvent.press(screen.getByRole('button', { name: 'Preparar relatório' }));

    expect(onPrepare).toHaveBeenCalledWith({ kind });
  });

  it('personalizado repassa as datas escolhidas', async () => {
    await renderDialog();

    await fireEvent.press(screen.getByRole('radio', { name: 'Personalizado' }));
    await fireEvent.press(screen.getByLabelText(/Início do período: .* Toque para editar\./));
    await fireEvent.changeText(screen.getByLabelText('Início do período'), '2026-10-01');
    await fireEvent.press(screen.getByLabelText(/Fim do período: .* Toque para editar\./));
    await fireEvent.changeText(screen.getByLabelText('Fim do período'), '2026-10-23');
    await fireEvent.press(screen.getByRole('button', { name: 'Preparar relatório' }));

    expect(onPrepare).toHaveBeenCalledWith({ kind: 'custom', start: new Date(2026, 9, 1), end: new Date(2026, 9, 23) });
  });

  it('bloqueia data final anterior à inicial', async () => {
    await renderDialog();

    await fireEvent.press(screen.getByRole('radio', { name: 'Personalizado' }));
    await fireEvent.press(screen.getByLabelText(/Início do período: .* Toque para editar\./));
    await fireEvent.changeText(screen.getByLabelText('Início do período'), '2026-10-10');
    await fireEvent.press(screen.getByLabelText(/Fim do período: .* Toque para editar\./));
    await fireEvent.changeText(screen.getByLabelText('Fim do período'), '2026-10-01');

    expect(screen.getByText('A data de fim deve ser igual ou posterior à de início.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Preparar relatório' }));
    expect(onPrepare).not.toHaveBeenCalled();
  });

  it('durante a preparação não aceita outro pedido, mas cancelar continua disponível', async () => {
    await renderDialog({ stage: 'preparing' });

    expect(screen.getByText('Preparando o relatório…')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Preparar relatório/ }));
    expect(onPrepare).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('mostra o erro amigável recebido (ex.: limite de volume)', async () => {
    await renderDialog({ error: 'O período tem 3.001 medições e o relatório comporta até 3.000. Escolha um período menor.' });

    expect(screen.getByText(/Escolha um período menor\./)).toBeTruthy();
  });
});

describe('ExportPdfDialog — revisão antes de salvar', () => {
  it('mostra resumo e ações; salvar só por ação explícita', async () => {
    await renderDialog({ stage: 'review', review: REVIEW });

    expect(screen.getByText('Revisar relatório')).toBeTruthy();
    expect(screen.getByText(REVIEW.requestedPeriod)).toBeTruthy();
    expect(screen.getByText('Registros incluídos: 3')).toBeTruthy();
    expect(screen.getByText('Sistólica média: 130,0 mmHg (N = 3 registros)')).toBeTruthy();
    expect(screen.getByText(/fora do controle do Aferi/)).toBeTruthy();
    expect(screen.queryByText('Cobertura não confirmada')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
    expect(onSave).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar PDF' }));
    expect(onSave).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Alterar período' }));
    expect(onChangePeriod).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cobertura não confirmada: aviso ANTES de salvar, recorte parcial explícito e "Tentar novamente"', async () => {
    await renderDialog({ stage: 'review', review: PARTIAL_REVIEW });

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Cobertura não confirmada')).toBeTruthy();
    expect(screen.getByText(`• ${PARTIAL_REVIEW.warnings[0]}`)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Salvar PDF' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar recorte parcial em PDF' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('"Alterar período" volta à escolha anterior, preservada', async () => {
    const { rerender } = await renderDialog();

    await fireEvent.press(screen.getByRole('radio', { name: 'Últimos 7 dias' }));
    await rerender(
      <ExportPdfDialog
        visible
        stage="review"
        review={REVIEW}
        error={null}
        onPrepare={onPrepare}
        onSave={onSave}
        onRetry={onRetry}
        onChangePeriod={onChangePeriod}
        onCancel={onCancel}
      />,
    );
    expect(screen.queryByRole('radio', { name: 'Últimos 7 dias' })).toBeNull();

    await rerender(
      <ExportPdfDialog
        visible
        stage="idle"
        review={null}
        error={null}
        onPrepare={onPrepare}
        onSave={onSave}
        onRetry={onRetry}
        onChangePeriod={onChangePeriod}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Últimos 7 dias' }).props.accessibilityState).toMatchObject({ checked: true });
  });
});
