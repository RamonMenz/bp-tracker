import { useEffect, useRef, useState } from 'react';

import { createVoiceSession, type VoiceState } from '@/services/recognition/voice-session';
import { createWebVoicePorts, type WebVoiceModelState } from '@/services/recognition/web-voice.web';

import { useVoiceReview } from './useVoiceReview';

function attemptAccess() {
  let attempt = 0;
  return { get: () => attempt, set: (id: number) => { attempt = id; } };
}
export function useWebVoiceReview() {
  const review = useVoiceReview({ mode: 'preview' });
  const [state, setState] = useState<VoiceState>({ phase: 'idle', attemptId: 0, issue: null });
  const [access] = useState(attemptAccess);
  const [ports] = useState(createWebVoicePorts);
  const [modelState, setModelState] = useState<WebVoiceModelState | null>(null);
  const activeInstallation = useRef<ReturnType<typeof ports.installModel>>(null);
  const [session] = useState(() => createVoiceSession(ports, next => {
    setState(next);
    if (next.phase === 'failed' || next.phase === 'blocked' || next.phase === 'cancelled') review.cancel();
  },
    (_id, final) => { review.receiveFinal(access.get(), final, 'recognition'); }));
  useEffect(() => {
    const stop = () => { ports.cancelModelInstallation(); review.cancel(); void session.cancel(); };
    const visibility = () => { if (document.visibilityState !== 'visible') stop(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', stop);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', stop);
      activeInstallation.current = null;
      ports.cancelModelInstallation();
      session.dispose();
    };
    // Instâncias fixas; métodos de revisão usam refs correntes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  function start(): number {
    if (!activeInstallation.current && session.start()) {
      setModelState(null);
      access.set(review.newAttempt());
    }
    return access.get();
  }
  function installModel() {
    if (activeInstallation.current || !session.isReleased()) return;
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
  function cancel() { ports.cancelModelInstallation(); review.cancel(); void session.cancel(); }
  function leaveForManual(): Promise<boolean> {
    ports.cancelModelInstallation();
    review.cancel();
    return session.cancel().then(() => session.isReleased());
  }
  const busy = modelState === 'installing'
    || ['checking','permission','preparing','opening','listening','recognizing','closing','blocked'].includes(state.phase);
  return { state, busy, start, finish: session.finish, leaveForManual,
    modelState, canInstallModel: !busy && ports.canInstallModel(), installModel,
    review: { ...review, cancel, recapture: start, recaptureDisabled: busy,
      previewNotice: 'Voz Web local em avaliação. Use apenas dados sintéticos ditados; não há simulação de reconhecimento. Confirmação somente em memória.' } };
}
