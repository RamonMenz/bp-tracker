import { fireEvent, render, screen } from '@testing-library/react-native';

import { PhotoReviewDemoScreen } from '@/screens/PhotoReviewDemoScreen';
import { formatShortDateTime } from '@/lib/datetime';

jest.mock('@/components/ui/DateTimeField', () => ({
  // Factory içada pelo Jest: mesmo stub já usado nos testes de formulário legados.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  DateTimeField: require('./__testutils__/DateTimeFieldStub').DateTimeFieldStub,
}));
// Qualquer import acidental de escrita/auth faz a suíte falhar, em vez de usar um writer mock.
jest.mock('@/features/readings/useAddReading', () => { throw new Error('Writer não permitido na demonstração'); });
jest.mock('@/features/auth/useSession', () => { throw new Error('Auth não permitida na demonstração'); });
jest.mock('@/features/readings/assisted-reading-writer', () => { throw new Error('Writer assistido não permitido na demonstração'); });

test('rotula simulação, mostra campos editáveis e confirma só em memória', async () => {
  await render(<PhotoReviewDemoScreen />);
  expect(screen.getByText('Simulação com candidatos sintéticos. Nenhuma medição será salva.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Simular candidatos completos' }));
  expect(screen.getByLabelText('Sistólica').props.value).toBe('120');
  expect(screen.getByLabelText('Pulso').props.value).toBe('72');
  await fireEvent.changeText(screen.getByLabelText('Sistólica'), '135');
  await fireEvent.press(screen.getByRole('button', { name: 'Confirmar simulação' }));
  expect(screen.getByText('Confirmação demonstrada somente em memória.')).toBeTruthy();
  expect(screen.getByText('135 por 80 mmHg')).toBeTruthy();
  expect(screen.queryByLabelText('Sistólica')).toBeNull();
});

test('incerteza é textual e vazio; preenchimento habilita; cancelar descarta', async () => {
  await render(<PhotoReviewDemoScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Simular campo incerto' }));
  expect(screen.getByLabelText('Sistólica').props.value).toBe('');
  expect(screen.getByText(/Sistólica: Incerto: associação ambígua/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Confirmar simulação' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Sistólica'), '125');
  expect(screen.getByRole('button', { name: 'Confirmar simulação' })).not.toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.getByText('Revisão cancelada. Candidatos descartados.')).toBeTruthy();
  expect(screen.queryByLabelText('Sistólica')).toBeNull();
});

test('valor inválido não é ajustado; recapturar descarta até próximo cenário', async () => {
  await render(<PhotoReviewDemoScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Simular valor inválido' }));
  expect(screen.getByLabelText('Sistólica').props.value).toBe('400');
  expect(screen.getByText('A sistólica deve ficar entre 50 e 300.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Confirmar simulação' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Tirar outra fotografia (simulação)' }));
  expect(screen.queryByLabelText('Sistólica')).toBeNull();
  expect(screen.getByText(/Aguardando candidatos sintéticos/)).toBeTruthy();
});

test('edita data/hora e observação e preserva no resultado demonstrativo', async () => {
  await render(<PhotoReviewDemoScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Simular candidatos completos' }));
  await fireEvent.press(screen.getByRole('button', { name: /Data e hora:/ }));
  await fireEvent.changeText(screen.getByLabelText('Data e hora da medição'), '2026-01-02');
  await fireEvent.changeText(screen.getByLabelText('Observação'), 'Somente sintético');
  await fireEvent.press(screen.getByRole('button', { name: 'Confirmar simulação' }));
  expect(screen.getByText('Somente sintético')).toBeTruthy();
  expect(screen.getByText(/02\/01/)).toBeTruthy();
});

test('parser de posições chega à revisão editável e confirmar continua somente em memória', async () => {
  await render(<PhotoReviewDemoScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Interpretar rótulos e números separados (sintético)' }));
  expect(screen.getByLabelText('Sistólica').props.value).toBe('120');
  expect(screen.getByLabelText('Diastólica').props.value).toBe('80');
  expect(screen.getByLabelText('Pulso').props.value).toBe('72');
  await fireEvent.changeText(screen.getByLabelText('Pulso'), '75');
  await fireEvent.press(screen.getByRole('button', { name: 'Confirmar simulação' }));
  expect(screen.getByText('Pulso: 75')).toBeTruthy();
  expect(screen.getByText('Confirmação demonstrada somente em memória.')).toBeTruthy();
});

test('parcial e coluna não identificada ficam vazios e não permitem confirmar', async () => {
  await render(<PhotoReviewDemoScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Interpretar leitura parcial (sintético)' }));
  expect(screen.getByLabelText('Sistólica').props.value).toBe('');
  expect(screen.getByLabelText('Diastólica').props.value).toBe('80');
  expect(screen.getByLabelText('Pulso').props.value).toBe('');
  expect(screen.getByText(/Sistólica: Incerto: leitura incompleta/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Confirmar simulação' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Interpretar números sem rótulos (sintético)' }));
  expect(screen.getByLabelText('Diastólica').props.value).toBe('');
  expect(screen.getByText(/Diastólica: Incerto: número sem associação segura/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Confirmar simulação' })).toBeDisabled();
});

test('acessórios não substituem instante de captura e candidatos não confirmam automaticamente', async () => {
  await render(<PhotoReviewDemoScreen />);
  const capturedAtMs = Date.now() - 60_000;
  const clock = jest.spyOn(Date, 'now').mockReturnValue(capturedAtMs);
  await fireEvent.press(screen.getByRole('button', { name: 'Interpretar display com acessórios (sintético)' }));
  clock.mockRestore();
  expect(screen.getByLabelText('Sistólica').props.value).toBe('120');
  expect(screen.getByLabelText('Pulso').props.value).toBe('72');
  expect(screen.queryByText('Confirmação demonstrada somente em memória.')).toBeNull();
  expect(screen.getByRole('button', { name: `Data e hora: ${formatShortDateTime(new Date(capturedAtMs))}` })).toBeTruthy();
});
