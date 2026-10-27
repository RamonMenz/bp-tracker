import { useEffect, useState } from 'react';

import { createVoiceSession, type VoiceState } from '@/services/recognition/voice-session';
import { createWebVoicePorts } from '@/services/recognition/web-voice.web';

import { useVoiceReview } from './useVoiceReview';

function attemptAccess() {
  let attempt = 0;
  return { get: () => attempt, set: (id: number) => { attempt = id; } };
}
export function useWebVoiceReview() {
  const review = useVoiceReview({ mode: 'preview' });
  const [state, setState] = useState<VoiceState>({ phase: 'idle', attemptId: 0, issue: null });
  const [access] = useState(attemptAccess);
  const [session] = useState(() => createVoiceSession(createWebVoicePorts(), next => {
    setState(next);
    if (next.phase === 'failed' || next.phase === 'blocked' || next.phase === 'cancelled') review.cancel();
  },
    (_id, final) => { review.receiveFinal(access.get(), final, 'recognition'); }));
  useEffect(() => {
    const stop = () => { review.cancel(); void session.cancel(); };
    const visibility = () => { if (document.visibilityState !== 'visible') stop(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', stop);
    return () => {
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', stop); session.dispose();
    };
    // Instâncias fixas; métodos de revisão usam refs correntes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  function start(): number { if (session.start()) access.set(review.newAttempt()); return access.get(); }
  function cancel() { review.cancel(); void session.cancel(); }
  function leaveForManual(): Promise<boolean> { review.cancel(); return session.cancel().then(() => session.isReleased()); }
  const busy = ['checking','permission','preparing','opening','listening','recognizing','closing','blocked'].includes(state.phase);
  return { state, busy, start, finish: session.finish, leaveForManual,
    review: { ...review, cancel, recapture: start, recaptureDisabled: busy,
      previewNotice: 'Voz Web local em avaliação. Use apenas dados sintéticos ditados; não há simulação de reconhecimento. Confirmação somente em memória.' } };
}
