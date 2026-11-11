import { Text as NativeText, View } from 'react-native';

import { CandidateReadingReview } from '@/components/bp/CandidateReadingReview';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAndroidPhotoReview } from '@/features/assisted-entry/useAndroidPhotoReview';
import { PHOTO_MESSAGES } from '@/services/recognition/photo-capture-contract';

const PHASES = {
  idle: 'Câmera desligada.', permission: 'Aguardando permissão de câmera…', opening: 'Preparando câmera…',
  ready: 'Enquadre o display inteiro e toque em Capturar.', recognizing: 'Lendo o quadro em memória com ML Kit local…',
  closing: 'Liberando câmera e reconhecedor…', reviewing: 'Confira e corrija os campos abaixo.',
  cancelled: 'Captura cancelada.', failed: 'Tentativa encerrada.', blocked: 'Recursos ainda não liberados; saia do fluxo.',
};
export function AndroidPhotoCaptureScreen() {
  const { review, captureState, binding, attachCamera, start, capture, onStatus, busy,
    diagnostics, diagnosticVersion, diagnosticAppState, diagnosticNativeRevision } = useAndroidPhotoReview();
  const Camera = binding?.Camera;
  const active = ['opening', 'ready', 'recognizing'].includes(captureState.phase);
  return (
    <Screen>
      <Card className="gap-4">
        <Text variant="title" accessibilityRole="header">Fotografia Android · avaliação</Text>
        <Text>Captura real com CameraX e ML Kit embarcado. Privacidade de câmera, armazenamento e rede ainda exige inspeção no aparelho.</Text>
        <Text>Use um cartão sintético SYS 120 / DIA 80 / PUL 72. Nenhum valor será salvo no histórico.</Text>
        <Text>Display inteiro, estável e sem reflexos. Associação por rótulos e posições próximas; campos incertos ficam vazios. Leitura de sete segmentos ainda exige validação.</Text>
        {Camera && (active || captureState.phase === 'closing') ? <Camera ref={attachCamera} active={active} attemptId={captureState.attemptId}
          accessible={false} style={{ height: 300, width: '100%' }}
          onStatus={event => onStatus(event.nativeEvent.attemptId, event.nativeEvent.status)} /> : null}
        <Button label="Iniciar câmera Android" disabled={busy} onPress={start} />
        <Button label="Capturar e reconhecer" disabled={captureState.phase !== 'ready'} onPress={capture} />
        <Button label="Cancelar captura" variant="ghost" onPress={review.cancel} />
        <Text accessibilityLiveRegion="polite">{PHASES[captureState.phase]}</Text>
        {captureState.issue ? <Text accessibilityRole="alert">{PHOTO_MESSAGES[captureState.issue]}</Text> : null}
        <View style={{ padding: 12, borderWidth: 1, borderColor: '#94a3b8', backgroundColor: '#f8fafc' }}>
          <NativeText style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>
            Diagnostico da captura: {diagnosticVersion}
          </NativeText>
          <NativeText style={{ fontSize: 16, color: '#0f172a' }}>
            App: {diagnosticAppState} | Fase: {captureState.phase}
          </NativeText>
          <NativeText style={{ fontSize: 16, color: '#0f172a' }}>
            Nativo: {diagnosticNativeRevision}
          </NativeText>
          <NativeText selectable style={{ fontSize: 14, color: '#0f172a' }}>
            {diagnostics.length ? diagnostics.join('\n') : 'Aguardando eventos.'}
          </NativeText>
        </View>
      </Card>
      <CandidateReadingReview review={review} />
    </Screen>
  );
}
