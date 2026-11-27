import { useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { createAndroidVoiceSession, type VoiceState } from '@/services/recognition/android-voice-session';
import { loadAndroidVoiceBinding } from '@/services/recognition/voice-android';
import type { AndroidVoicePorts } from '@/services/recognition/voice-capture-contract';

import { useVoiceReview, type VoiceReviewOptions } from './useVoiceReview';

type AndroidVoiceReviewOptions = Extract<VoiceReviewOptions, { mode: 'preview' }>
  | (Extract<VoiceReviewOptions, { mode: 'recognition' }> & {
    isCurrent: () => boolean;
    isDatePickerOpen: () => boolean;
  });

function access() {
  let binding: AndroidVoicePorts | null = null;
  return { get: () => binding ??= loadAndroidVoiceBinding(), optional: () => binding };
}
export function useAndroidVoiceReview(options: AndroidVoiceReviewOptions = { mode: 'preview' }) {
  const [settings] = useState(() => options);
  const review = useVoiceReview(settings);
  const [state, setState] = useState<VoiceState>({ phase: 'idle', attemptId: 0, issue: null });
  const [handles] = useState(access);
  const attempt = useRef(0);
  const session = useRef<ReturnType<typeof createAndroidVoiceSession> | null>(null);
  const isCurrent = () => settings.mode === 'preview' || settings.isCurrent();

  useLayoutEffect(() => {
    const cancelled = { code: 'cancelled' };
    let permissionPending = false;
    const capture = createAndroidVoiceSession({
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
    }, next => {
      setState(next);
      if (next.phase === 'failed' || next.phase === 'blocked' || next.phase === 'cancelled') review.cancel();
    }, (_id, final) => {
      if (isCurrent()) review.receiveFinal(attempt.current, final, 'recognition');
      else review.cancel();
    });
    session.current = capture;
    function stop() { review.cancel(); void capture.cancel(); }
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
    if (isCurrent() && session.current?.start()) attempt.current = review.newAttempt();
    return attempt.current;
  }
  function cancel() { review.cancel(); void session.current?.cancel(); }
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
