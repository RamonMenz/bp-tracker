import { useState } from 'react';
import { View } from 'react-native';

import { BpNumberInput } from '@/components/bp/BpNumberInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Field } from '@/components/ui/Field';
import { Text } from '@/components/ui/Text';
import type { CandidateField } from '@/domain/assisted-entry';
import type { CandidateReviewView } from '@/features/assisted-entry/useCandidateReview';
import { NOTE_MAX_LENGTH } from '@/features/readings/reading.schema';
import { formatShortDateTime } from '@/lib/datetime';

const REASONS: Record<Extract<CandidateField, { status: 'uncertain' }>['reason'], string> = {
  'ambiguous-label': 'associação ambígua ao campo',
  'mixed-scale': 'escala incerta',
  'multiple-pairs': 'mais de uma medição identificada',
  'unidentified-number': 'número sem associação segura',
  unreadable: 'leitura incompleta ou ilegível',
};
const LABELS = { systolic: 'Sistólica', diastolic: 'Diastólica', pulse: 'Pulso' };

export function CandidateReadingReview({ review }: { review: CandidateReviewView }) {
  const [pickerAttempt, setPickerAttempt] = useState<number | null>(null);
  const { state, errors } = review;
  const draft = state.draft;
  const isVoice = review.modality === 'voice';
  return (
    <Card className="gap-4">
      <Text variant="sectionHeader" accessibilityRole="header">{isVoice ? 'Revisar voz' : 'Revisar fotografia'}</Text>
      {review.isSimulation ? <Text accessibilityRole="alert">Simulação com candidatos sintéticos. Nenhuma medição será salva.</Text> : null}
      {review.isPreviewOnly ? <Text accessibilityRole="alert">{review.previewNotice ?? 'Captura real em avaliação. Confirmação apenas em memória; sem gravação clínica.'}</Text> : null}
      {state.confirmed ? (
        <View className="gap-3" accessibilityLiveRegion="polite">
          <Text>{review.isSimulation || review.isPreviewOnly ? 'Confirmação demonstrada somente em memória.' : 'Medição salva após confirmação explícita.'}</Text>
          <Text>{state.confirmed.systolic} por {state.confirmed.diastolic} mmHg</Text>
          <Text>Pulso: {state.confirmed.pulse ?? 'Não informado'}</Text>
          <Text>{formatShortDateTime(state.confirmed.measuredAt)}</Text>
          {state.confirmed.note ? <Text>{state.confirmed.note}</Text> : null}
        </View>
      ) : draft && state.candidates ? (
        <>
          <Text>{isVoice ? 'Confira os valores reconhecidos antes de confirmar. Os campos estão em mmHg e bpm.' : 'Confira os valores com o display do aparelho antes de confirmar.'}</Text>
          {(['systolic', 'diastolic', 'pulse'] as const).map(key => {
            const original = state.candidates!.fields[key];
            const corrected = draft[key] !== (original.status === 'candidate' ? String(original.value) : '');
            const hint = corrected ? 'Campo editado para revisão.'
              : original.status === 'uncertain' ? `Incerto: ${REASONS[original.reason]}. Preencha ou corrija.`
                : original.status === 'missing' ? (key === 'pulse' ? 'Não identificado. Pulso é opcional.' : 'Não identificado. Preencha para confirmar.')
                  : review.isSimulation ? 'Candidato sintético. Confira o valor.' : 'Candidato reconhecido. Confira o valor.';
            return (
              <View key={key} className="gap-2">
                <BpNumberInput label={LABELS[key]} unit={key === 'pulse' ? 'bpm' : 'mmHg'}
                  value={draft[key]} onChangeText={value => review.edit(key, value, state.attempt)} maxLength={3}
                  editable={state.phase !== 'confirming'} autoComplete="off"
                  errorMessage={errors[key]} />
                <Text accessibilityLiveRegion="polite">{LABELS[key]}: {hint}</Text>
              </View>
            );
          })}
          <Field label="Observação" value={draft.note} maxLength={NOTE_MAX_LENGTH}
            editable={state.phase !== 'confirming'} autoComplete="off" autoCorrect={false} spellCheck={false}
            onChangeText={value => review.edit('note', value, state.attempt)} errorMessage={errors.note} multiline />
          <Button variant="secondary" label={`Data e hora: ${formatShortDateTime(draft.measuredAt)}`}
            disabled={state.phase === 'confirming'}
            onPress={() => setPickerAttempt(value => value === state.attempt ? null : state.attempt)} />
          {pickerAttempt === state.attempt && state.phase !== 'confirming' ? <DateTimeField value={draft.measuredAt} mode="datetime" maximumDate={new Date()}
            accessibilityLabel="Data e hora da medição" onChange={value => review.edit('measuredAt', value, state.attempt)}
            onClose={() => setPickerAttempt(null)} /> : null}
          {errors.measuredAt ? <Text accessibilityRole="alert">{errors.measuredAt}</Text> : null}
          <Button label={review.isSimulation ? "Confirmar simulação" : review.isPreviewOnly ? "Confirmar revisão em memória" : "Confirmar e salvar medição"} disabled={!review.canConfirm}
            loading={state.phase === 'confirming'} onPress={() => { setPickerAttempt(null); void review.confirm(); }} />
        </>
      ) : (
        <Text accessibilityLiveRegion="polite">{state.phase === 'cancelled'
          ? 'Revisão cancelada. Candidatos descartados.'
          : isVoice ? (review.isSimulation ? 'Aguardando transcrição final. O microfone não será aberto nesta demonstração.' : 'Aguardando transcrição final.') : review.isPreviewOnly ? 'Aguardando captura. Nenhuma medição será salva.' : 'Aguardando candidatos sintéticos. A câmera não será aberta.'}</Text>
      )}
      {review.confirmationError ? <Text accessibilityRole="alert">{review.confirmationError}</Text> : null}
      <Button label={isVoice ? (review.isSimulation ? "Falar novamente (simulação)" : "Falar novamente") : review.isSimulation ? "Tirar outra fotografia (simulação)" : "Tirar outra fotografia"} variant="secondary" disabled={review.recaptureDisabled} onPress={() => {
        setPickerAttempt(null);
        review.recapture();
      }} />
      <Button label="Cancelar" variant="ghost" onPress={() => { setPickerAttempt(null); review.cancel(); }} />
    </Card>
  );
}
