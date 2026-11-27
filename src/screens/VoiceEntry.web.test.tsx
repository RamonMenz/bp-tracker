import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { UseSessionResult } from '@/features/auth/useSession';
import { ConsentGateContext } from '@/features/privacy/useConsentGate';
import { addReading } from '@/features/readings/readings.repo';
import type { LocalWebSpeech } from '@/services/recognition/web-voice.web';

import { VoiceEntry } from './VoiceEntry.web';

const mockExpoExtra: { webVoiceEnabled?: boolean } = {};
let mockSession: UseSessionResult;
let mockEpoch: UseSessionResult['sessionEpoch'];
let mockIsFocused: boolean;
const mockLoadRegistration = jest.fn();
jest.mock('expo-constants', () => ({ expoConfig: { get extra() { return mockExpoExtra; } } }));
jest.mock('expo-router', () => ({ useIsFocused: () => mockIsFocused }));
jest.mock('@/features/auth/useSession', () => ({ useSession: () => mockSession }));
jest.mock('@/features/auth/auth.repo', () => ({ subscribePrivacyConsent: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));
jest.mock('@/features/readings/readings.repo', () => ({ addReading: jest.fn() }));
// Jest CommonJS não executa import() nativo. O módulo retornado é a tela real.
jest.mock('./loadVoiceRegistration.web', () => ({
  loadVoiceRegistration: async () => {
    mockLoadRegistration();
    return jest.requireActual('./VoiceRegistration.web');
  },
}));

const instances: SimulatedSpeechRecognition[] = [];
class SimulatedSpeechRecognition implements LocalWebSpeech {
  static available = jest.fn<Promise<unknown>, [unknown]>();
  static install = jest.fn();
  static getUserMedia = jest.fn();

  #local = false;
  get processLocally() { return this.#local; }
  set processLocally(value: boolean) { this.#local = value; }
  lang = '';
  continuous = true;
  interimResults = true;
  maxAlternatives = 4;
  onstart: LocalWebSpeech['onstart'] = null;
  onspeechend: LocalWebSpeech['onspeechend'] = null;
  onaudioend: LocalWebSpeech['onaudioend'] = null;
  onresult: LocalWebSpeech['onresult'] = null;
  onerror: LocalWebSpeech['onerror'] = null;
  onend: LocalWebSpeech['onend'] = null;
  start = jest.fn(() => this.onstart?.());
  stop = jest.fn();
  abort = jest.fn(() => this.onend?.());

  constructor() { instances.push(this); }
}

const ENTRY = 'Registrar por voz';
const CONFIRM = 'Confirmar e salvar medição';
const mockAdd = jest.mocked(addReading);
const onSaved = jest.fn();
const globals = new Map<string, PropertyDescriptor | undefined>();

function replaceGlobal(name: string, value: unknown) {
  globals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, value });
}

function signInAs(uid: string, id: number) {
  mockEpoch = { id };
  mockSession = {
    user: { uid } as UseSessionResult['user'],
    sessionEpoch: mockEpoch,
    getSessionEpoch: () => mockEpoch,
    isLoading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  };
}

function view(hasConsent = true) {
  return <ConsentGateContext.Provider value={{ hasConsent, getHasConsent: () => hasConsent }}>
    <VoiceEntry onSaved={onSaved} />
  </ConsentGateContext.Provider>;
}

function simulatedResult(transcript: string, isFinal = true) {
  return { resultIndex: 0, results: [{ isFinal, length: 1, 0: { transcript, confidence: 0.99 } }] };
}

async function startVoice() {
  await fireEvent.press(await screen.findByRole('button', { name: ENTRY }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Começar a falar' }));
  await screen.findByText('Ouvindo. Diga uma única medição.');
  return instances.at(-1)!;
}

async function recognized(speech: SimulatedSpeechRecognition) {
  await act(() => {
    speech.onresult?.(simulatedResult('doze por oito, pulso setenta e dois'));
    speech.onend?.();
  });
  return screen.findByRole('button', { name: CONFIRM });
}

beforeEach(() => {
  jest.clearAllMocks();
  instances.length = 0;
  delete mockExpoExtra.webVoiceEnabled;
  mockIsFocused = true;
  signInAs('alice-synthetic', 1);
  SimulatedSpeechRecognition.available.mockResolvedValue('available');
  mockAdd.mockResolvedValue('reading-synthetic');
  replaceGlobal('isSecureContext', true);
  replaceGlobal('SpeechRecognition', SimulatedSpeechRecognition);
  replaceGlobal('navigator', { mediaDevices: { getUserMedia: SimulatedSpeechRecognition.getUserMedia } });
  replaceGlobal('document', new EventTarget());
  replaceGlobal('window', new EventTarget());
});

afterEach(() => {
  for (const [name, descriptor] of globals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
  globals.clear();
});

describe('V2 Web · reconhecedor do navegador SIMULADO', () => {
  it('flag ausente ou consentimento ausente não consulta capacidade nem carrega a captura', async () => {
    const { rerender } = await render(view());
    expect(screen.queryByRole('button', { name: ENTRY })).toBeNull();
    mockExpoExtra.webVoiceEnabled = true;
    await rerender(view(false));
    expect(screen.queryByRole('button', { name: ENTRY })).toBeNull();
    expect(SimulatedSpeechRecognition.available).not.toHaveBeenCalled();
    expect(SimulatedSpeechRecognition.getUserMedia).not.toHaveBeenCalled();
    expect(mockLoadRegistration).not.toHaveBeenCalled();
  });

  it.each(['downloadable', 'unavailable', 'downloading', undefined])('mantém voz oculta para capacidade %s', async capability => {
    mockExpoExtra.webVoiceEnabled = true;
    SimulatedSpeechRecognition.available.mockResolvedValue(capability);
    await render(view());
    expect(SimulatedSpeechRecognition.available).toHaveBeenCalledWith({ langs: ['pt-BR'], processLocally: true });
    expect(screen.queryByRole('button', { name: ENTRY })).toBeNull();
    expect(instances).toHaveLength(0);
    expect(SimulatedSpeechRecognition.install).not.toHaveBeenCalled();
  });

  it('verifica a capacidade sem instanciar o motor e carrega a captura só após toque', async () => {
    mockExpoExtra.webVoiceEnabled = true;
    await render(view());
    const entry = await screen.findByRole('button', { name: ENTRY });
    expect(instances).toHaveLength(0);
    expect(mockLoadRegistration).not.toHaveBeenCalled();

    await fireEvent.press(entry);
    expect(await screen.findByRole('button', { name: 'Começar a falar' })).toBeOnTheScreen();
    expect(mockLoadRegistration).toHaveBeenCalledTimes(1);
    expect(instances).toHaveLength(0);
    expect(SimulatedSpeechRecognition.getUserMedia).not.toHaveBeenCalled();
  });

  it('edita, confirma uma vez e aguarda ACK para oferecer segunda medição', async () => {
    mockExpoExtra.webVoiceEnabled = true;
    let acknowledge!: (id: string) => void;
    mockAdd.mockImplementationOnce(() => new Promise(resolve => { acknowledge = resolve; }));
    await render(view());
    const speech = await startVoice();
    expect(speech).toMatchObject({ processLocally: true, lang: 'pt-BR' });
    const finish = screen.getByRole('button', { name: 'Terminar fala' });
    await fireEvent.press(finish);
    await fireEvent.press(finish);
    expect(speech.start).toHaveBeenCalledTimes(1);
    expect(speech.stop).toHaveBeenCalledTimes(1);

    const confirm = await recognized(speech);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Sistólica').props.value).toBe('120');
    await fireEvent.changeText(screen.getByLabelText('Sistólica'), '135');
    await fireEvent.press(confirm);
    await fireEvent.press(confirm);
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledWith('alice-synthetic', {
      systolic: 135, diastolic: 80, pulse: 72, note: null,
      measuredAt: expect.any(Date), source: 'voice', sessionReadings: null,
    });
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(onSaved).not.toHaveBeenCalled();
    await act(() => acknowledge('reading-synthetic'));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'reading-synthetic', systolic: 135 }));
  });

  it('toques repetidos durante a verificação do pacote iniciam uma única captura', async () => {
    mockExpoExtra.webVoiceEnabled = true;
    await render(view());
    await fireEvent.press(await screen.findByRole('button', { name: ENTRY }));
    let available!: (value: string) => void;
    SimulatedSpeechRecognition.available.mockImplementationOnce(() => new Promise(resolve => { available = resolve; }));
    const start = await screen.findByRole('button', { name: 'Começar a falar' });
    await fireEvent.press(start);
    await fireEvent.press(start);
    expect(instances).toHaveLength(1);

    await act(() => available('available'));
    await screen.findByText('Ouvindo. Diga uma única medição.');
    expect(instances[0].start).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
  });

  it('cancelar durante captura libera microfone e descarta retorno tardio', async () => {
    mockExpoExtra.webVoiceEnabled = true;
    await render(view());
    const speech = await startVoice();
    const late = speech.onresult;
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    await act(() => late?.(simulatedResult('doze por oito')));
    expect(speech.abort).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: CONFIRM })).toBeNull();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('cancelar revisão descarta valores e não escreve', async () => {
    mockExpoExtra.webVoiceEnabled = true;
    await render(view());
    await recognized(await startVoice());
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByLabelText('Sistólica')).toBeNull();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it.each(['silêncio', 'parcial', 'falha', 'comando de voz'])('ignora %s sem salvar ou liberar confirmação', async reason => {
    mockExpoExtra.webVoiceEnabled = true;
    await render(view());
    const speech = await startVoice();
    await act(() => {
      if (reason === 'parcial') speech.onresult?.(simulatedResult('doze por oito', false));
      if (reason === 'falha') speech.onerror?.({ error: 'not-allowed', message: 'dado sintético sensível' });
      if (reason === 'comando de voz') speech.onresult?.(simulatedResult('salvar'));
      speech.onend?.();
    });
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: CONFIRM })).toBeNull();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('troca de conta aborta a captura e ignora o final da conta anterior', async () => {
    mockExpoExtra.webVoiceEnabled = true;
    const { rerender } = await render(view());
    const speech = await startVoice();
    const late = speech.onresult;
    signInAs('bob-synthetic', 2);
    await rerender(view());
    await act(() => late?.(simulatedResult('doze por oito')));
    expect(speech.abort).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: CONFIRM })).toBeNull();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('novo login com o mesmo UID descarta a revisão e uma ação de confirmação antiga', async () => {
    mockExpoExtra.webVoiceEnabled = true;
    const { rerender } = await render(view());
    const oldConfirm = await recognized(await startVoice());

    await act(async () => {
      // A identidade ao vivo já mudou, mesmo se o React ainda exibir o botão anterior.
      mockEpoch = null;
      await fireEvent.press(oldConfirm);
    });
    signInAs('alice-synthetic', 2);
    await rerender(view());
    expect(screen.queryByLabelText('Sistólica')).toBeNull();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('sair da aba descarta a revisão e ACK tardio de escrita já confirmada', async () => {
    mockExpoExtra.webVoiceEnabled = true;
    let acknowledge!: (id: string) => void;
    mockAdd.mockImplementationOnce(() => new Promise(resolve => { acknowledge = resolve; }));
    const { rerender } = await render(view());
    await fireEvent.press(await recognized(await startVoice()));
    expect(mockAdd).toHaveBeenCalledTimes(1);
    mockIsFocused = false;
    await rerender(view());
    await act(() => acknowledge('late'));
    expect(screen.queryByLabelText('Sistólica')).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
