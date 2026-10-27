import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { createAndroidVoiceSession, type VoiceState } from '@/services/recognition/android-voice-session';
import { loadAndroidVoiceBinding } from '@/services/recognition/voice-android';
import type { AndroidVoicePorts } from '@/services/recognition/voice-capture-contract';

import { useVoiceReview } from './useVoiceReview';

function access() {
  let binding: AndroidVoicePorts | null = null;
  let attempt = 0;
  return { get: () => binding ??= loadAndroidVoiceBinding(), optional: () => binding,
    attempt: () => attempt, setAttempt: (value: number) => { attempt = value; } };
}
/** Adaptador real em avaliação. Ausência de porta clínica é estrutural neste modo. */
export function useAndroidVoiceReview() {
  const review = useVoiceReview({ mode: 'preview' });
  const [state, setState] = useState<VoiceState>({ phase: 'idle', attemptId: 0, issue: null });
  const [handles] = useState(access);
  const [session] = useState(() => createAndroidVoiceSession({
    availability: () => handles.get().availability(), requestPermission: () => handles.get().requestPermission(),
    prepare: id => handles.get().prepare(id), start: id => handles.get().start(id), finish: id => handles.get().finish(id),
    close: id => handles.optional()?.close(id) ?? Promise.resolve(true), listen: listener => handles.get().listen(listener),
  }, setState, (_id, final) => { review.receiveFinal(handles.attempt(), final, 'recognition'); }));
  useEffect(() => {
    const listener = AppState.addEventListener('change', next => {
      if (next !== 'active') { review.cancel(); void session.cancel(); }
    });
    return () => { listener.remove(); session.dispose(); };
    // Instância fixa; revisão acessa estado corrente por refs síncronas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  function start(): number {
    if (session.start()) handles.setAttempt(review.newAttempt());
    return handles.attempt();
  }
  function cancel() { review.cancel(); void session.cancel(); }
  function leaveForManual(): Promise<boolean> {
    review.cancel();
    return session.cancel().then(() => session.isReleased());
  }
  const busy = ['checking','permission','preparing','opening','listening','recognizing','closing','blocked'].includes(state.phase);
  return { state, busy, start, finish: session.finish, leaveForManual,
    review: { ...review, cancel, recapture: start, recaptureDisabled: busy,
      previewNotice: 'Voz local em avaliação com dados sintéticos ditados. Privacidade do serviço exige verificação no aparelho. Confirmar mantém apenas em memória.' } };
}
