import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { requireOptionalNativeModule } from 'expo';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { DateTimeField } from '@/components/ui/DateTimeField';
import type { UseSessionResult } from '@/features/auth/useSession';
import { ConsentGateContext } from '@/features/privacy/useConsentGate';
import { addReading } from '@/features/readings/readings.repo';

import { VoiceEntry } from './VoiceEntry.native';

const mockExpoExtra: { androidVoiceEnabled?: boolean; webVoiceEnabled?: boolean } = {};
let mockSession: UseSessionResult;
let mockEpoch: UseSessionResult['sessionEpoch'];
let mockIsFocused: boolean;
const mockLoadCapability = jest.fn();
const mockLoadRegistration = jest.fn();

jest.mock('expo', () => ({ ...jest.requireActual('expo'), requireOptionalNativeModule: jest.fn() }));
jest.mock('expo-constants', () => ({ expoConfig: { get extra() { return mockExpoExtra; } } }));
jest.mock('expo-router', () => ({ useIsFocused: () => mockIsFocused }));
jest.mock('@/features/auth/useSession', () => ({ useSession: () => mockSession }));
jest.mock('@/features/auth/auth.repo', () => ({ subscribePrivacyConsent: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));
jest.mock('@/features/readings/readings.repo', () => ({ addReading: jest.fn() }));
jest.mock('@/components/ui/DateTimeField', () => ({ DateTimeField: jest.fn(() => null) }));
// Jest CommonJS substitui apenas o import assíncrono. Adaptador, sessão e revisão são reais.
jest.mock('./loadAndroidVoice', () => ({
  loadAndroidVoiceCapability: async () => {
    mockLoadCapability();
    return jest.requireActual('@/services/recognition/voice-android.native');
  },
  loadAndroidVoiceRegistration: async () => {
    mockLoadRegistration();
    return jest.requireActual('./AndroidVoiceRegistration');
  },
}));

const VERIFY = 'Verificar voz local';
const ENTRY = 'Registrar por voz';
const CONFIRM = 'Confirmar e salvar medição';
const READY = { code: 'ready' };
const FINAL = {
  kind: 'transcript', final: true, locale: 'pt-BR', capturedAtMs: 1793001600000,
  text: 'doze por oito, pulso setenta e dois', confidence: 0.99,
};
const onSaved = jest.fn();
const mockAdd = jest.mocked(addReading);
const appStateListeners = new Set<{ event: string; listener: (state: AppStateStatus) => void }>();
let sendStatus: (event: unknown) => void;
let deliver: (result: unknown) => void;

const simulatedNativeVoice = {
  checkLocalLanguage: jest.fn<Promise<unknown>, [number]>(),
  availability: jest.fn(async () => READY),
  requestMicrophonePermission: jest.fn<Promise<boolean>, []>(),
  prepare: jest.fn<Promise<unknown>, [number]>(),
  start: jest.fn((id: number) => new Promise(resolve => {
    deliver = resolve;
    sendStatus({ attemptId: id, status: 'listening' });
  })),
  finish: jest.fn(async () => true),
  cancel: jest.fn(async () => true),
  addListener: jest.fn((_event: string, listener: typeof sendStatus) => {
    sendStatus = listener;
    return { remove: jest.fn() };
  }),
};

function signInAs(uid: string, id: number) {
  mockEpoch = { id };
  mockSession = {
    user: { uid } as UseSessionResult['user'], sessionEpoch: mockEpoch, getSessionEpoch: () => mockEpoch,
    isLoading: false, signIn: jest.fn(), signOut: jest.fn(),
  };
}

function view(hasConsent = true) {
  return <ConsentGateContext.Provider value={{ hasConsent, getHasConsent: () => hasConsent }}>
    <VoiceEntry onSaved={onSaved} />
  </ConsentGateContext.Provider>;
}

function press(name: string) {
  return fireEvent.press(screen.getByRole('button', { name }));
}

async function openVoice() {
  await press(VERIFY);
  await fireEvent.press(await screen.findByRole('button', { name: ENTRY }));
  return screen.findByRole('button', { name: 'Começar a falar' });
}

async function startVoice() {
  await fireEvent.press(await openVoice());
  await screen.findByRole('button', { name: 'Terminar fala' });
}

async function finishWith(result: unknown = FINAL) {
  await act(() => deliver(result));
}

function appState(event: 'blur' | 'change', state: AppStateStatus = 'active') {
  return act(() => {
    for (const entry of appStateListeners) {
      if (entry.event === event) entry.listener(state);
    }
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  appStateListeners.clear();
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(AppState, 'addEventListener').mockImplementation((event, listener) => {
    const entry = { event, listener };
    appStateListeners.add(entry);
    return { remove: () => { appStateListeners.delete(entry); } };
  });
  mockExpoExtra.androidVoiceEnabled = true;
  delete mockExpoExtra.webVoiceEnabled;
  mockIsFocused = true;
  signInAs('alice-sintetica', 1);
  jest.mocked(requireOptionalNativeModule).mockReturnValue(simulatedNativeVoice);
  simulatedNativeVoice.checkLocalLanguage.mockResolvedValue(READY);
  simulatedNativeVoice.requestMicrophonePermission.mockResolvedValue(true);
  simulatedNativeVoice.prepare.mockResolvedValue(READY);
  mockAdd.mockResolvedValue('leitura-sintetica');
});

afterEach(() => jest.restoreAllMocks());

describe('V3 Android · módulo reconhecedor SIMULADO', () => {
  it('flag Android ausente ou sem consentimento deixa a entrada e as importações desligadas', async () => {
    delete mockExpoExtra.androidVoiceEnabled;
    mockExpoExtra.webVoiceEnabled = true;
    const { rerender } = await render(view());
    expect(screen.queryByRole('button', { name: VERIFY })).toBeNull();
    mockExpoExtra.androidVoiceEnabled = true;
    await rerender(view(false));
    expect(screen.queryByRole('button', { name: VERIFY })).toBeNull();
    expect(mockLoadCapability).not.toHaveBeenCalled();
    expect(mockLoadRegistration).not.toHaveBeenCalled();
    expect(requireOptionalNativeModule).not.toHaveBeenCalled();
  });

  it.each(['language-unverified', 'model-missing', 'local-unavailable', 'unsupported'])('mantém o manual com capacidade %s', async code => {
    simulatedNativeVoice.checkLocalLanguage.mockResolvedValue({ code });
    if (code === 'unsupported') jest.mocked(requireOptionalNativeModule).mockReturnValue(null);
    await render(view());
    await press(VERIFY);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Use o registro manual\./);
    expect(screen.queryByRole('button', { name: ENTRY })).toBeNull();
    expect(mockLoadRegistration).not.toHaveBeenCalled();
    expect(simulatedNativeVoice.requestMicrophonePermission).not.toHaveBeenCalled();
    expect(simulatedNativeVoice.start).not.toHaveBeenCalled();
  });

  it('verifica uma vez sob demanda e só pede microfone em Começar a falar', async () => {
    let resolve!: (value: unknown) => void;
    simulatedNativeVoice.checkLocalLanguage.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    await render(view());
    expect(screen.queryByRole('button', { name: ENTRY })).toBeNull();
    expect(requireOptionalNativeModule).not.toHaveBeenCalled();
    const verify = screen.getByRole('button', { name: VERIFY });
    await fireEvent.press(verify);
    await fireEvent.press(verify);
    expect(mockLoadCapability).toHaveBeenCalledTimes(1);
    expect(simulatedNativeVoice.checkLocalLanguage).toHaveBeenCalledTimes(1);
    expect(simulatedNativeVoice.checkLocalLanguage).toHaveBeenCalledWith(expect.any(Number));
    expect(mockLoadRegistration).not.toHaveBeenCalled();
    await act(() => resolve(READY));
    await press(ENTRY);
    expect(await screen.findByRole('button', { name: 'Começar a falar' })).toBeOnTheScreen();
    expect(mockLoadRegistration).toHaveBeenCalledTimes(1);
    expect(simulatedNativeVoice.requestMicrophonePermission).not.toHaveBeenCalled();
    expect(simulatedNativeVoice.start).not.toHaveBeenCalled();
  });

  it('descarta a verificação tardia ao trocar de conta', async () => {
    let resolve!: (value: unknown) => void;
    simulatedNativeVoice.checkLocalLanguage.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const { rerender } = await render(view());
    await press(VERIFY);
    const [id] = simulatedNativeVoice.checkLocalLanguage.mock.calls[0];
    signInAs('bob-sintetico', 2);
    await rerender(view());
    await act(() => resolve(READY));
    expect(simulatedNativeVoice.cancel).toHaveBeenCalledWith(id);
    expect(screen.queryByRole('button', { name: ENTRY })).toBeNull();
    expect(simulatedNativeVoice.requestMicrophonePermission).not.toHaveBeenCalled();
  });

  it('edita, confirma uma vez e entrega a medição só após o ACK', async () => {
    let acknowledge!: (id: string) => void;
    let grant!: (allowed: boolean) => void;
    mockAdd.mockImplementationOnce(() => new Promise(resolve => { acknowledge = resolve; }));
    simulatedNativeVoice.requestMicrophonePermission.mockImplementationOnce(() => new Promise(resolve => { grant = resolve; }));
    await render(view());
    const start = await openVoice();
    await fireEvent.press(start);
    await fireEvent.press(start);
    await appState('blur'); // Desfoque produzido pelo próprio diálogo de permissão.
    await act(() => grant(true));
    const finish = await screen.findByRole('button', { name: 'Terminar fala' });
    await fireEvent.press(finish);
    await fireEvent.press(finish);
    expect(simulatedNativeVoice.requestMicrophonePermission).toHaveBeenCalledTimes(1);
    expect(simulatedNativeVoice.prepare).toHaveBeenCalledTimes(1);
    expect(simulatedNativeVoice.start).toHaveBeenCalledTimes(1);
    expect(simulatedNativeVoice.finish).toHaveBeenCalledTimes(1);
    await finishWith();
    expect(mockAdd).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Sistólica').props.value).toBe('120');
    expect(screen.getByLabelText('Observação').props.value).toBe('');
    expect(screen.queryByText(FINAL.text)).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Sistólica'), '135');
    const confirm = screen.getByRole('button', { name: CONFIRM });
    await fireEvent.press(confirm);
    await fireEvent.press(confirm);
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledWith('alice-sintetica', {
      systolic: 135, diastolic: 80, pulse: 72, note: null, measuredAt: new Date(FINAL.capturedAtMs),
      source: 'voice', sessionReadings: null,
    });
    expect(onSaved).not.toHaveBeenCalled();
    await act(() => acknowledge('leitura-sintetica'));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'leitura-sintetica', systolic: 135 }));
  });

  it('cancelar a captura fecha o microfone e ignora resposta tardia', async () => {
    await render(view());
    await startVoice();
    const [id] = simulatedNativeVoice.start.mock.calls[0];
    await press('Cancelar');
    await finishWith();
    expect(simulatedNativeVoice.cancel).toHaveBeenCalledTimes(1);
    expect(simulatedNativeVoice.cancel).toHaveBeenCalledWith(id);
    expect(screen.queryByRole('button', { name: CONFIRM })).toBeNull();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it.each(['cancelamento', 'janela sem foco'])('descarta a revisão em caso de %s', async reason => {
    await render(view());
    await startVoice();
    await finishWith();
    expect(await screen.findByRole('button', { name: CONFIRM })).toBeEnabled();
    if (reason === 'cancelamento') await press('Cancelar');
    else await appState('blur');
    expect(screen.queryByRole('button', { name: CONFIRM })).toBeNull();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('permite editar o horário durante o diálogo local da revisão', async () => {
    await render(view());
    await startVoice();
    await finishWith();
    await fireEvent.press(screen.getByRole('button', { name: /^Hora:/ }));
    const picker = jest.mocked(DateTimeField).mock.lastCall![0];
    expect(picker.mode).toBe('time');
    await appState('blur');
    const measuredAt = new Date(FINAL.capturedAtMs - 60000);
    await act(() => { picker.onChange(measuredAt); picker.onClose(); });
    expect(mockAdd).not.toHaveBeenCalled();
    await press(CONFIRM);
    expect(mockAdd).toHaveBeenCalledWith('alice-sintetica', expect.objectContaining({ measuredAt }));
  });

  it.each([['silêncio', { code: 'no-result' }], ['falha', { code: 'engine-failed', message: FINAL.text }],
    ['parcial', { ...FINAL, final: false }], ['interrupção de áudio', { code: 'interrupted' }],
  ])('descarta %s sem revisão ou escrita', async (_reason, result) => {
    await render(view());
    await startVoice();
    await finishWith(result);
    expect(await screen.findByRole('alert')).not.toHaveTextContent(/doze por oito, pulso setenta e dois/);
    expect(screen.queryByRole('button', { name: CONFIRM })).toBeNull();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('permissão negada mantém o manual e não prepara ou abre o microfone', async () => {
    simulatedNativeVoice.requestMicrophonePermission.mockResolvedValueOnce(false);
    await render(view());
    await fireEvent.press(await openVoice());
    expect(await screen.findByRole('alert')).toHaveTextContent(/Permissão de microfone negada\./);
    expect(simulatedNativeVoice.prepare).not.toHaveBeenCalled();
    expect(simulatedNativeVoice.start).not.toHaveBeenCalled();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it.each(['segundo plano', 'perda de foco da tela', 'troca de conta'])('descarta resposta tardia após %s', async reason => {
    const { rerender } = await render(view());
    await startVoice();
    if (reason === 'segundo plano') await appState('change', 'background');
    else {
      if (reason === 'troca de conta') signInAs('bob-sintetico', 2);
      else mockIsFocused = false;
      await rerender(view());
    }
    await finishWith();
    if (reason === 'segundo plano') await appState('change');
    expect(simulatedNativeVoice.cancel).toHaveBeenCalledTimes(1);
    expect(simulatedNativeVoice.start).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: CONFIRM })).toBeNull();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('bloqueia a confirmação antiga em novo login do mesmo UID', async () => {
    const { rerender } = await render(view());
    await startVoice();
    await finishWith();
    const confirm = await screen.findByRole('button', { name: CONFIRM });
    mockEpoch = null;
    await fireEvent.press(confirm);
    signInAs('alice-sintetica', 2);
    await rerender(view());
    expect(screen.queryByLabelText('Sistólica')).toBeNull();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('descarta o ACK após sair da tela com uma escrita já confirmada', async () => {
    let acknowledge!: (id: string) => void;
    mockAdd.mockImplementationOnce(() => new Promise(resolve => { acknowledge = resolve; }));
    const { rerender } = await render(view());
    await startVoice();
    await finishWith();
    await press(CONFIRM);
    expect(mockAdd).toHaveBeenCalledTimes(1);
    mockIsFocused = false;
    await rerender(view());
    await act(() => acknowledge('leitura-sintetica'));
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Sistólica')).toBeNull();
  });
});
