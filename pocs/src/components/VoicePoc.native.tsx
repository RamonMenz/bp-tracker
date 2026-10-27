import { useRef } from 'react';

import { PocError, type FinalTranscript } from '@/domain/contracts';
import { usePoc } from '@/features/usePoc';
import { nativeApi, nativeResponse } from '@/services/recognition/native-api';
import { Action } from '@/components/Action';
import { Panel } from '@/components/Panel';
import { Result } from '@/components/Result';
import { Status } from '@/components/Status';

export function VoicePoc() {
  const flow = usePoc(); const finish = useRef<(() => void) | null>(null);
  return <Panel>
    <Status text="Android: SpeechRecognizer on-device, pt-BR instalado e verificável. API 31/32 fica indisponível nesta spike porque não oferece a consulta de idioma da API 33. Sem gravador ou fallback remoto." />
    <Action label="Iniciar voz local" disabled={flow.busy} onPress={() => { void flow.run(async (attempt, stage) => {
      if (!nativeApi) throw new PocError('unsupported');
      const api = nativeApi;
      attempt.own(() => { finish.current = null; void api.cancelVoice().catch(() => undefined); });
      const started = performance.now();
      stage('Verificando reconhecedor local e pt-BR instalado…');
      nativeResponse(await attempt.wait(api.probeVoice(), 12_000));
      const granted = await attempt.wait(api.requestPermission('audio'), 30_000);
      if (!granted) throw new PocError('permission-denied');
      const initializationMs = performance.now() - started;
      finish.current = () => { void api.finishVoice().catch(() => flow.cancel()); };
      stage('Ouvindo localmente. Diga uma medição sintética.');
      const value = nativeResponse(await attempt.wait(api.startVoice(), 35_000));
      if (typeof value.text !== 'string' || !value.text || value.text.length > 4096) throw new PocError('no-result');
      if (typeof value.capturedAtMs !== 'number' || !Number.isFinite(value.capturedAtMs) || value.capturedAtMs < 0) throw new PocError('engine-failed');
      const finalTranscript: FinalTranscript = { kind: 'transcript', locale: 'pt-BR', final: true, capturedAtMs: value.capturedAtMs, text: value.text };
      return { finalTranscript, initializationMs, recognitionMs: typeof value.recognitionMs === 'number' ? value.recognitionMs : 0 };
    }); }} />
    <Action label="Terminar fala (não salva)" disabled={!flow.busy} onPress={() => finish.current?.()} />
    <Action label="Cancelar e descartar resultado" onPress={flow.cancel} />
    <Status text={flow.status} /><Result result={flow.result} />
  </Panel>;
}
