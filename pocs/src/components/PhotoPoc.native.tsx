import { requireNativeViewManager } from 'expo-modules-core';
import { useRef, useState, type ComponentType, type Ref } from 'react';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';

import { PocError } from '@/domain/contracts';
import { interpretPhoto, parseOcr } from '@/domain/interpret-photo';
import { usePoc } from '@/features/usePoc';
import { nativeApi, nativeResponse } from '@/services/recognition/native-api';
import { Action } from '@/components/Action';
import { Panel } from '@/components/Panel';
import { Result } from '@/components/Result';
import { Status } from '@/components/Status';

interface CameraHandle { recognize(): Promise<unknown>; cancelCapture(): Promise<void> }
interface CameraProps extends ViewProps { active: boolean; attemptId: number; ref?: Ref<CameraHandle>; onStatus: (event: NativeSyntheticEvent<{ status: string; attemptId: number }>) => void }
const Camera = nativeApi ? requireNativeViewManager('AferiLocalRecognition') as ComponentType<CameraProps> : null;

export function PhotoPoc() {
  const flow = usePoc(); const camera = useRef<CameraHandle>(null);
  const capture = useRef<(() => void) | null>(null);
  const onReady = useRef<((status: string) => void) | null>(null);
  const expectedAttempt = useRef(0);
  const [attemptId, setAttemptId] = useState(0);
  const [active, setActive] = useState(false); const [ready, setReady] = useState(false);
  const begin = () => { void flow.run(async (attempt, stage) => {
    if (!nativeApi || !Camera) throw new PocError('unsupported');
    attempt.own(() => { capture.current = null; onReady.current = null; expectedAttempt.current = 0; setActive(false); setReady(false);
      void camera.current?.cancelCapture().catch(() => undefined); });
    stage('Aguardando permissão de câmera…');
    const granted = await attempt.wait(nativeApi.requestPermission('camera'), 30_000);
    if (!granted) throw new PocError('permission-denied');
    const opened = new Promise<void>((resolve, reject) => { onReady.current = status => {
      if (status === 'ready') resolve(); else reject(new PocError('camera-failed'));
    }; });
    expectedAttempt.current = attempt.id; setAttemptId(attempt.id);
    setActive(true); await attempt.wait(opened, 20_000);
    setReady(true); stage('Câmera pronta. Enquadre o display e toque em Capturar.');
    await attempt.wait(new Promise<void>(resolve => { capture.current = resolve; }), 60_000);
    attempt.check(); setReady(false); stage('ML Kit local: reconhecendo frame em memória…');
    if (!camera.current) throw new PocError('camera-failed');
    const result = nativeResponse(await attempt.wait(camera.current.recognize(), 30_000));
    const observation = parseOcr(result);
    return { candidates: interpretPhoto(observation),
      initializationMs: typeof result.initializationMs === 'number' ? result.initializationMs : undefined,
      recognitionMs: typeof result.recognitionMs === 'number' ? result.recognitionMs : 0 };
  }); };
  return <Panel>
    <Status text="Android: CameraX → frame em memória → ML Kit latino embarcado. Não cria fotografia em arquivo. Compatibilidade e recursos ainda exigem inspeção no aparelho." />
    {Camera ? <Camera ref={camera} active={active} attemptId={attemptId} onStatus={event => {
      if (event.nativeEvent.attemptId === expectedAttempt.current) onReady.current?.(event.nativeEvent.status);
    }} style={{ height: 320 }} />
      : <Status text="Módulo nativo ausente. É necessário compilar o Dev Client desta PoC; Expo Go não atende." />}
    <Action label="Iniciar câmera" disabled={flow.busy} onPress={begin} />
    <Action label="Capturar e reconhecer" disabled={!ready} onPress={() => capture.current?.()} />
    <Action label="Cancelar e descartar resultado" onPress={flow.cancel} />
    <Status text={flow.status} /><Result result={flow.result} />
  </Panel>;
}
