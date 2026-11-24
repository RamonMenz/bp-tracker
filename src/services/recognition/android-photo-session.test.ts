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
  } }, ['ocr:linhas-presentes', 'associacao:SYS=candidato', 'associacao:DIA=candidato', 'associacao:PUL=candidato']);
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
test('concessão da tentativa cancelada não abre câmera da tentativa seguinte ainda sem permissão', async () => {
  const t = setup();
  let grantOld!: (value: boolean) => void;
  let grantNew!: (value: boolean) => void;
  t.ports.requestPermission
    .mockImplementationOnce(() => new Promise(resolve => { grantOld = resolve; }))
    .mockImplementationOnce(() => new Promise(resolve => { grantNew = resolve; }));
  t.session.start(); await flush();
  const old = t.state().attemptId;
  await t.session.cancel();
  expect(t.session.start()).toBe(true); await flush();
  const next = t.state().attemptId;
  expect(next).not.toBe(old);
  grantOld(true); await flush();
  expect(t.state().phase).toBe('permission');
  expect(t.ports.open).not.toHaveBeenCalled();
  expect(t.session.capture()).toBe(false);
  grantNew(true); await flush();
  expect(t.ports.open).toHaveBeenCalledTimes(1);
  expect(t.ports.open).toHaveBeenCalledWith(next);
  await t.session.cancel();
  expect(t.result).not.toHaveBeenCalled();
});

test('OCR antigo chegando durante novo reconhecimento não preenche nem encerra a tentativa atual', async () => {
  const t = setup();
  let finishOld!: (value: unknown) => void;
  let finishNew!: (value: unknown) => void;
  t.ports.recognize
    .mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
    .mockImplementationOnce(() => new Promise(resolve => { finishNew = resolve; }));
  await t.ready(); t.session.capture(); await flush();
  await t.session.cancel();
  // ACK é um double JS: permite sobrepor Promises antigas, não prova que o
  // reconhecedor nativo já liberou RAM/lease ou que OCRs físicos se sobrepõem.
  await t.ready(); t.session.capture(); await flush();
  const next = t.state().attemptId;
  finishOld(raw()); await flush();
  expect(t.state()).toMatchObject({ phase: 'recognizing', attemptId: next });
  expect(t.result).not.toHaveBeenCalled();
  const fresh = raw(); fresh.tokens[0].text = 'SYS 130';
  finishNew(fresh); await t.session.settled();
  expect(t.result).toHaveBeenCalledTimes(1);
  expect(t.result).toHaveBeenCalledWith(next, expect.objectContaining({ fields: expect.objectContaining({
    systolic: { status: 'candidate', value: 130, basis: 'label' },
  }) }), ['ocr:linhas-presentes', 'associacao:SYS=candidato', 'associacao:DIA=candidato', 'associacao:PUL=candidato']);
});

test.each(['rejection', 'late-ack'] as const)('cleanup %s mantém blocked após cancelamento e novos gestos', async failure => {
  const t = setup();
  let release!: (value: boolean) => void;
  if (failure === 'rejection') t.ports.close.mockRejectedValue(new Error('SENTINELA-CLINICA'));
  else {
    jest.useFakeTimers();
    t.ports.close.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  }
  await t.ready();
  const closing = t.session.cancel(); await flush();
  if (failure === 'late-ack') await jest.advanceTimersByTimeAsync(10000);
  await closing;
  expect(t.state()).toMatchObject({ phase: 'blocked', issue: 'cleanup-failed' });
  if (failure === 'late-ack') { release(true); await flush(); }
  await t.session.cancel();
  t.session.status(t.state().attemptId, 'ready');
  expect(t.session.start()).toBe(false);
  expect(t.session.capture()).toBe(false);
  expect(t.session.isReleased()).toBe(false);
  expect(t.ports.open).toHaveBeenCalledTimes(1);
  expect(t.ports.recognize).not.toHaveBeenCalled();
  expect(t.result).not.toHaveBeenCalled();
  expect(JSON.stringify(t.state())).not.toContain('SENTINELA');
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

test('cancelar abertura ignora status tardios enquanto uma nova tentativa abre', async () => {
  const t = setup();
  t.session.start(); await flush();
  const old = t.state().attemptId;
  expect(t.state().phase).toBe('opening');
  await t.session.cancel();
  expect(t.state().phase).toBe('cancelled');
  expect(t.ports.recognize).not.toHaveBeenCalled();
  expect(t.session.start()).toBe(true); await flush();
  const next = t.state().attemptId;
  expect(next).not.toBe(old);
  t.session.status(old, 'ready');
  t.session.status(old, 'camera-failed'); await flush();
  expect(t.state().phase).toBe('opening');
  expect(t.session.capture()).toBe(false);
  t.session.status(next, 'ready'); await flush();
  expect(t.state().phase).toBe('ready');
  await t.session.cancel();
  expect(t.result).not.toHaveBeenCalled();
});

test('cancelar durante fechamento descarta candidatos já calculados e exige novo gesto', async () => {
  const t = setup(); let release!: (value: boolean) => void;
  t.ports.close.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  await t.ready(); t.session.capture(); await flush();
  expect(t.state().phase).toBe('closing');
  const cancellation = t.session.cancel();
  expect(t.session.start()).toBe(false);
  release(true); await cancellation;
  expect(t.state().phase).toBe('cancelled');
  expect(t.result).not.toHaveBeenCalled();
  expect(t.ports.open).toHaveBeenCalledTimes(1);
  expect(t.session.start()).toBe(true); await flush();
  expect(t.ports.open).toHaveBeenCalledTimes(2);
  await t.session.cancel();
});

test.each(['permission', 'opening'])('timeout em %s fecha e permite somente novo início explícito', async phase => {
  jest.useFakeTimers();
  const t = setup();
  if (phase === 'permission') t.ports.requestPermission.mockImplementationOnce(() => new Promise(() => {}));
  t.session.start(); await flush();
  expect(t.state().phase).toBe(phase);
  await jest.advanceTimersByTimeAsync(phase === 'permission' ? 30000 : 20000);
  await t.session.settled();
  expect(t.state()).toMatchObject({ phase: 'cancelled', issue: 'timeout' });
  expect(t.ports.close).toHaveBeenCalledTimes(1);
  expect(t.ports.recognize).not.toHaveBeenCalled();
  expect(t.result).not.toHaveBeenCalled();
  const previousOpens = t.ports.open.mock.calls.length;
  expect(t.session.start()).toBe(true); await flush();
  expect(t.ports.open).toHaveBeenCalledTimes(previousOpens + 1);
  await t.session.cancel();
});
