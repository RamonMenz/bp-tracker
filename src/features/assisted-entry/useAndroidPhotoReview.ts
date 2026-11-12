import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { createAndroidPhotoSession, type PhotoCaptureState } from '@/services/recognition/android-photo-session';
import { loadAndroidPhotoBinding, type AndroidPhotoBinding } from '@/services/recognition/photo-android';
import { describeFrameFailure } from '@/services/recognition/frame-diagnostic';
import type { AndroidCameraHandle } from '@/services/recognition/photo-capture-contract';

import { useCandidateReview } from './useCandidateReview';

type PhotoSession = ReturnType<typeof createAndroidPhotoSession>;

function safeAppState(value: unknown): string {
  return value === 'active' || value === 'background' || value === 'inactive'
    || value === 'unknown' || value === 'extension' ? value : 'indefinido';
}
function safeNativeStatus(value: unknown): string {
  return value === 'ready' || value === 'resource-busy' || value === 'permission-denied'
    || value === 'camera-failed' || value === 'cleanup-failed' ? value : 'outro';
}

// Recursos opacos em closures privadas; apenas fases/candidatos vão ao estado de UI.
function createViewAccess() {
  let binding: AndroidPhotoBinding | null = null;
  let camera: AndroidCameraHandle | null = null;
  let attempt = 0;
  return { binding: () => binding, camera: () => camera, attempt: () => attempt,
    setBinding: (value: AndroidPhotoBinding) => { binding = value; },
    attachCamera: (value: AndroidCameraHandle | null) => { camera = value; },
    setAttempt: (value: number) => { attempt = value; } };
}

