import { PhotoCaptureError } from './photo-capture-contract';
import { createWebPhotoSession, type WebPhotoEnvironment, type WebPhotoState } from './web-photo-session.web';

async function flush() { for (let i = 0; i < 20; i++) await Promise.resolve(); }
function rig(stallWorker = false) {
  let state: WebPhotoState = { phase: 'idle', attemptId: 0, source: 'camera', issue: null };
  const track = { stop: jest.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const video = { videoWidth: 900, videoHeight: 480, srcObject: null,
    play: jest.fn(async () => {}), pause: jest.fn() } as unknown as HTMLVideoElement;
  const context = { drawImage: jest.fn(), fillRect: jest.fn(), fillText: jest.fn(), fillStyle: '', font: '' };
  const canvas = { width: 900, height: 480, getContext: () => context,
    toDataURL: () => 'data:image/png;base64,AQID' } as unknown as HTMLCanvasElement;
  const worker = { onmessage: null as ((event: { data: unknown }) => void) | null,
    onerror: null, terminate: jest.fn(), postMessage: jest.fn((message: { action: string; jobId: string }) => {
      if (stallWorker) return;
      const data = message.action !== 'recognize' ? {} : { blocks: [{ paragraphs: [{ lines:
        ['SYS 120','DIA 80','PUL 72'].map(text => ({ text, bbox: { x0: 0, y0: 0, x1: 400, y1: 100 } })),
      }] }] };
      void Promise.resolve().then(() => worker.onmessage?.({ data: { jobId: message.jobId, status: 'resolve', data } }));
    }) };
  const env: WebPhotoEnvironment = { getUserMedia: jest.fn(async () => stream),
    makeWorker: jest.fn(() => worker as unknown as Worker), makeCanvas: () => canvas,
    check: jest.fn(), origin: () => 'http://localhost' };
  const result = jest.fn();
  const session = createWebPhotoSession(() => video, next => { state = next; }, result, env);
  return { session, env, video, canvas, worker, stream, track, result, state: () => state };
}
afterEach(() => { jest.useRealTimers(); });

test('getUserMedia somente em iniciar; worker só após captura; libera todos recursos antes da revisão', async () => {
  const t = rig(); expect(t.env.getUserMedia).not.toHaveBeenCalled();
  expect(t.session.start()).toBe(true); await flush();
  expect(t.state().phase).toBe('ready'); expect(t.env.makeWorker).not.toHaveBeenCalled();
  expect(t.session.capture()).toBe(true); expect(t.session.capture()).toBe(false);
  await t.session.settled();
  expect(t.result).toHaveBeenCalledWith(expect.objectContaining({ modality: 'photo', fields: {
    systolic: { status: 'candidate', value: 120, basis: 'label' }, diastolic: { status: 'candidate', value: 80, basis: 'label' },
    pulse: { status: 'candidate', value: 72, basis: 'label' },
  } }));
  expect(t.track.stop).toHaveBeenCalledTimes(1); expect(t.video.srcObject).toBeNull();
  expect(t.worker.terminate).toHaveBeenCalledTimes(1); expect(t.canvas.width).toBe(0);
});
test('cartão sintético não solicita câmera; protocolo usa modelo local sem cache persistente', async () => {
  const t = rig(); t.session.start('synthetic-card'); await t.session.settled();
  expect(t.env.getUserMedia).not.toHaveBeenCalled();
  expect(t.worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({ action: 'loadLanguage', payload: {
    langs: 'eng', options: { langPath: 'http://localhost/ocr', gzip: true, cacheMethod: 'none', lstmOnly: true },
  } }), []);
  expect(t.result).toHaveBeenCalledTimes(1);
});
test.each([['NotAllowedError','permission-denied'], ['NotFoundError','device-unavailable']])('erro de câmera %s é seguro', async (name, code) => {
  const t = rig(); jest.mocked(t.env.getUserMedia).mockRejectedValue({ name, message: 'SENTINELA-CLINICA' });
  t.session.start(); await t.session.settled();
  expect(t.state().issue).toBe(code); expect(JSON.stringify(t.state())).not.toContain('SENTINELA');
  expect(t.env.makeWorker).not.toHaveBeenCalled();
});
test('nega nova permissão enquanto getUserMedia cancelado não retornar; stream tardio é parado', async () => {
  const t = rig(); let grant!: (stream: MediaStream) => void;
  jest.mocked(t.env.getUserMedia).mockImplementation(() => new Promise(resolve => { grant = resolve; }));
  t.session.start(); const closing = t.session.cancel(); await flush();
  const next = rig(); expect(next.session.start()).toBe(false); expect(next.state().issue).toBe('resource-busy');
  grant(t.stream); await closing; await flush();
  expect(t.track.stop).toHaveBeenCalled(); expect(t.video.srcObject).toBeNull(); expect(t.result).not.toHaveBeenCalled();
  expect(next.session.start('synthetic-card')).toBe(true); await next.session.settled();
});
test('exclusão global de workers e cancelamento durante inicialização', async () => {
  const t = rig(true); t.session.start('synthetic-card'); await flush();
  const next = rig(); expect(next.session.start('synthetic-card')).toBe(false);
  const old = t.worker.onmessage;
  await t.session.cancel(); old?.({ data: { jobId: '1', status: 'resolve', data: {} } });
  expect(t.result).not.toHaveBeenCalled(); expect(t.worker.terminate).toHaveBeenCalled();
  expect(t.canvas.width).toBe(0); expect(next.session.start('synthetic-card')).toBe(true); await next.session.settled();
});
test('cancelar preview não inicia OCR e desmontagem descarta callbacks', async () => {
  const t = rig(); t.session.start(); await flush(); t.session.dispose(); await t.session.settled();
  expect(t.env.makeWorker).not.toHaveBeenCalled(); expect(t.track.stop).toHaveBeenCalled();
  expect(t.result).not.toHaveBeenCalled(); expect(t.session.start()).toBe(false);
});
test('timeout de inicialização termina worker e não restaura candidatos', async () => {
  jest.useFakeTimers(); const t = rig(true); t.session.start('synthetic-card'); await flush();
  await jest.advanceTimersByTimeAsync(45000); await t.session.settled();
  expect(t.state().issue).toBe('timeout'); expect(t.worker.terminate).toHaveBeenCalled(); expect(t.result).not.toHaveBeenCalled();
});
test('timeout de cleanup bloqueia até permissão tardia terminar', async () => {
  jest.useFakeTimers(); const t = rig(); let grant!: (stream: MediaStream) => void;
  jest.mocked(t.env.getUserMedia).mockImplementation(() => new Promise(resolve => { grant = resolve; }));
  t.session.start(); const closing = t.session.cancel(); await flush();
  await jest.advanceTimersByTimeAsync(10000); await closing;
  expect(t.state().phase).toBe('blocked'); expect(t.session.start()).toBe(false);
  grant(t.stream); await flush(); expect(t.track.stop).toHaveBeenCalled();
});
test('API não suportada não solicita câmera ou worker', async () => {
  const t = rig(); jest.mocked(t.env.check).mockImplementation(() => { throw new PhotoCaptureError('unsupported'); });
  t.session.start(); await t.session.settled();
  expect(t.state().issue).toBe('unsupported'); expect(t.env.getUserMedia).not.toHaveBeenCalled(); expect(t.env.makeWorker).not.toHaveBeenCalled();
});
test('erro bruto do worker vira código seguro e worker é encerrado', async () => {
  const t = rig(); t.worker.postMessage.mockImplementation(message => {
    void Promise.resolve().then(() => t.worker.onmessage?.({ data: { jobId: message.jobId, status: 'reject', data: 'SENTINELA-CLINICA' } }));
  });
  t.session.start('synthetic-card'); await t.session.settled();
  expect(t.state().issue).toBe('engine-failed'); expect(JSON.stringify(t.state())).not.toContain('SENTINELA');
  expect(t.worker.terminate).toHaveBeenCalled(); expect(t.result).not.toHaveBeenCalled();
});
test('retorno de OCR malformado não chega à revisão', async () => {
  const t = rig(); t.worker.postMessage.mockImplementation(message => {
    const data = message.action === 'recognize' ? { blocks: 'SENTINELA' } : {};
    void Promise.resolve().then(() => t.worker.onmessage?.({ data: { jobId: message.jobId, status: 'resolve', data } }));
  });
  t.session.start('synthetic-card'); await t.session.settled();
  expect(t.state().issue).toBe('engine-failed'); expect(t.result).not.toHaveBeenCalled(); expect(t.canvas.width).toBe(0);
});
