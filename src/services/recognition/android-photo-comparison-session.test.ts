import { createAndroidPhotoSession, type PhotoCaptureState } from './android-photo-session';
import { photoComparisonFixture } from './photo-comparison.test-fixture';

async function flush() { for (let i = 0; i < 14; i++) await Promise.resolve(); }
function setup() {
  let state: PhotoCaptureState;
  const ports = { requestPermission: jest.fn(async () => true), open: jest.fn(), recognize: jest.fn(),
    evaluate: jest.fn(async (): Promise<unknown> => photoComparisonFixture()), close: jest.fn(async () => true) };
  const candidates = jest.fn(), comparison = jest.fn();
  const session = createAndroidPhotoSession(ports, next => { state = next; }, candidates, { comparison: true, onComparison: comparison });
  async function ready() {
    session.start(); await flush(); session.status(state.attemptId, 'ready'); await flush();
  }
  return { ports, candidates, comparison, session, ready, state: () => state };
}
afterEach(() => jest.useRealTimers());

test('timeout do par e ACK tardio não publicam resultado nem removem o bloqueio de cleanup', async () => {
  jest.useFakeTimers();
  const t = setup();
  let complete!: (value: unknown) => void, release!: (value: boolean) => void;
  t.ports.evaluate.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  t.ports.close.mockImplementation(() => new Promise(resolve => { release = resolve; }));
  await t.ready(); t.session.capture(); await flush();
  await jest.advanceTimersByTimeAsync(30000);
  expect(t.state().phase).toBe('closing');
  await jest.advanceTimersByTimeAsync(10000); await t.session.settled();
  expect(t.state()).toMatchObject({ phase: 'blocked', issue: 'cleanup-failed' });
  complete(photoComparisonFixture()); release(true); await flush();
  expect(t.comparison).not.toHaveBeenCalled(); expect(t.session.start()).toBe(false);
});

test('par antigo chegando durante comparação nova não preenche nem encerra a nova tentativa', async () => {
  const t = setup();
  let finishOld!: (value: unknown) => void, finishNew!: (value: unknown) => void;
  t.ports.evaluate.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
    .mockImplementationOnce(() => new Promise(resolve => { finishNew = resolve; }));
  await t.ready(); t.session.capture(); await flush(); await t.session.cancel();
  // ACK simulado: exercita gerações JS, não sobreposição permitida de SDKs físicos.
  await t.ready(); t.session.capture(); await flush();
  const next = t.state().attemptId;
  finishOld(photoComparisonFixture()); await flush();
  expect(t.state()).toMatchObject({ attemptId: next, phase: 'recognizing' });
  expect(t.comparison).not.toHaveBeenCalled();
  const fresh = photoComparisonFixture(); fresh.processed.tokens[0].text = 'SYS 140';
  finishNew(fresh); await t.session.settled();
  expect(t.comparison).toHaveBeenCalledTimes(1);
  expect(t.comparison).toHaveBeenCalledWith(next, expect.objectContaining({ processed: expect.objectContaining({
    candidates: expect.objectContaining({ fields: expect.objectContaining({ systolic: expect.objectContaining({ value: 140 }) }) }),
  }) }));
});

test.each([new Error('SENTINELA-CLINICA'), { code: 'engine-failed', text: 'SENTINELA-CLINICA' }])(
  'falha da comparação é sanitizada sem fallback ou publicação parcial: %s', async failure => {
    const t = setup(); await t.ready();
    if (failure instanceof Error) t.ports.evaluate.mockRejectedValue(failure);
    else t.ports.evaluate.mockResolvedValue(failure);
    t.session.capture(); await t.session.settled();
    expect(t.state().issue).toBe('engine-failed'); expect(t.comparison).not.toHaveBeenCalled();
    expect(t.ports.recognize).not.toHaveBeenCalled(); expect(JSON.stringify(t.state())).not.toContain('SENTINELA');
  });
test('somente evaluate, uma captura e entrega do par após cleanup; nunca onCandidates', async () => {
  const t = setup(); await t.ready();
  expect(t.ports.evaluate).not.toHaveBeenCalled();
  let close!: (value: boolean) => void;
  t.ports.close.mockImplementation(() => new Promise(resolve => { close = resolve; }));
  expect(t.session.capture()).toBe(true); expect(t.session.capture()).toBe(false);
  await flush(); expect(t.comparison).not.toHaveBeenCalled();
  close(true); await t.session.settled();
  expect(t.ports.recognize).not.toHaveBeenCalled(); expect(t.candidates).not.toHaveBeenCalled();
  expect(t.ports.evaluate).toHaveBeenCalledTimes(1);
  expect(t.comparison).toHaveBeenCalledWith(expect.any(Number), expect.objectContaining({
    original: expect.objectContaining({ candidates: expect.objectContaining({ fields: expect.objectContaining({ systolic: expect.objectContaining({ value: 120 }) }) }) }),
    processed: expect.objectContaining({ candidates: expect.objectContaining({ fields: expect.objectContaining({ systolic: expect.objectContaining({ value: 130 }) }) }) }),
  }));
});
test.each(['cancel', 'dispose', 'cleanup'] as const)('descarta o par com %s e resultado tardio', async action => {
  const t = setup(); await t.ready();
  let complete!: (value: unknown) => void;
  t.ports.evaluate.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  t.session.capture(); await flush();
  if (action === 'cancel') await t.session.cancel();
  if (action === 'dispose') { t.session.dispose(); await t.session.settled(); }
  if (action === 'cleanup') t.ports.close.mockResolvedValue(false);
  complete(photoComparisonFixture()); await flush(); await t.session.settled();
  expect(t.comparison).not.toHaveBeenCalled(); expect(t.candidates).not.toHaveBeenCalled();
  if (action === 'cleanup') expect(t.state().phase).toBe('blocked');
});
test.each(['opening', 'ready'])('geometria perdida em %s fecha sem avaliar e exige novo gesto', async phase => {
  const t = setup();
  if (phase === 'opening') { t.session.start(); await flush(); } else await t.ready();
  t.session.status(t.state().attemptId, 'geometry-unavailable'); await t.session.settled();
  expect(t.state()).toMatchObject({ phase: 'failed', issue: 'geometry-unavailable' });
  expect(t.ports.evaluate).not.toHaveBeenCalled(); expect(t.session.capture()).toBe(false);
});
test('um resultado inválido não publica nem o outro, e não tenta recognize como fallback', async () => {
  const t = setup(); await t.ready();
  t.ports.evaluate.mockResolvedValue({ ...photoComparisonFixture(), processed: { text: 'SENTINELA' } });
  t.session.capture(); await t.session.settled();
  expect(t.state().phase).toBe('failed'); expect(t.comparison).not.toHaveBeenCalled();
  expect(t.candidates).not.toHaveBeenCalled(); expect(t.ports.recognize).not.toHaveBeenCalled();
  expect(JSON.stringify(t.state())).not.toContain('SENTINELA');
});