/** Avaliação real do frame -> OCR -> revisão. Confirmação só em memória, sem writer. */
export function useAndroidPhotoReview() {
  const review = useCandidateReview('photo', { simulation: false, previewOnly: true });
  const [captureState, setCaptureState] = useState<PhotoCaptureState>({ phase: 'idle', attemptId: 0, issue: null });
  const [binding, setBinding] = useState<AndroidPhotoBinding | null>(null);
  const [access] = useState(createViewAccess);
  const sessionsRef = useRef<{ session: PhotoSession | null; retirement: Promise<boolean> | null }>({
    session: null, retirement: null,
  });
  // Somente codigos de controle limitados a 18 entradas em memoria. Nunca incluir
  // observacoes, candidatos, texto OCR, valores clinicos ou excecoes de SDK.
  const [diagnostics, setDiagnostics] = useState<readonly string[]>([]);
  const diagnosticMounted = useRef(true);
  const record = useCallback((code: string) => {
    if (diagnosticMounted.current) setDiagnostics(previous => [...previous.slice(-17), code]);
  }, []);
  useEffect(() => {
    diagnosticMounted.current = true;
    return () => { diagnosticMounted.current = false; };
  }, []);
  const attachCamera = useCallback((value: AndroidCameraHandle | null) => {
    access.attachCamera(value);
    record(value ? 'view:referencia-presente' : 'view:referencia-removida');
  }, [access, record]);
  useEffect(() => {
    const sessions = sessionsRef.current;
    // Recursos pertencem ao efeito. Strict Effects/Fast Refresh preservam estado,
    // mas executam cleanup/setup: nao reutilizar uma sessao ja descartada.
    const session = createAndroidPhotoSession({
      requestPermission: async () => {
        record('permissao:verificando');
        try {
          const allowed = await access.binding()!.requestPermission();
          record(allowed ? 'permissao:concedida' : 'permissao:negada');
          return allowed;
        } catch {
          record('permissao:falha');
          throw new Error('camera-permission-failed');
        }
      },
      open: () => { record('view:montagem-solicitada'); },
      recognize: async () => {
        const camera = access.camera();
        if (!camera) throw new Error('camera-unavailable');
        const raw: unknown = await camera.recognize();
        if (raw && typeof raw === 'object' && 'frameDiagnostic' in raw) {
          for (const line of describeFrameFailure(raw.frameDiagnostic)) record(line);
        }
        return raw;
      },
      close: () => access.camera()?.cancelCapture() ?? Promise.resolve(true),
    }, next => {
      if (sessions.session === session) {
        record(`fase:${next.phase}`);
        if (next.issue) record(`falha:${next.issue}`);
        setCaptureState(next);
      }
    }, (_attemptId, candidates) => {
      if (sessions.session === session) review.receive(access.attempt(), candidates);
    });
    sessions.session = session;
    record('sessao:criada');
    const retirement = sessions.retirement;
    if (retirement) {
      // Nao abrir nova camera enquanto a sessao anterior ainda libera recursos.
      setCaptureState({ phase: 'closing', attemptId: 0, issue: null });
      void retirement.then(released => {
        if (sessions.session !== session || sessions.retirement !== retirement) return;
        if (released) {
          sessions.retirement = null;
          setCaptureState({ phase: 'idle', attemptId: 0, issue: null });
        } else {
          setCaptureState({ phase: 'blocked', attemptId: 0, issue: 'cleanup-failed' });
        }
      });
    }
    const listener = AppState.addEventListener('change', state => {
      record(`app:${safeAppState(state)}`);
      if (state !== 'active') {
        record('cancelamento:mudanca-do-app');
        review.cancel(); void session.cancel();
      }
    });
    return () => {
      listener.remove();
      if (sessions.session === session) sessions.session = null;
      session.dispose();
      const previous = sessions.retirement ?? Promise.resolve(true);
      // Preservar a barreira inclusive em varios ciclos de cleanup/setup.
      sessions.retirement = Promise.all([previous, session.settled()])
        .then(([released]) => released && session.isReleased(), () => false);
    };
    // Métodos da revisão acessam refs síncronas; identidade fixa por montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, record]);
  function start(): number {
    record('toque:iniciar');
    record(`app-no-toque:${safeAppState(AppState.currentState)}`);
    const session = sessionsRef.current.session;
    if (!session) { record('bloqueio:sem-sessao'); return access.attempt(); }
    if (sessionsRef.current.retirement) { record('bloqueio:limpeza-pendente'); return access.attempt(); }
    if (AppState.currentState !== 'active') { record('bloqueio:app-nao-ativo'); return access.attempt(); }
    try {
      if (!access.binding()) {
        const loaded = loadAndroidPhotoBinding(route => record(route === 'already-granted'
          ? 'permissao:ja-concedida-sem-dialogo' : 'permissao:dialogo-necessario'));
        access.setBinding(loaded); setBinding(loaded);
        record('modulo:carregado');
        record(`modulo-nativo:${loaded.nativeRevision ?? 'anterior'}`);
      }
      const accepted = session.start();
      record(accepted ? 'inicio:aceito' : 'inicio:recusado');
      if (accepted) access.setAttempt(review.recapture());
    } catch {
      record('modulo:falha');
      setCaptureState({ phase: 'failed', attemptId: 0, issue: 'unsupported' });
    }
    return access.attempt();
  }
  function cancel() { record('toque:cancelar'); review.cancel(); void sessionsRef.current.session?.cancel(); }
  const onStatus = useCallback((attemptId: number, code: string) => {
    record(`nativo:${safeNativeStatus(code)}`);
    sessionsRef.current.session?.status(attemptId, code);
  }, [record]);
  const busy = ['permission', 'opening', 'ready', 'recognizing', 'closing', 'blocked'].includes(captureState.phase);
  return { review: { ...review, recapture: start, cancel, recaptureDisabled: busy }, captureState,
    binding, attachCamera, start,
    capture: () => { record('toque:capturar'); return sessionsRef.current.session?.capture() ?? false; },
    onStatus, busy, diagnostics, diagnosticVersion: 'captura-5' as const,
    diagnosticNativeRevision: binding?.nativeRevision ?? 'nao-carregado',
    diagnosticAppState: safeAppState(AppState.currentState) };
}
