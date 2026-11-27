import { useCallback, useRef, useState } from 'react';

import { VoiceReadingReview } from '@/components/bp/VoiceReadingReview';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useAndroidVoiceReview } from '@/features/assisted-entry/useAndroidVoiceReview';
import { prepareAssistedReadingWriter } from '@/features/readings/assisted-reading-writer';
import type { AssistedWriteContext } from '@/features/readings/confirmed-assisted-reading';
import type { FirstMeasurement } from '@/features/readings/useSecondMeasurementFlow';
import type { VoicePhase } from '@/services/recognition/android-voice-session';
import { VOICE_MESSAGES } from '@/services/recognition/voice-capture-contract';

const CAPTURE_STATUS: Partial<Record<VoicePhase, string>> = {
  checking: 'Verificando voz local…',
  permission: 'Aguardando permissão de microfone…',
  preparing: 'Verificando o pacote local de português (Brasil)…',
  opening: 'Abrindo o microfone…',
  listening: 'Ouvindo. Diga uma única medição.',
  recognizing: 'Interpretando os valores…',
  closing: 'Liberando o microfone…',
};

export function AndroidVoiceRegistration({ getCurrentContext, onClose, onSaved }: {
  getCurrentContext: () => AssistedWriteContext;
  onClose: (capabilityLost: boolean) => void;
  onSaved: (reading: FirstMeasurement) => void;
}) {
  const [confirmation] = useState(() => prepareAssistedReadingWriter(getCurrentContext));
  const datePickerOpen = useRef(false);
  const setDatePickerOpen = useCallback((isOpen: boolean) => { datePickerOpen.current = isOpen; }, []);
  const { state, busy, start, finish, review } = useAndroidVoiceReview({
    mode: 'recognition',
    confirmation,
    onSaved,
    isDatePickerOpen: () => datePickerOpen.current,
    isCurrent: () => {
      const context = getCurrentContext();
      return context.uid !== null && context.hasConsent && context.persistenceEnabled;
    },
  });
  const capabilityLost = state.issue === 'unsupported' || state.issue === 'local-unavailable'
    || state.issue === 'language-unverified' || state.issue === 'model-missing';
  const issue = state.issue === 'cleanup-failed'
    ? 'Não foi possível liberar a voz. Use o registro manual ou reinicie o aplicativo para tentar novamente.'
    : state.issue === 'cancelled' ? 'Tentativa de voz interrompida. Tente novamente ou use o registro manual.'
    : state.issue ? VOICE_MESSAGES[state.issue] : null;

  function cancel() {
    review.cancel();
    onClose(capabilityLost);
  }

  if (review.state.draft || review.state.confirmed) {
    return <VoiceReadingReview review={{ ...review, cancel, cancelDisabled: review.state.phase === 'confirming' }}
      separateDateAndTime onDatePickerVisibilityChange={setDatePickerOpen} />;
  }

  return (
    <Card className="gap-4">
      <Text variant="sectionHeader" accessibilityRole="header">Registrar por voz</Text>
      <Text>Diga uma medição em português, por exemplo, “doze por oito”. Confira os campos e confirme para salvar.</Text>
      {CAPTURE_STATUS[state.phase] ? <Text accessibilityLiveRegion="polite">{CAPTURE_STATUS[state.phase]}</Text> : null}
      {issue ? <Text accessibilityRole="alert">{issue}</Text> : null}
      {review.inputIssue ? <Text accessibilityRole="alert">{review.inputIssue}</Text> : null}
      {state.phase === 'listening'
        ? <Button label="Terminar fala" onPress={finish} />
        : !capabilityLost && <Button label={state.phase === 'idle' ? 'Começar a falar' : 'Falar novamente'} disabled={busy} onPress={start} />}
      <Button label="Cancelar" variant="ghost" onPress={cancel} />
    </Card>
  );
}
