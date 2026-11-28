// DEMO EXPERIMENTAL — liga a sessão do leitor de sete segmentos à revisão compartilhada em modo
// somente-memória (previewOnly: sem writer, sem gravação clínica).
import { useEffect, useState } from 'react';

import type { SevenSegmentDevice } from '@/domain/seven-segment/decode-seven-segment';
import { useCandidateReview } from '@/features/assisted-entry/useCandidateReview';

import { createSevenSegmentSession, type SevenSegmentSource, type SevenSegmentState } from './seven-segment-session';

function createAccess() {
  let video: HTMLVideoElement | null = null;
  let attempt = 0;
  return { video: () => video, attach: (element: HTMLVideoElement | null) => { video = element; },
    attempt: () => attempt, setAttempt: (value: number) => { attempt = value; } };
}

export function useSevenSegmentReview() {
  const review = useCandidateReview('photo', { simulation: false, previewOnly: true });
  const [state, setState] = useState<SevenSegmentState>({ phase: 'idle', issue: null, source: 'camera' });
  const [device, setDevice] = useState<SevenSegmentDevice>('gtech');
  const [access] = useState(createAccess);
  const [session] = useState(() => createSevenSegmentSession(access.video, setState, candidates => {
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
  const busy = ['permission', 'ready', 'reading', 'closing'].includes(state.phase);
  function start(source: SevenSegmentSource): number {
    if (session.start(source, device)) access.setAttempt(review.recapture());
    return access.attempt();
  }
  function cancel() { review.cancel(); void session.cancel(); }
  return { state, busy, device, setDevice: (next: SevenSegmentDevice) => { if (!busy) setDevice(next); },
    attachVideo: access.attach, start, capture: session.capture,
    review: { ...review, cancel, recapture: () => start('camera'), recaptureDisabled: busy,
      previewNotice: 'Leitor de sete segmentos EXPERIMENTAL (candidato não habilitado no app). Confirmação apenas em memória; sem gravação clínica.' } };
}
