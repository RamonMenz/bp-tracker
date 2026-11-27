import { useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { createAndroidVoiceSession, type AndroidVoiceDiagnostic, type VoiceState } from '@/services/recognition/android-voice-session';
import { loadAndroidVoiceBinding } from '@/services/recognition/voice-android';
import type { AndroidVoicePorts } from '@/services/recognition/voice-capture-contract';
import { createVoiceSession } from '@/services/recognition/voice-session';

import { useVoiceReview, type VoiceReviewOptions } from './useVoiceReview';

type AndroidVoiceReviewOptions = (Extract<VoiceReviewOptions, { mode: 'preview' }> & {
  onDiagnostic?: (diagnostic: AndroidVoiceDiagnostic | null) => void;
})
  | (Extract<VoiceReviewOptions, { mode: 'recognition' }> & {
    isCurrent: () => boolean;
    isDatePickerOpen: () => boolean;
  });

function access(withHypotheses: boolean) {
  let binding: AndroidVoicePorts | null = null;
  return { get: () => binding ??= loadAndroidVoiceBinding(withHypotheses), optional: () => binding };
}
export function useAndroidVoiceReview(options: AndroidVoiceReviewOptions = { mode: 'preview' }) {
  const [settings] = useState(() => options);
  const { receivePreview, ...review } = useVoiceReview(settings);
  const onDiagnostic = settings.mode === 'preview' ? settings.onDiagnostic : undefined;
  const [state, setState] = useState<VoiceState>({ phase: 'idle', attemptId: 0, issue: null });
  const [handles] = useState(() => access(settings.mode === 'preview'));
  const attempt = useRef(0);
  const session = useRef<ReturnType<typeof createVoiceSession> | null>(null);
  const isCurrent = () => settings.mode === 'preview' || settings.isCurrent();

  useLayoutEffect(() => {
    const cancelled = { code: 'cancelled' };
    let permissionPending = false;
    const ports: AndroidVoicePorts = {
      availability: () => handles.get().availability(),
      requestPermission: async () => {
        if (!isCurrent()) return false;
        permissionPending = true;
        try { return await handles.get().requestPermission(); }
        finally { permissionPending = false; }
      },
      prepare: id => isCurrent() ? handles.get().prepare(id) : Promise.resolve(cancelled),
      start: id => isCurrent() ? handles.get().start(id) : Promise.resolve(cancelled),
      finish: id => handles.get().finish(id),
      close: id => handles.optional()?.close(id) ?? Promise.resolve(true),
      listen: listener => handles.get().listen(listener),
    };
    function updateState(next: VoiceState) {
      setState(next);
      if (next.phase === 'failed' || next.phase === 'blocked' || next.phase === 'cancelled') review.cancel();
    }
    const capture = settings.mode === 'preview'
      ? createAndroidVoiceSession(ports, updateState, (_id, { candidates, diagnostic }) => {
        if (candidates) receivePreview(attempt.current, candidates);
        onDiagnostic?.(diagnostic);
      })
      : createVoiceSession(ports, updateState, (_id, final) => {
        if (isCurrent()) review.receiveFinal(attempt.current, final, 'recognition');
        else review.cancel();
      });
    session.current = capture;
    function stop() { review.cancel(); onDiagnostic?.(null); void capture.cancel(); }
    const listener = AppState.addEventListener('change', next => {
      if (next !== 'active') stop();
    });
    const blurListener = settings.mode === 'recognition' ? AppState.addEventListener('blur', () => {
      // Os próprios diálogos nativos podem desfocar a janela sem tirar o app do primeiro plano.
      if (!permissionPending && !settings.isDatePickerOpen()) stop();
    }) : null;
    return () => {
      session.current = null;
      listener.remove();
      blurListener?.remove();
      if (settings.mode === 'recognition') settings.confirmation.cancel();
      capture.dispose();
    };
    // Modo/porta fixos; a revisão e o contexto atual são consultados por refs síncronas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handles, settings]);
  function start(): number {
    if (isCurrent() && session.current?.start()) {
      onDiagnostic?.(null);
      attempt.current = review.newAttempt();
    }
    return attempt.current;
  }
  function cancel() { review.cancel(); onDiagnostic?.(null); void session.current?.cancel(); }
  async function leaveForManual(): Promise<boolean> {
    const capture = session.current;
    cancel();
    await capture?.settled();
    return capture?.isReleased() ?? true;
  }
  const busy = ['checking','permission','preparing','opening','listening','recognizing','closing','blocked'].includes(state.phase);
  return { state, busy, start, finish: () => session.current?.finish() ?? false, leaveForManual,
    review: { ...review, cancel, recapture: start, recaptureDisabled: busy || review.state.phase === 'confirming',
      previewNotice: settings.mode === 'preview'
        ? 'Voz local em avaliação com dados sintéticos ditados. Privacidade do serviço exige verificação no aparelho. Confirmar mantém apenas em memória.'
        : undefined } };
}
