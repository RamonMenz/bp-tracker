import { AppState } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { messages, safeCode, type PocResult } from '@/domain/contracts';
import { Attempt } from '@/features/attempt';

export function usePoc() {
  const current = useRef<Attempt | null>(null);
  const alive = useRef(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Pronto. Somente dados sintéticos; não há salvamento.');
  const [result, setResult] = useState<PocResult | null>(null);
  const cancel = () => {
    current.current?.cancel(); current.current = null;
    if (alive.current) { setBusy(false); setResult(null); setStatus(messages.cancelled); }
  };
  useEffect(() => {
    alive.current = true;
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') cancel(); });
    return () => { alive.current = false; current.current?.cancel(); current.current = null; subscription.remove(); };
  }, []);
  async function run(work: (attempt: Attempt, stage: (text: string) => void) => Promise<PocResult | null>) {
    if (current.current) return; // trava síncrona anterior ao primeiro await
    const attempt = new Attempt(); current.current = attempt;
    setBusy(true); setResult(null); setStatus('Inicializando…');
    const stage = (text: string) => { if (alive.current && current.current === attempt && !attempt.signal.aborted) setStatus(text); };
    try {
      const value = await work(attempt, stage);
      attempt.check();
      if (alive.current && current.current === attempt) { setResult(value); setStatus(value ? 'Resultado temporário. Confira e repita; nada foi salvo.' : 'Preparação encerrada. Inicie uma nova tentativa.'); }
    } catch (error) {
      if (alive.current && current.current === attempt) setStatus(messages[safeCode(error)]);
    } finally {
      // Cleanup também no sucesso. O resultado contém somente campos transitórios de UI.
      attempt.cancel();
      if (current.current === attempt) { current.current = null; if (alive.current) setBusy(false); }
    }
  }
  return { busy, status, result, run, cancel };
}
