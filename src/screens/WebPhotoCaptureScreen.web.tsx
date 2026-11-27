import { View } from 'react-native';

import { CandidateReadingReview } from '@/components/bp/CandidateReadingReview';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useWebPhotoReview } from '@/features/assisted-entry/useWebPhotoReview.web';
import { WEB_PHOTO_MESSAGES } from '@/services/recognition/web-photo-session.web';

const PHASES = { idle: 'Câmera e worker desligados.', permission: 'Aguardando permissão de câmera…', opening: 'Preparando vídeo…',
  ready: 'Enquadre o display inteiro e toque em Capturar.', recognizing: 'Lendo com Tesseract/LSTM em worker local…',
  closing: 'Encerrando recursos…', reviewing: 'Confira os candidatos abaixo.', cancelled: 'Tentativa cancelada.',
  failed: 'Tentativa encerrada.', blocked: 'Liberação pendente. Saia deste fluxo antes de tentar novamente.' };

export function WebPhotoCaptureScreen() {
  const { state, busy, attachVideo, start, capture, review } = useWebPhotoReview();
  return <Screen>
    <View className="mx-auto w-full max-w-xl gap-5">
    <Card className="mx-auto w-full max-w-xl gap-4">
      <Text variant="title" accessibilityRole="header">Fotografia Web · avaliação</Text>
      <Text>Reconhecimento no navegador, sem upload ou salvamento clínico. Câmera depende de HTTPS/localhost e suporte do navegador.</Text>
      <Text>Use dados controlados: SYS 120 / DIA 80 / PUL 72. Associação por rótulos e posições próximas; campos incertos ficam vazios. Não comprova leitura de sete segmentos.</Text>
      <video ref={attachVideo} muted playsInline autoPlay aria-label="Prévia da câmera"
        style={{ width: '100%', height: state.source === 'camera' && ['permission','opening','ready'].includes(state.phase) ? 280 : 0,
          objectFit: 'contain', borderRadius: 16, background: '#0F172A' }} />
      <Button label="Iniciar câmera Web" disabled={busy} onPress={() => start('camera')} />
      <Button label="Capturar e reconhecer" disabled={state.phase !== 'ready'} onPress={capture} />
      <Button label="Testar OCR real com cartão sintético (sem câmera)" variant="secondary" disabled={busy} onPress={() => start('synthetic-card')} />
      <Button label="Cancelar captura" variant="ghost" onPress={review.cancel} />
      <Text accessibilityLiveRegion="polite">{PHASES[state.phase]}</Text>
      {state.issue ? <Text accessibilityRole="alert">{WEB_PHOTO_MESSAGES[state.issue]}</Text> : null}
    </Card>
    <CandidateReadingReview review={review} />
    </View>
  </Screen>;
}
