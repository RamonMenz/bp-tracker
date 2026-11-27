import { useLayoutEffect, useState } from 'react';
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
import { formatShortDate, formatShortDateTime, formatTime } from '@/lib/datetime';

const REASONS: Record<Extract<CandidateField, { status: 'uncertain' }>['reason'], string> = {
  'ambiguous-label': 'associação ambígua ao campo',
  'mixed-scale': 'escala incerta',
  'multiple-pairs': 'mais de uma medição identificada',
  'unidentified-number': 'número sem associação segura',
  unreadable: 'leitura incompleta ou ilegível',
};
const LABELS = { systolic: 'Sistólica', diastolic: 'Diastólica', pulse: 'Pulso' };
const REVIEW_LABELS = { ...LABELS, note: 'Observação', measuredAt: 'Data e hora' };

export function CandidateReadingReview({ review, onDatePickerVisibilityChange, separateDateAndTime = false }: {
  review: CandidateReviewView;
  onDatePickerVisibilityChange?: (isOpen: boolean) => void;
  separateDateAndTime?: boolean;
}) {
  const [picker, setPicker] = useState<{ attempt: number; mode: 'date' | 'time' | 'datetime' } | null>(null);
  const { state, errors } = review;
  const draft = state.draft;
  const pickerMode = draft && picker?.attempt === state.attempt && state.phase !== 'confirming' ? picker.mode : null;
  const isDatePickerOpen = pickerMode !== null;
  useLayoutEffect(() => {
    if (!isDatePickerOpen || !onDatePickerVisibilityChange) return;
    onDatePickerVisibilityChange(true);
    return () => onDatePickerVisibilityChange(false);
  }, [isDatePickerOpen, onDatePickerVisibilityChange]);
  const isVoice = review.modality === 'voice';
  const issues = (['systolic', 'diastolic', 'pulse', 'note', 'measuredAt'] as const)
    .flatMap(key => errors[key] ? [`${REVIEW_LABELS[key]}: ${errors[key]}`] : []);
  const confirmationStatus = state.phase === 'confirming'
    ? 'Confirmação em andamento. Aguarde.'
    : review.canConfirm
      ? 'Confirmação disponível. Confira os valores antes de confirmar.'
      : `Confirmação indisponível. ${issues.join(' ') || 'Revise os campos antes de confirmar.'}`;
  function togglePicker(mode: 'date' | 'time' | 'datetime') {
    setPicker(current => current?.attempt === state.attempt && current.mode === mode ? null : { attempt: state.attempt, mode });
  }
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
          <Button variant="secondary"
            label={separateDateAndTime ? `Data: ${formatShortDate(draft.measuredAt)}` : `Data e hora: ${formatShortDateTime(draft.measuredAt)}`}
            disabled={state.phase === 'confirming'}
            onPress={() => togglePicker(separateDateAndTime ? 'date' : 'datetime')} />
          {separateDateAndTime ? <Button variant="secondary" label={`Hora: ${formatTime(draft.measuredAt)}`}
            disabled={state.phase === 'confirming'} onPress={() => togglePicker('time')} /> : null}
          {pickerMode ? <DateTimeField value={draft.measuredAt} mode={pickerMode}
            maximumDate={pickerMode === 'time' ? undefined : new Date()}
            accessibilityLabel={`${pickerMode === 'date' ? 'Data' : pickerMode === 'time' ? 'Hora' : 'Data e hora'} da medição`}
            onChange={value => review.edit('measuredAt', value, state.attempt)}
            onClose={() => setPicker(null)} /> : null}
          {errors.measuredAt ? <Text accessibilityRole="alert">{errors.measuredAt}</Text> : null}
          <Text accessible accessibilityLiveRegion="polite">{confirmationStatus}</Text>
          <Button label={review.isSimulation ? "Confirmar simulação" : review.isPreviewOnly ? "Confirmar revisão em memória" : "Confirmar e salvar medição"} disabled={!review.canConfirm}
            accessibilityHint={review.canConfirm ? 'Confirma os valores revisados.' : confirmationStatus}
            loading={state.phase === 'confirming'} onPress={() => { setPicker(null); void review.confirm(); }} />
        </>
      ) : (
        <Text accessibilityLiveRegion="polite">{state.phase === 'cancelled'
          ? 'Revisão cancelada. Candidatos descartados.'
          : isVoice ? (review.isSimulation ? 'Aguardando transcrição final. O microfone não será aberto nesta demonstração.' : 'Aguardando transcrição final.') : review.isPreviewOnly ? 'Aguardando captura. Nenhuma medição será salva.' : 'Aguardando candidatos sintéticos. A câmera não será aberta.'}</Text>
      )}
      {review.confirmationError ? <Text accessibilityRole="alert">{review.confirmationError}</Text> : null}
      <Button label={isVoice ? (review.isSimulation ? "Falar novamente (simulação)" : "Falar novamente") : review.isSimulation ? "Tirar outra fotografia (simulação)" : "Tirar outra fotografia"} variant="secondary" disabled={review.recaptureDisabled} onPress={() => {
        setPicker(null);
        review.recapture();
      }} />
      <Button label="Cancelar" variant="ghost" disabled={review.cancelDisabled} onPress={() => { setPicker(null); review.cancel(); }} />
    </Card>
  );
}
