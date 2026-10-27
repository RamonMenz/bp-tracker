import { fireEvent, render, screen } from '@testing-library/react-native';

import { loadAndroidVoiceBinding } from '@/services/recognition/voice-android';
import type { AndroidVoicePorts } from '@/services/recognition/voice-capture-contract';

import { AndroidVoiceCaptureScreen } from './AndroidVoiceCaptureScreen';
import { ManualReadingEvaluationScreen } from './ManualReadingEvaluationScreen';

jest.mock('@/services/recognition/voice-android', () => ({ loadAndroidVoiceBinding: jest.fn() }));
jest.mock('@/features/readings/useReadingForm', () => { throw new Error('Hook clínico proibido'); });
jest.mock('@/features/readings/readings.repo', () => { throw new Error('Repo clínico proibido'); });
jest.mock('@/features/readings/assisted-reading-writer', () => { throw new Error('Writer proibido'); });
jest.mock('@/features/auth/useSession', () => { throw new Error('Auth proibida'); });

test('indisponibilidade mostra manual operável e não solicita permissão ou microfone', async () => {
  const ports: AndroidVoicePorts = { availability: jest.fn(async () => ({ code: 'local-unavailable' })),
    requestPermission: jest.fn(), prepare: jest.fn(), start: jest.fn(), finish: jest.fn(), close: jest.fn(async () => true), listen: () => () => {} };
  jest.mocked(loadAndroidVoiceBinding).mockReturnValue(ports);
  const manual = jest.fn(); await render(<AndroidVoiceCaptureScreen onManual={manual} />);
  expect(loadAndroidVoiceBinding).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Começar a falar (avaliação local)' }));
  expect(await screen.findByText('Reconhecedor explicitamente local indisponível. Use o registro manual.')).toBeTruthy();
  expect(ports.requestPermission).not.toHaveBeenCalled(); expect(ports.start).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Ir para registro manual' })); expect(manual).toHaveBeenCalledTimes(1);
});
test('manual de avaliação reutiliza formulário e validações, sem abrir reconhecedor ou persistir', async () => {
  jest.clearAllMocks(); await render(<ManualReadingEvaluationScreen onVoice={() => {}} />);
  expect(screen.getByRole('button', { name: 'Confirmar manual em memória' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Sistólica'), '120');
  await fireEvent.changeText(screen.getByLabelText('Diastólica'), '80');
  await fireEvent.press(screen.getByRole('button', { name: 'Confirmar manual em memória' }));
  expect(screen.getByText('Confirmação manual demonstrada somente em memória.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Confirmar manual em memória' })).toBeDisabled();
  expect(loadAndroidVoiceBinding).not.toHaveBeenCalled();
});
test('falha de liberação continua visível no manual e bloqueia retorno à voz', async () => {
  await render(<ManualReadingEvaluationScreen voiceRelease="failed" onVoice={() => {}} />);
  expect(screen.getByText(/Não foi possível confirmar a liberação do reconhecedor/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Voltar à avaliação de voz' })).toBeDisabled();
  expect(screen.getByLabelText('Sistólica')).toBeTruthy();
});
