import { act, renderHook } from '@testing-library/react-native';
import type { EffectCallback } from 'react';
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
const originalCurrentState = Object.getOwnPropertyDescriptor(AppState, 'currentState');
function setCurrentState(state: AppStateStatus) {
  Object.defineProperty(AppState, 'currentState', { configurable: true, writable: true, value: state });
}
beforeEach(() => {
  jest.clearAllMocks(); listeners = [];
  setCurrentState('active');
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    listeners.push(listener); return { remove: jest.fn() };
  });
});
afterEach(() => {
  jest.restoreAllMocks();
  if (originalCurrentState) Object.defineProperty(AppState, 'currentState', originalCurrentState);
});
async function flush() { for (let i = 0; i < 20; i++) await Promise.resolve(); }

// Reproduz cleanup/setup preservando o estado, como ocorre em Fast Refresh.
function trackEffectRestarts() {
  const react = jest.requireActual<typeof import('react')>('react');
  const useEffect = react.useEffect;
  const runs: { setup: EffectCallback; cleanup: ReturnType<EffectCallback> }[] = [];
  jest.spyOn(react, 'useEffect').mockImplementation((setup, dependencies) => {
    useEffect(() => {
      const run = { setup, cleanup: setup() };
      runs.push(run);
      return () => { if (typeof run.cleanup === 'function') run.cleanup(); };
    // O harness reproduz as dependencias reais do efeito observado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, dependencies);
  });
  return async () => {
    await act(async () => {
      for (const run of runs) if (typeof run.cleanup === 'function') run.cleanup();
      for (const run of runs) run.cleanup = run.setup();
      await flush();
    });
  };
}

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

test('reinicio dos efeitos cria uma sessao nova em vez de reutilizar a descartada', async () => {
  const restartEffects = trackEffectRestarts();
  const t = await setup();
  await restartEffects();
  await act(async () => { t.result.current.start(); await flush(); });
  expect(t.permission).toHaveBeenCalledTimes(1);
  expect(t.result.current.captureState.phase).toBe('opening');
  await act(async () => { t.result.current.review.cancel(); await flush(); });
});

test('concessao depois de background nao retoma; novo gesto explicito pode iniciar', async () => {
  const t = await setup();
  let grant!: (allowed: boolean) => void;
  t.permission.mockImplementationOnce(() => new Promise(resolve => { grant = resolve; }));
  await act(async () => { t.result.current.start(); await flush(); });
  expect(t.result.current.captureState.phase).toBe('permission');
  await act(async () => {
    setCurrentState('background');
    listeners.forEach(listener => listener('background'));
    await flush();
    grant(true);
    setCurrentState('active');
    listeners.forEach(listener => listener('active'));
    await flush();
  });
  expect(t.result.current.captureState.phase).toBe('cancelled');
  expect(t.permission).toHaveBeenCalledTimes(1);
  expect(t.handle.recognize).not.toHaveBeenCalled();
  await act(async () => { t.result.current.start(); await flush(); });
  expect(t.permission).toHaveBeenCalledTimes(2);
  expect(t.result.current.captureState.phase).toBe('opening');
  await act(async () => { t.result.current.review.cancel(); await flush(); });
});

test('nao inicia em segundo plano e voltar nao abre camera automaticamente', async () => {
  const t = await setup();
  setCurrentState('background');
  await act(async () => { t.result.current.start(); await flush(); });
  expect(t.permission).not.toHaveBeenCalled();
  setCurrentState('active');
  await act(async () => { listeners.forEach(listener => listener('active')); await flush(); });
  expect(t.permission).not.toHaveBeenCalled();
});

test('reinicio aguarda cleanup anterior e exige novo gesto apos liberar', async () => {
  const restartEffects = trackEffectRestarts();
  const t = await setup();
  await ready(t);
  let release!: (value: boolean) => void;
  t.handle.cancelCapture.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  await restartEffects();
  await restartEffects(); // Uma segunda recarga nao pode perder a barreira da primeira.
  expect(t.result.current.captureState.phase).toBe('closing');
  await act(async () => { t.result.current.start(); await flush(); });
  expect(t.permission).toHaveBeenCalledTimes(1);
  await act(async () => { release(true); await flush(); });
  expect(t.result.current.captureState.phase).toBe('idle');
  expect(t.permission).toHaveBeenCalledTimes(1);
  await act(async () => { t.result.current.start(); await flush(); });
  expect(t.permission).toHaveBeenCalledTimes(2);
  await act(async () => { t.result.current.review.cancel(); await flush(); });
});

test('falha de cleanup continua bloqueando apos reiniciar efeitos', async () => {
  const restartEffects = trackEffectRestarts();
  const t = await setup();
  await ready(t);
  t.handle.cancelCapture.mockResolvedValue(false);
  await restartEffects();
  expect(t.result.current.captureState).toMatchObject({ phase: 'blocked', issue: 'cleanup-failed' });
  await act(async () => { t.result.current.start(); await flush(); });
  expect(t.permission).toHaveBeenCalledTimes(1);
});

test('diagnostico identifica toque recusado pelo estado do app', async () => {
  const t = await setup();
  setCurrentState('background');
  await act(async () => { t.result.current.start(); await flush(); });
  expect(t.result.current.diagnosticVersion).toBe('captura-5');
  expect(t.result.current.diagnostics).toEqual(expect.arrayContaining([
    'toque:iniciar', 'app-no-toque:background', 'bloqueio:app-nao-ativo',
  ]));
  expect(t.permission).not.toHaveBeenCalled();
});

test('diagnostico e limitado e nao inclui saida OCR ou status nativo desconhecido', async () => {
  const t = await setup();
  await ready(t);
  await act(async () => {
    t.result.current.onStatus(t.result.current.captureState.attemptId, 'SENTINELA 120/80');
    t.result.current.capture();
    await flush();
  });
  expect(t.result.current.review.state.draft).toMatchObject({ systolic: '120', diastolic: '80', pulse: '72' });
  const output = JSON.stringify(t.result.current.diagnostics);
  expect(output).not.toContain('SENTINELA');
  expect(output).not.toMatch(/120|80|72/);
  await act(async () => {
    for (let i = 0; i < 30; i++) t.result.current.review.cancel();
    await flush();
  });
  expect(t.result.current.diagnostics.length).toBeLessThanOrEqual(18);
});

test('falha do quadro mostra metadados tecnicos sem criar candidatos', async () => {
  const t = await setup();
  t.handle.recognize.mockResolvedValue({ code: 'frame-failed', frameDiagnostic: {
    revision: 'frame-1', reason: 'frame-plane', width: 1280, height: 960,
    format: 35, rotation: 90, planeCount: 3, planes: [], text: 'SENTINELA',
  } });
  await ready(t);
  await act(async () => { t.result.current.capture(); await flush(); });
  expect(t.result.current.captureState).toMatchObject({ phase: 'failed', issue: 'frame-failed' });
  expect(t.result.current.diagnostics).toContain('quadro:motivo=frame-plane');
  expect(JSON.stringify(t.result.current.diagnostics)).not.toContain('SENTINELA');
  expect(t.result.current.review.state.draft).toBeNull();
  expect(t.result.current.review.state.confirmed).toBeNull();
});
