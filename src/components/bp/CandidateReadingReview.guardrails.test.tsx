import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '@/components/ui/Button';
import type { CandidateSet } from '@/domain/assisted-entry';
import { useCandidateReview } from '@/features/assisted-entry/useCandidateReview';

import { CandidateReadingReview } from './CandidateReadingReview';

jest.mock('@/components/ui/DateTimeField', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  DateTimeField: require('./__testutils__/DateTimeFieldStub').DateTimeFieldStub,
}));

const candidates: CandidateSet = { modality: 'photo', capturedAtMs: 1793001600000, fields: {
  systolic: { status: 'candidate', value: 120, basis: 'label' }, diastolic: { status: 'candidate', value: 80, basis: 'label' }, pulse: { status: 'missing' },
} };
let acknowledge: (value: boolean) => void;
const confirm = jest.fn(() => new Promise<boolean>(resolve => { acknowledge = resolve; }));
function Harness() {
  const review = useCandidateReview('photo', { simulation: false, onInvalidate: () => {}, onConfirmDraft: confirm });
  return <><Button label="Carregar caso sintético" onPress={() => review.receive(review.recapture(), candidates)} /><CandidateReadingReview review={review} /></>;
}
beforeEach(() => jest.clearAllMocks());
test('confirmação em andamento bloqueia edição e data; duplo toque não envia duas vezes', async () => {
  await render(<Harness />); await fireEvent.press(screen.getByRole('button', { name: 'Carregar caso sintético' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Confirmar e salvar medição' }));
  expect(screen.getByLabelText('Sistólica').props.editable).toBe(false);
  expect(screen.getByLabelText('Observação').props.editable).toBe(false);
  expect(screen.getByRole('button', { name: /Data e hora:/ })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Confirmar e salvar medição' })); expect(confirm).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' })); acknowledge(true);
  expect(await screen.findByText('Revisão cancelada. Candidatos descartados.')).toBeTruthy();
  expect(screen.queryByText('Medição salva após confirmação explícita.')).toBeNull();
});
test('campos assistidos não solicitam autocomplete ou correção automática do navegador', async () => {
  await render(<Harness />); await fireEvent.press(screen.getByRole('button', { name: 'Carregar caso sintético' }));
  expect(screen.getByLabelText('Sistólica').props.autoComplete).toBe('off');
  expect(screen.getByLabelText('Observação').props.autoComplete).toBe('off');
  expect(screen.getByLabelText('Observação').props.autoCorrect).toBe(false);
});
test('resposta tardia do seletor de data não altera uma revisão nova', async () => {
  await render(<Harness />); await fireEvent.press(screen.getByRole('button', { name: 'Carregar caso sintético' }));
  await fireEvent.press(screen.getByRole('button', { name: /Data e hora:/ }));
  const late = screen.getByLabelText('Data e hora da medição').props.onChangeText as (value: string) => void;
  await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Carregar caso sintético' }));
  const original = screen.getByRole('button', { name: /Data e hora:/ }).props.accessibilityLabel;
  await act(() => late('2026-01-02'));
  expect(screen.getByRole('button', { name: /Data e hora:/ }).props.accessibilityLabel).toBe(original);
});
