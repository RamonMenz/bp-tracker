import { createAndroidPhotoSession, type PhotoCaptureState } from './android-photo-session';

const raw = () => ({ kind: 'ocr', coordinateSpace: 'upright-frame', capturedAtMs: 1793001600000,
  tokens: ['SYS 120', 'DIA 80', 'PUL 72'].map(text => ({ text, confidence: null, box: { x: 0, y: 0, width: 1, height: 0.1 } })) });
async function flush() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
function setup() {
  let state: PhotoCaptureState = { phase: 'idle', attemptId: 0, issue: null };
  const ports = { requestPermission: jest.fn(async () => true), open: jest.fn(),
    recognize: jest.fn(async (): Promise<unknown> => raw()), close: jest.fn(async () => true) };
  const result = jest.fn();
  const session = createAndroidPhotoSession(ports, next => { state = next; }, result);
  async function ready() {
    expect(session.start()).toBe(true); await flush();
    expect(state.phase).toBe('opening');
    session.status(state.attemptId, 'ready'); await flush();
    expect(state.phase).toBe('ready');
  }
  return { ports, result, session, ready, state: () => state };
}
afterEach(() => { jest.useRealTimers(); });

test('frame -> contrato -> candidatos, só após Capturar e liberação', async () => {
  const t = setup(); await t.ready();
  expect(t.ports.recognize).not.toHaveBeenCalled();
  expect(t.session.capture()).toBe(true);
  expect(t.session.capture()).toBe(false);
  await t.session.settled();
  expect(t.ports.close).toHaveBeenCalledTimes(1);
  expect(t.result).toHaveBeenCalledWith(expect.any(Number), { modality: 'photo', capturedAtMs: 1793001600000, fields: {
    systolic: { status: 'candidate', value: 120, basis: 'label' }, diastolic: { status: 'candidate', value: 80, basis: 'label' },
    pulse: { status: 'candidate', value: 72, basis: 'label' },
  } });
  expect(t.state().phase).toBe('reviewing');
});
test('permissão negada não abre câmera nem reconhecedor', async () => {
  const t = setup(); t.ports.requestPermission.mockResolvedValue(false);
  t.session.start(); await t.session.settled();
  expect(t.state().issue).toBe('permission-denied');
  expect(t.ports.open).not.toHaveBeenCalled(); expect(t.ports.recognize).not.toHaveBeenCalled();
});
test('cancelamento com permissão pendente ignora a concessão tardia', async () => {
  const t = setup(); let grant!: (value: boolean) => void;
  t.ports.requestPermission.mockImplementation(() => new Promise(resolve => { grant = resolve; }));
  t.session.start(); expect(t.session.start()).toBe(false);
  await t.session.cancel(); grant(true); await flush();
  expect(t.ports.open).not.toHaveBeenCalled(); expect(t.result).not.toHaveBeenCalled();
});
test('não entrega candidatos nem permite recaptura antes de close concluir', async () => {
  const t = setup(); let release!: (value: boolean) => void;
  t.ports.close.mockImplementation(() => new Promise(resolve => { release = resolve; }));
  await t.ready(); t.session.capture(); await flush();
  expect(t.state().phase).toBe('closing'); expect(t.result).not.toHaveBeenCalled();
  expect(t.session.start()).toBe(false); release(true); await t.session.settled();
  expect(t.result).toHaveBeenCalledTimes(1);
});
test('cancelar enquanto OCR processa não restaura revisão e impede callbacks antigos', async () => {
  const t = setup(); let complete!: (value: unknown) => void;
  t.ports.recognize.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  await t.ready(); const old = t.state().attemptId; t.session.capture(); await flush();
  await t.session.cancel(); complete(raw()); await flush();
  expect(t.result).not.toHaveBeenCalled();
  t.session.start(); await flush(); t.session.status(old, 'ready'); await flush();
  expect(t.state().phase).toBe('opening'); await t.session.cancel();
});
test('falha de cleanup bloqueia novas tentativas', async () => {
  const t = setup(); t.ports.close.mockResolvedValue(false);
  await t.ready(); await t.session.cancel();
  expect(t.state()).toMatchObject({ phase: 'blocked', issue: 'cleanup-failed' });
  expect(t.session.start()).toBe(false);
});
test('status de outra tentativa não habilita captura; recurso ocupado é seguro', async () => {
  const t = setup(); t.session.start(); await flush();
  t.session.status(t.state().attemptId + 1, 'ready'); expect(t.session.capture()).toBe(false);
  t.session.status(t.state().attemptId, 'resource-busy'); await t.session.settled();
  expect(t.state().issue).toBe('resource-busy'); expect(t.result).not.toHaveBeenCalled();
});
test.each([new Error('SENTINELA-CLINICA'), { code: 'unknown-with-SENTINELA' }])('falha do motor não expõe objeto bruto', async error => {
  const t = setup(); t.ports.recognize.mockRejectedValue(error);
  await t.ready(); t.session.capture(); await t.session.settled();
  expect(t.state().issue).toBe('engine-failed');
  expect(JSON.stringify(t.state())).not.toContain('SENTINELA');
});
test('saída malformada é recusada antes da revisão', async () => {
  const t = setup(); t.ports.recognize.mockResolvedValue({ ...raw(), coordinateSpace: 'unknown' });
  await t.ready(); t.session.capture(); await t.session.settled();
  expect(t.result).not.toHaveBeenCalled(); expect(t.state().issue).toBe('engine-failed');
});
test('timeout durante OCR + cleanup pendente bloqueia sem fingir liberação', async () => {
  jest.useFakeTimers();
  const t = setup(); t.ports.recognize.mockImplementation(() => new Promise(() => {}));
  t.ports.close.mockImplementation(() => new Promise(() => {}));
  await t.ready(); t.session.capture(); await flush();
  await jest.advanceTimersByTimeAsync(30000); expect(t.state().phase).toBe('closing');
  await jest.advanceTimersByTimeAsync(10000); await t.session.settled();
  expect(t.state().phase).toBe('blocked'); expect(t.result).not.toHaveBeenCalled();
});
test('desmontagem libera e ignora resultado tardio', async () => {
  const t = setup(); await t.ready(); t.session.dispose(); await t.session.settled();
  expect(t.ports.close).toHaveBeenCalled(); expect(t.result).not.toHaveBeenCalled(); expect(t.session.start()).toBe(false);
});
