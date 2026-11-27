import { fireEvent, render, screen } from '@testing-library/react-native';

import { AssistedReviewDemoScreen } from '@/screens/AssistedReviewDemoScreen';
import { VoiceReviewDemoScreen } from '@/screens/VoiceReviewDemoScreen';

jest.mock('@/features/readings/assisted-reading-writer', () => { throw new Error('Writer proibido na demonstração'); });
jest.mock('@/features/auth/useSession', () => { throw new Error('Auth proibida na demonstração'); });
jest.mock('@/features/readings/readings.repo', () => { throw new Error('Repositório proibido na demonstração'); });

test('voz exibe simulação, valores convertidos e confirmação em memória após correção', async () => {
  await render(<VoiceReviewDemoScreen />);
  expect(screen.getByText('Demonstração isolada · texto sintético')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Simular doze por oito' }));
  expect(screen.getByLabelText('Sistólica').props.value).toBe('120');
  expect(screen.getByLabelText('Diastólica').props.value).toBe('80');
  expect(screen.queryByText('Confirmação demonstrada somente em memória.')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Sistólica'), '135');
  await fireEvent.press(screen.getByRole('button', { name: 'Confirmar simulação' }));
  expect(screen.getByText('135 por 80 mmHg')).toBeTruthy();
  expect(screen.getByText('Confirmação demonstrada somente em memória.')).toBeTruthy();
});
test('decimais/pulso e escala mista aparecem corretamente, sem confirmar', async () => {
  await render(<VoiceReviewDemoScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Simular decimais e pulso' }));
  expect(screen.getByLabelText('Sistólica').props.value).toBe('135');
  expect(screen.getByLabelText('Pulso').props.value).toBe('72');
  await fireEvent.press(screen.getByRole('button', { name: 'Simular escala mista' }));
  expect(screen.getByText(/Sistólica: Incerto: escala incerta/)).toBeTruthy();
  expect(screen.getByLabelText('Sistólica').props.value).toBe('');
  expect(screen.getByRole('button', { name: 'Confirmar simulação' })).toBeDisabled();
});
test('silêncio e parcial não confirmam; novo texto sintético não salva por comando', async () => {
  await render(<VoiceReviewDemoScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Simular silêncio' }));
  expect(screen.getByRole('button', { name: 'Confirmar simulação' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Simular resultado parcial' }));
  expect(screen.queryByLabelText('Sistólica')).toBeNull();
  expect(screen.getByText(/Somente uma transcrição final válida/)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Texto sintético para interpretação'), 'salvar');
  await fireEvent.press(screen.getByRole('button', { name: 'Interpretar texto sintético' }));
  expect(screen.getByRole('button', { name: 'Confirmar simulação' })).toBeDisabled();
  expect(screen.getByLabelText('Texto sintético para interpretação').props.value).toBe('');
});
test('nova tentativa e cancelar descartam campos e texto', async () => {
  await render(<VoiceReviewDemoScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Simular doze por oito' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Falar novamente (simulação)' }));
  expect(screen.queryByLabelText('Sistólica')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Texto sintético para interpretação'), 'doze por oito');
  await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.getByLabelText('Texto sintético para interpretação').props.value).toBe('');
  expect(screen.getByText('Revisão cancelada. Candidatos descartados.')).toBeTruthy();
});
test('trocar modalidade desmonta revisão anterior e preserva demonstração de fotografia', async () => {
  await render(<AssistedReviewDemoScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Simular candidatos completos' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Demonstração de voz' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Simular doze por oito' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Demonstração de fotografia' }));
  expect(screen.queryByLabelText('Sistólica')).toBeNull();
  expect(screen.getByText('Aferi · revisão de fotografia')).toBeTruthy();
});
