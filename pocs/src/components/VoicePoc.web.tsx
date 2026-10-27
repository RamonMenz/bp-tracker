import { useRef } from 'react';

import { usePoc } from '@/features/usePoc';
import { prepareVoiceModel, recognizeVoice } from '@/services/recognition/voice.web';
import { Action } from '@/components/Action';
import { Panel } from '@/components/Panel';
import { Result } from '@/components/Result';
import { Status } from '@/components/Status';

export function VoicePoc() {
  const flow = usePoc(); const finish = useRef<(() => void) | null>(null);
  return <Panel>
    <Status text="Voz local em pt-BR. Esta spike mostra transcrição final; não implementa o parser completo da TASK-14. Não há fallback remoto." />
    <Action label="Iniciar voz local" disabled={flow.busy} onPress={() => { void flow.run(async (attempt, stage) => {
      attempt.own(() => { finish.current = null; });
      return recognizeVoice(attempt, stop => { finish.current = stop; stage('Ouvindo localmente. Diga uma medição sintética.'); });
    }); }} />
    <Action label="Terminar fala (não salva)" disabled={!flow.busy} onPress={() => { try { finish.current?.(); } catch { flow.cancel(); } }} />
    <Action label="Cancelar e descartar resultado" onPress={flow.cancel} />
    <Action label="Preparar modelo pt-BR local (download estático)" disabled={flow.busy} onPress={() => { void flow.run(async (attempt, stage) => {
      stage('Preparando somente modelo local; sem capturar áudio. O navegador pode continuar o download mesmo após cancelar.');
      await prepareVoiceModel(attempt); return null;
    }); }} />
    <Status text={flow.status} /><Result result={flow.result} />
  </Panel>;
}
