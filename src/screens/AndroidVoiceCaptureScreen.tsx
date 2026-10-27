import { VoiceReadingReview } from '@/components/bp/VoiceReadingReview';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAndroidVoiceReview } from '@/features/assisted-entry/useAndroidVoiceReview';
import type { VoicePhase } from '@/services/recognition/android-voice-session';
import { VOICE_MESSAGES } from '@/services/recognition/voice-capture-contract';

const PHASES: Record<VoicePhase, string> = {
  idle: 'Microfone desligado.', checking: 'Verificando API explicitamente local…', permission: 'Aguardando permissão de microfone…',
  preparing: 'Verificando pt-BR instalado no reconhecedor local…', opening: 'Preparando fala local…', listening: 'Ouvindo. Diga uma única medição sintética.',
  recognizing: 'Interpretando os valores. Terminar fala não salva.', closing: 'Liberando reconhecedor e microfone…',
  reviewing: 'Confira os candidatos antes de confirmar.', cancelled: 'Tentativa cancelada.', failed: 'Voz indisponível nesta tentativa.',
  blocked: 'Liberação não confirmada. Use o registro manual.',
};
export function AndroidVoiceCaptureScreen({ onManual }: { onManual: (release: Promise<boolean>) => void }) {
  const { state, busy, start, finish, review, leaveForManual } = useAndroidVoiceReview();
  return <Screen>
    <Card className="gap-4">
      <Text variant="title" accessibilityRole="header">Voz Android · avaliação</Text>
      <Text>Somente SpeechRecognizer explicitamente local com pt-BR instalado e verificável. Sem suporte, use o manual. Não há reconhecimento remoto alternativo.</Text>
      <Text>Use apenas frases sintéticas: “doze por oito” ou “cento e vinte por oitenta, pulso setenta e dois”. Este cliente não grava medições clínicas.</Text>
      <Button label="Começar a falar (avaliação local)" disabled={busy} onPress={start} />
      <Button label="Terminar fala (não salva)" disabled={state.phase !== 'listening'} onPress={finish} />
      <Button label="Cancelar voz" variant="ghost" onPress={review.cancel} />
      <Button label="Ir para registro manual" variant="secondary" onPress={() => onManual(leaveForManual())} />
      <Text accessibilityLiveRegion="polite">{PHASES[state.phase]}</Text>
      {state.issue ? <Text accessibilityRole="alert">{VOICE_MESSAGES[state.issue]}</Text> : null}
    </Card>
    <VoiceReadingReview review={review} />
  </Screen>;
}
