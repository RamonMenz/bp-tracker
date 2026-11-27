import { useEffect, useState } from 'react';

import { createWebPhotoSession, type WebPhotoState } from '@/services/recognition/web-photo-session.web';

import { useCandidateReview } from './useCandidateReview';

function createAccess() {
  let video: HTMLVideoElement | null = null;
  let attempt = 0;
  return { video: () => video, attach: (element: HTMLVideoElement | null) => { video = element; },
    attempt: () => attempt, setAttempt: (value: number) => { attempt = value; } };
}
export function useWebPhotoReview() {
  const review = useCandidateReview('photo', { simulation: false, previewOnly: true });
  const [state, setState] = useState<WebPhotoState>({ phase: 'idle', attemptId: 0, issue: null, source: 'camera' });
  const [access] = useState(createAccess);
  const [session] = useState(() => createWebPhotoSession(access.video, setState, candidates => {
    review.receive(access.attempt(), candidates);
  }));
  useEffect(() => {
    const stop = () => { review.cancel(); void session.cancel(); };
    const visibility = () => { if (document.visibilityState !== 'visible') stop(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', stop);
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', stop); session.dispose(); };
    // Instância por montagem; métodos da revisão acessam suas refs síncronas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  function start(source: WebPhotoState['source'] = 'camera'): number {
    if (session.start(source)) access.setAttempt(review.recapture());
    return access.attempt();
  }
  function cancel() { review.cancel(); void session.cancel(); }
  const busy = ['permission', 'opening', 'ready', 'recognizing', 'closing', 'blocked'].includes(state.phase);
  return { state, busy, attachVideo: access.attach, start, capture: session.capture,
    review: { ...review, cancel, recapture: () => start('camera'), recaptureDisabled: busy,
      previewNotice: state.source === 'synthetic-card'
        ? 'OCR real em cartão sintético, sem câmera. Confirmação apenas em memória; sem gravação clínica.'
        : 'Captura Web em avaliação. Confirmação apenas em memória; sem gravação clínica.' } };
}
