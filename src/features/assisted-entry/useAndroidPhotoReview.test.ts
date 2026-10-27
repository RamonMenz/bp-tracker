import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { loadAndroidPhotoBinding } from '@/services/recognition/photo-android';

import { useAndroidPhotoReview } from './useAndroidPhotoReview';
import { PHOTO_INTERPRETATION_EXAMPLES } from './photo-interpretation-examples';

jest.mock('@/services/recognition/photo-android', () => ({ loadAndroidPhotoBinding: jest.fn() }));
jest.mock('@/features/readings/assisted-reading-writer', () => { throw new Error('Writer proibido na avaliação'); });
jest.mock('@/features/readings/readings.repo', () => { throw new Error('Firebase proibido na avaliação'); });
jest.mock('@/features/auth/useSession', () => { throw new Error('Auth proibida na avaliação'); });

const fixture = { kind: 'ocr', coordinateSpace: 'upright-frame', capturedAtMs: 1793001600000,
  tokens: ['SYS 120', 'DIA 80', 'PUL 72'].map(text => ({ text, confidence: null, box: { x: 0, y: 0, width: 1, height: 0.1 } })) };
let listeners: ((state: AppStateStatus) => void)[];
beforeEach(() => {
  jest.clearAllMocks(); listeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    listeners.push(listener); return { remove: jest.fn() };
  });
});
afterEach(() => jest.restoreAllMocks());
async function flush() { for (let i = 0; i < 20; i++) await Promise.resolve(); }
async function setup() {
  const permission = jest.fn(async () => true);
  const handle = { recognize: jest.fn(async (): Promise<unknown> => fixture), cancelCapture: jest.fn(async () => true) };
  jest.mocked(loadAndroidPhotoBinding).mockReturnValue({ requestPermission: permission, Camera: () => null });
  const rendered = await renderHook(useAndroidPhotoReview);
  await act(() => { rendered.result.current.attachCamera(handle); });
  return { ...rendered, permission, handle };
}
async function ready(t: Awaited<ReturnType<typeof setup>>) {
  await act(async () => { t.result.current.start(); await flush(); });
  await act(async () => { t.result.current.onStatus(t.result.current.captureState.attemptId, 'ready'); await flush(); });
}
test('carrega sob ação, conecta OCR à revisão e confirma só em memória', async () => {
  const t = await setup();
  expect(loadAndroidPhotoBinding).not.toHaveBeenCalled();
  expect(t.permission).not.toHaveBeenCalled();
  await ready(t); expect(t.result.current.captureState.phase).toBe('ready');
  await act(async () => { t.result.current.capture(); await flush(); });
  expect(t.result.current.review.state.draft).toMatchObject({ systolic: '120', diastolic: '80', pulse: '72' });
  expect(t.result.current.review.isSimulation).toBe(false);
  expect(t.result.current.review.isPreviewOnly).toBe(true);
  expect(t.result.current.review.state.confirmed).toBeNull();
  await act(async () => { t.result.current.review.edit('systolic', '130'); await t.result.current.review.confirm(); });
  expect(t.result.current.review.state.confirmed?.systolic).toBe(130);
  expect(t.handle.cancelCapture).toHaveBeenCalled();
});
test('background cancela câmera/revisão e não retoma automaticamente', async () => {
  const t = await setup(); await ready(t);
  await act(async () => { listeners.forEach(listener => listener('background')); await flush(); });
  await act(() => { listeners.forEach(listener => listener('active')); });
  expect(t.result.current.review.state.draft).toBeNull();
  expect(t.result.current.captureState.phase).toBe('cancelled');
  expect(t.handle.cancelCapture).toHaveBeenCalled();
  expect(t.handle.recognize).not.toHaveBeenCalled();
});
test('módulo ausente informa indisponibilidade sem tentar câmera ou salvar', async () => {
  const t = await setup(); jest.mocked(loadAndroidPhotoBinding).mockImplementation(() => { throw new Error('SENTINELA'); });
  await act(() => { t.result.current.start(); });
  expect(t.result.current.captureState.issue).toBe('unsupported');
  expect(t.permission).not.toHaveBeenCalled();
  expect(t.result.current.review.state.confirmed).toBeNull();
});
test('recaptura descarta revisão anterior e toques concorrentes não abrem duas sessões', async () => {
  const t = await setup(); await ready(t);
  await act(async () => { t.result.current.capture(); await flush(); });
  await act(async () => { t.result.current.review.recapture(); t.result.current.start(); await flush(); });
  expect(t.permission).toHaveBeenCalledTimes(2);
  expect(t.result.current.review.state.draft).toBeNull();
  await act(async () => { t.result.current.review.cancel(); await flush(); });
});

test('contrato Android com linhas separadas passa pelo parser e preserva instante de captura', async () => {
  const t = await setup();
  t.handle.recognize.mockResolvedValue(PHOTO_INTERPRETATION_EXAMPLES.layout);
  await ready(t);
  await act(async () => { t.result.current.capture(); await flush(); });
  expect(t.result.current.review.state.draft).toMatchObject({ systolic: '120', diastolic: '80', pulse: '72',
    measuredAt: new Date(PHOTO_INTERPRETATION_EXAMPLES.layout.capturedAtMs) });
  expect(t.result.current.review.state.candidates?.fields.systolic).toMatchObject({ basis: 'layout' });
  expect(t.result.current.review.state.confirmed).toBeNull();
  await act(async () => { t.result.current.review.confirm(); await flush(); });
  expect(t.result.current.review.state.confirmed?.systolic).toBe(120);
  expect(t.result.current.review.isPreviewOnly).toBe(true);
});
