import { useRef, useState } from 'react';

import { interpretPhoto } from '@/domain/interpret-photo';
import { usePoc } from '@/features/usePoc';
import { frameFromVideo, openCamera, recognizeCanvas, syntheticCard } from '@/services/recognition/photo.web';
import { Action } from '@/components/Action';
import { Panel } from '@/components/Panel';
import { Result } from '@/components/Result';
import { Status } from '@/components/Status';

export function PhotoPoc() {
  const flow = usePoc();
  const video = useRef<HTMLVideoElement>(null);
  const capture = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const camera = () => { void flow.run(async (attempt, stage) => {
    if (!video.current) return null;
    attempt.own(() => { capture.current = null; setReady(false); });
    await openCamera(video.current, attempt);
    stage('Câmera aberta. Enquadre e toque em Capturar.'); setReady(true);
    await attempt.wait(new Promise<void>(resolve => { capture.current = resolve; }), 60_000);
    capture.current = null; setReady(false); attempt.check();
    const canvas = frameFromVideo(video.current);
    attempt.own(() => { canvas.width = 0; canvas.height = 0; });
    // Não precisamos manter a câmera durante OCR.
    const stream = video.current.srcObject as MediaStream | null;
    stream?.getTracks().forEach(track => track.stop()); video.current.srcObject = null;
    stage('Reconhecendo localmente no worker…');
    const output = await recognizeCanvas(canvas, attempt);
    return { candidates: interpretPhoto(output.observation), initializationMs: output.initializationMs, recognitionMs: output.recognitionMs };
  }); };
  const synthetic = () => { void flow.run(async (attempt, stage) => {
    stage('OCR real sobre cartão sintético em RAM — não é teste de câmera.');
    const canvas = syntheticCard(); attempt.own(() => { canvas.width = 0; canvas.height = 0; });
    const output = await recognizeCanvas(canvas, attempt);
    return { candidates: interpretPhoto(output.observation), initializationMs: output.initializationMs, recognitionMs: output.recognitionMs };
  }); };
  return <Panel>
    <Status text="Fotografia Web: Tesseract.js/LSTM local. Parser mínimo: SYS/DIA/PUL na mesma linha; campos ausentes ficam vazios." />
    <video ref={video} muted playsInline aria-label="Prévia da câmera" style={{ width: '100%', maxHeight: 320, background: '#0f172a' }} />
    <Action label="Iniciar câmera" onPress={camera} disabled={flow.busy} />
    <Action label="Capturar e reconhecer" onPress={() => capture.current?.()} disabled={!ready} />
    <Action label="Testar OCR com cartão sintético (sem câmera)" onPress={synthetic} disabled={flow.busy} />
    <Action label="Cancelar e descartar resultado" onPress={flow.cancel} />
    <Status text={flow.status} /><Result result={flow.result} />
  </Panel>;
}
