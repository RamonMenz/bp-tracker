import { ReadingForm } from '@/components/bp/ReadingForm';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useManualReadingEvaluation } from '@/features/assisted-entry/useManualReadingEvaluation';
import { VOICE_MESSAGES } from '@/services/recognition/voice-capture-contract';

export function ManualReadingEvaluationScreen({ onVoice, voiceRelease = 'released', cleanupNotice = VOICE_MESSAGES['cleanup-failed'] }:
  { onVoice: () => void; voiceRelease?: 'pending' | 'released' | 'failed'; cleanupNotice?: string }) {
  const { form, confirmed } = useManualReadingEvaluation();
  return <Screen>
    <Text variant="title" accessibilityRole="header">Manual · avaliação sem persistência</Text>
    <Text>Digite apenas dados sintéticos. Este é o formulário visual existente, sem Firebase ou salvamento clínico neste cliente.</Text>
    {voiceRelease === 'pending' ? <Text accessibilityLiveRegion="polite">Encerramento da voz em andamento.</Text> : null}
    {voiceRelease === 'failed' ? <Text accessibilityRole="alert">{cleanupNotice}</Text> : null}
    <ReadingForm form={form} title="Medição manual sintética" submitLabel="Confirmar manual em memória" onSubmit={() => { void form.submit(); }} />
    {confirmed ? <Text accessibilityLiveRegion="polite">Confirmação manual demonstrada somente em memória.</Text> : null}
    <Button label="Voltar à avaliação de voz" variant="secondary" disabled={voiceRelease !== 'released'} onPress={onVoice} />
  </Screen>;
}
