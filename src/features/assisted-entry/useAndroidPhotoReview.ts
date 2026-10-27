import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { createAndroidPhotoSession, type PhotoCaptureState } from '@/services/recognition/android-photo-session';
import { loadAndroidPhotoBinding, type AndroidPhotoBinding } from '@/services/recognition/photo-android';
import type { AndroidCameraHandle } from '@/services/recognition/photo-capture-contract';

import { useCandidateReview } from './useCandidateReview';

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
  const [session] = useState(() => createAndroidPhotoSession({
    requestPermission: () => access.binding()!.requestPermission(),
    open: () => { /* A fase opening monta/ativa a view com attemptId. */ },
    recognize: () => access.camera()?.recognize() ?? Promise.reject(new Error('camera-unavailable')),
    close: () => access.camera()?.cancelCapture() ?? Promise.resolve(true),
  }, setCaptureState, (_attemptId, candidates) => { review.receive(access.attempt(), candidates); }));
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') { review.cancel(); void session.cancel(); }
    });
    return () => { listener.remove(); session.dispose(); };
    // Métodos da revisão acessam refs síncronas; identidade fixa por montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  function start(): number {
    try {
      if (!access.binding()) {
        const loaded = loadAndroidPhotoBinding();
        access.setBinding(loaded); setBinding(loaded);
      }
      if (session.start()) access.setAttempt(review.recapture());
    } catch { setCaptureState({ phase: 'failed', attemptId: 0, issue: 'unsupported' }); }
    return access.attempt();
  }
  function cancel() { review.cancel(); void session.cancel(); }
  const busy = ['permission', 'opening', 'ready', 'recognizing', 'closing', 'blocked'].includes(captureState.phase);
  return { review: { ...review, recapture: start, cancel, recaptureDisabled: busy }, captureState,
    binding, attachCamera: access.attachCamera, start, capture: session.capture, onStatus: session.status, busy };
}
