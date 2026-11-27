import { useLayoutEffect, useRef, useState } from 'react';

import { createVoiceSession, type VoiceState } from '@/services/recognition/voice-session';
import { createWebVoicePorts, type WebVoiceModelState } from '@/services/recognition/web-voice.web';

import { useVoiceReview, type VoiceReviewOptions } from './useVoiceReview';

type WebVoiceReviewOptions = Extract<VoiceReviewOptions, { mode: 'preview' }>
  | (Extract<VoiceReviewOptions, { mode: 'recognition' }> & { isCurrent: () => boolean });

export function useWebVoiceReview(options: WebVoiceReviewOptions = { mode: 'preview' }) {
  const review = useVoiceReview(options);
  const [state, setState] = useState<VoiceState>({ phase: 'idle', attemptId: 0, issue: null });
  const attempt = useRef(0);
  const [ports] = useState(createWebVoicePorts);
  const [modelState, setModelState] = useState<WebVoiceModelState | null>(null);
  const activeInstallation = useRef<ReturnType<typeof ports.installModel>>(null);
  const session = useRef<ReturnType<typeof createVoiceSession> | null>(null);
  const isCurrent = () => options.mode === 'preview' || options.isCurrent();
  useLayoutEffect(() => {
    const capture = createVoiceSession({
      ...ports,
      start: id => isCurrent() ? ports.start(id) : Promise.resolve({ code: 'cancelled' }),
    }, next => {
      setState(next);
      if (next.phase === 'failed' || next.phase === 'blocked' || next.phase === 'cancelled') review.cancel();
    }, (_id, final) => {
      if (isCurrent()) review.receiveFinal(attempt.current, final, 'recognition');
    });
    session.current = capture;
    const stop = () => { ports.cancelModelInstallation(); review.cancel(); void capture.cancel(); };
    const visibility = () => { if (document.visibilityState !== 'visible') stop(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', stop);
    return () => {
      session.current = null;
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', stop);
      activeInstallation.current = null;
      ports.cancelModelInstallation();
      if (options.mode === 'recognition') options.confirmation.cancel();
      capture.dispose();
    };
    // Instâncias fixas; métodos de revisão usam refs correntes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ports]);
  function start(): number {
    if (isCurrent() && !activeInstallation.current && session.current?.start()) {
      setModelState(null);
      attempt.current = review.newAttempt();
    }
    return attempt.current;
  }
  function installModel() {
    if (activeInstallation.current || !session.current?.isReleased()) return;
    const task = ports.installModel();
    if (!task) return;
    activeInstallation.current = task;
    setModelState('installing');
    void task.then(outcome => {
      if (activeInstallation.current !== task) return;
      activeInstallation.current = null;
      setModelState(outcome);
    });
  }
  function cancel() { ports.cancelModelInstallation(); review.cancel(); void session.current?.cancel(); }
  async function leaveForManual(): Promise<boolean> {
    const capture = session.current;
    cancel();
    await capture?.settled();
    return capture?.isReleased() ?? true;
  }
  const busy = modelState === 'installing'
    || ['checking','permission','preparing','opening','listening','recognizing','closing','blocked'].includes(state.phase);
  return { state, busy, start, finish: () => session.current?.finish() ?? false, leaveForManual,
    modelState, canInstallModel: !busy && ports.canInstallModel(), installModel,
    review: { ...review, cancel, recapture: start, recaptureDisabled: busy || review.state.phase === 'confirming',
      previewNotice: options.mode === 'preview'
        ? 'Voz Web local em avaliação. Use apenas dados sintéticos ditados; não há simulação de reconhecimento. Confirmação somente em memória.'
        : undefined } };
}
