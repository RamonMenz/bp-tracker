// DEMO EXPERIMENTAL — leitor de sete segmentos (candidato NÃO habilitado no app; aguarda decisão da
// orientadora: P02/P106/P048). Só dentro de demos/web-capture; nenhuma rota de app/ o importa.
import { useState } from 'react';
import { View } from 'react-native';

import { CandidateReadingReview } from '@/components/bp/CandidateReadingReview';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import type { SevenSegmentDevice } from '@/domain/seven-segment/decode-seven-segment';
import { PHOTO_MESSAGES } from '@/services/recognition/photo-capture-contract';

import { guideRect } from './guide';
import { useSevenSegmentReview } from './useSevenSegmentReview';

const PHASES = { idle: 'Câmera desligada.', permission: 'Aguardando permissão de câmera…',
  ready: 'Encaixe o visor na guia e toque em Capturar.', reading: 'Lendo os segmentos no navegador…',
  closing: 'Encerrando recursos…', reviewing: 'Confira os candidatos abaixo.', cancelled: 'Tentativa cancelada.',
  failed: 'Tentativa encerrada.' };
const DEVICES: { id: SevenSegmentDevice; label: string }[] = [
  { id: 'gtech', label: 'G-Tech BSPII' }, { id: 'generic', label: 'Aparelho genérico (o das fotos de teste)' },
];

export function SevenSegmentCaptureScreen() {
  const { state, busy, device, setDevice, attachVideo, start, capture, review } = useSevenSegmentReview();
  const [frame, setFrame] = useState({ width: 4, height: 3 });
  const guide = guideRect(frame.width, frame.height, device);
  const showVideo = state.source === 'camera' && ['permission', 'ready'].includes(state.phase);
  const percent = (value: number, total: number) => `${(100 * value) / total}%`;
  return <View className="mx-auto w-full max-w-xl gap-5">
    <Card className="mx-auto w-full max-w-xl gap-4">
      <Text variant="title" accessibilityRole="header">Leitor de sete segmentos (experimental)</Text>
      <Text accessibilityRole="alert">Candidato de laboratório, NÃO habilitado no Aferi. Não substitui o motor decidido.
        Leitura no próprio navegador, sem rede nem armazenamento; campos incertos ficam vazios; nada é salvo.</Text>
      <Text>Modelo do aparelho (cada modelo tem um gabarito próprio):</Text>
      <View className="gap-2" accessibilityRole="radiogroup" accessibilityLabel="Modelo do aparelho">
        {DEVICES.map(option => <Button key={option.id} label={option.label} disabled={busy}
          variant={device === option.id ? 'primary' : 'secondary'} accessibilityRole="radio"
          accessibilityState={{ checked: device === option.id, disabled: busy }} onPress={() => setDevice(option.id)} />)}
      </View>
      <Text>Encaixe as bordas do visor (só a área do LCD, sem a moldura) nas bordas da guia, de frente e sem reflexo.</Text>
      <div style={{ position: 'relative', width: '100%', aspectRatio: `${frame.width} / ${frame.height}`, display: showVideo ? 'block' : 'none',
        background: '#0F172A', borderRadius: 16, overflow: 'hidden' }}>
        <video ref={attachVideo} muted playsInline autoPlay aria-label="Prévia da câmera"
          onLoadedMetadata={event => setFrame({ width: event.currentTarget.videoWidth || 4, height: event.currentTarget.videoHeight || 3 })}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
        <div aria-hidden style={{ position: 'absolute', left: percent(guide.x, frame.width), top: percent(guide.y, frame.height),
          width: percent(guide.width, frame.width), height: percent(guide.height, frame.height),
          border: '3px solid #FACC15', boxShadow: '0 0 0 9999px rgba(15,23,42,0.45)' }} />
      </div>
      <Button label="Iniciar câmera (sete segmentos)" disabled={busy} onPress={() => start('camera')} />
      <Button label="Capturar e ler segmentos" disabled={state.phase !== 'ready'} onPress={capture} />
      <Button label="Testar com visor sintético (sem câmera)" variant="secondary" disabled={busy} onPress={() => start('synthetic')} />
      <Button label="Cancelar captura" variant="ghost" onPress={review.cancel} />
      <Text accessibilityLiveRegion="polite">{PHASES[state.phase]}</Text>
      {state.issue ? <Text accessibilityRole="alert">{PHOTO_MESSAGES[state.issue]}</Text> : null}
    </Card>
    <CandidateReadingReview review={review} />
  </View>;
}
