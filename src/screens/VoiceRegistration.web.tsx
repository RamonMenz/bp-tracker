import { useState } from 'react';

import { VoiceReadingReview } from '@/components/bp/VoiceReadingReview';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useWebVoiceReview } from '@/features/assisted-entry/useWebVoiceReview.web';
import { prepareAssistedReadingWriter } from '@/features/readings/assisted-reading-writer';
import type { AssistedWriteContext } from '@/features/readings/confirmed-assisted-reading';
import type { FirstMeasurement } from '@/features/readings/useSecondMeasurementFlow';
import type { VoicePhase } from '@/services/recognition/voice-session';
import { WEB_VOICE_MESSAGES } from '@/services/recognition/web-voice.web';

const CAPTURE_STATUS: Partial<Record<VoicePhase, string>> = {
  checking: 'Verificando voz local…',
  preparing: 'Verificando o pacote local de português (Brasil)…',
  opening: 'Abrindo o microfone…',
  listening: 'Ouvindo. Diga uma única medição.',
  recognizing: 'Interpretando os valores…',
  closing: 'Liberando o microfone…',
};

export function VoiceRegistration({ getCurrentContext, onClose, onSaved }: {
  getCurrentContext: () => AssistedWriteContext;
  onClose: () => void;
  onSaved: (reading: FirstMeasurement) => void;
}) {
  const [confirmation] = useState(() => prepareAssistedReadingWriter(getCurrentContext));
  const { state, busy, start, finish, review } = useWebVoiceReview({
    mode: 'recognition',
    confirmation,
    onSaved,
    isCurrent: () => {
      const context = getCurrentContext();
      return context.uid !== null && context.hasConsent && context.persistenceEnabled;
    },
  });

  function cancel() {
    review.cancel();
    onClose();
  }

  if (review.state.draft || review.state.confirmed) {
    return <VoiceReadingReview review={{ ...review, cancel, cancelDisabled: review.state.phase === 'confirming' }} />;
  }

  return (
    <Card className="gap-4">
      <Text variant="sectionHeader" accessibilityRole="header">Registrar por voz</Text>
      <Text>Diga uma medição em português, por exemplo, “doze por oito”. Confira os campos e confirme para salvar.</Text>
      {CAPTURE_STATUS[state.phase] ? <Text accessibilityLiveRegion="polite">{CAPTURE_STATUS[state.phase]}</Text> : null}
      {state.issue ? <Text accessibilityRole="alert">{WEB_VOICE_MESSAGES[state.issue]}</Text> : null}
      {review.inputIssue ? <Text accessibilityRole="alert">{review.inputIssue}</Text> : null}
      {state.phase === 'listening'
        ? <Button label="Terminar fala" onPress={finish} />
        : <Button label={state.phase === 'idle' ? 'Começar a falar' : 'Falar novamente'} disabled={busy} onPress={start} />}
      <Button label="Cancelar" variant="ghost" onPress={cancel} />
    </Card>
  );
}
