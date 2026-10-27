import { View } from 'react-native';

import { VoiceReadingReview } from '@/components/bp/VoiceReadingReview';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useWebVoiceReview } from '@/features/assisted-entry/useWebVoiceReview.web';
import type { VoicePhase } from '@/services/recognition/voice-session';
import { WEB_VOICE_MESSAGES } from '@/services/recognition/web-voice.web';

const PHASES: Record<VoicePhase, string> = {
  idle: 'Nenhuma captura iniciada. Suporte local ainda não verificado.', checking: 'Verificando API local do navegador…',
  permission: 'Preparando verificação local…', preparing: 'Verificando pacote pt-BR disponível no dispositivo…',
  opening: 'Iniciando voz local; o navegador pode solicitar permissão de microfone…', listening: 'Ouvindo localmente. Diga uma única medição sintética.',
  recognizing: 'Interpretando os valores. Aguardando encerramento do reconhecedor…', closing: 'Encerrando voz e aguardando liberação…',
  reviewing: 'Confira os candidatos antes de confirmar.', cancelled: 'Tentativa cancelada.', failed: 'Voz local indisponível nesta tentativa.',
  blocked: 'Liberação não confirmada. Use o registro manual.',
};
export function WebVoiceCaptureScreen({ onManual }: { onManual: (release: Promise<boolean>) => void }) {
  const { state, busy, start, finish, review, leaveForManual } = useWebVoiceReview();
  return <Screen><View className="mx-auto w-full max-w-xl gap-5">
    <Card className="gap-4">
      <Text variant="title" accessibilityRole="header">Voz Web · avaliação local</Text>
      <Text>Exige processLocally verificável e pt-BR disponível localmente. Sem suporte, a voz fica indisponível; não há reconhecimento remoto ou substituição por simulação.</Text>
      <Text>Use apenas frases sintéticas: “doze por oito” ou “cento e vinte por oitenta, pulso setenta e dois”. Confira os campos; este cliente não salva medições clínicas.</Text>
      <Button label="Verificar e começar fala local" disabled={busy} onPress={start} />
      <Button label="Terminar fala (não salva)" disabled={state.phase !== 'listening'} onPress={finish} />
      <Button label="Cancelar voz" variant="ghost" onPress={review.cancel} />
      <Button label="Ir para registro manual" variant="secondary" onPress={() => onManual(leaveForManual())} />
      <Text accessibilityLiveRegion="polite">{PHASES[state.phase]}</Text>
      {state.issue ? <Text accessibilityRole="alert">{WEB_VOICE_MESSAGES[state.issue]}</Text> : null}
    </Card>
    <VoiceReadingReview review={review} />
  </View></Screen>;
}
