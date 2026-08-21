import { useRef, useState, type RefObject } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { BpCategoryBadge } from '@/components/bp/BpCategoryBadge';
import { BpNumberInput } from '@/components/bp/BpNumberInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Field } from '@/components/ui/Field';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import {
  ActivityIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronDownIcon,
  TriangleAlertIcon,
} from '@/components/ui/icons';
import { NOTE_MAX_LENGTH } from '@/features/readings/reading.schema';
import type { UseReadingFormResult } from '@/features/readings/useReadingForm';
import { formatShortDateTime } from '@/lib/datetime';
import { colors } from '@/theme/colors';
import { useColorScheme } from '@/theme/useColorScheme';

export interface ReadingFormProps {
  /**
   * Estado do formulário vindo de `useReadingForm` — em modo criação ou edição, tanto faz: os
   * campos, a validação por campo e o `submit()` são os mesmos, só muda para onde o hook escreve.
   * Import de TIPO apenas: o componente segue burro, sem chamar hook de feature nenhum.
   */
  form: UseReadingFormResult;
  /** Cabeçalho do cartão — "Nova medição" no registro, "Medição" na edição. */
  title: string;
  submitLabel: string;
  onSubmit: () => void;
  /**
   * Ref da sistólica, para quem precisa focar o campo de fora (o deep link do lembrete abre a home
   * já com o cursor nele). Sem a prop, o componente usa a própria ref e nada muda.
   */
  systolicRef?: RefObject<TextInput | null>;
}

/**
 * Composição visual do formulário de medição, compartilhada pela home (registrar) e pela rota de
 * edição — as duas telas desenham exatamente os mesmos campos, na mesma ordem, com as mesmas
 * regras de foco. Só o título, o rótulo do botão e o que acontece depois de salvar mudam.
 */
export function ReadingForm({ form, title, submitLabel, onSubmit, systolicRef }: ReadingFormProps) {
  const scheme = useColorScheme();
  const palette = colors[scheme];

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  // Fechados por padrão para o formulário de registro caber numa dobra só — mas, na edição de uma
  // medição que já tem pulso e/ou observação, nascem abertos: esconder dado já preenchido seria
  // pior do que a dobra extra. Semente de useState (calculada uma vez), não estado derivado: o
  // usuário pode fechar de novo sem o valor recalculado forçar a reabrir a cada tecla.
  const [areOptionalFieldsOpen, setAreOptionalFieldsOpen] = useState(() => form.pulse !== '' || form.note !== '');

  const fallbackSystolicRef = useRef<TextInput>(null);
  const resolvedSystolicRef = systolicRef ?? fallbackSystolicRef;
  const diastolicRef = useRef<TextInput>(null);
  const pulseRef = useRef<TextInput>(null);

  return (
    <Card className="gap-4">
      <SectionHeader title={title} icon={ActivityIcon} />

      {/* Sistólica e diastólica lado a lado: é assim que o par aparece no aparelho de pressão
          e no papel, e mantém os dois campos na mesma dobra, acima do teclado. */}
      <View className="flex-row items-start gap-3">
        <BpNumberInput
          ref={resolvedSystolicRef}
          label="Sistólica"
          unit="mmHg"
          value={form.systolic}
          onChangeText={form.setSystolic}
          maxLength={3}
          errorMessage={form.fieldErrors.systolic ?? undefined}
          onDigitsComplete={() => diastolicRef.current?.focus()}
        />
        <BpNumberInput
          ref={diastolicRef}
          label="Diastólica"
          unit="mmHg"
          value={form.diastolic}
          onChangeText={form.setDiastolic}
          maxLength={3}
          errorMessage={form.fieldErrors.diastolic ?? undefined}
          onDigitsComplete={() => pulseRef.current?.focus()}
        />
      </View>

      {/* Cabeçalho de disclosure sempre visível — abrir mostra os campos, tocar de novo no mesmo
          controle esconde. Ao contrário do Pressable anterior (que sumia assim que aberto e não
          deixava mais como fechar), este não desaparece em nenhum dos dois estados. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pulso e observação"
        accessibilityState={{ expanded: areOptionalFieldsOpen }}
        onPress={() => setAreOptionalFieldsOpen((open) => !open)}
        className="min-h-[48px] flex-row items-center justify-between gap-2 rounded-2xl border border-light-border px-4 dark:border-dark-border"
      >
        <Text variant="body">Pulso e observação</Text>
        <ChevronDownIcon
          size={18}
          color={palette.muted}
          strokeWidth={2.25}
          style={{ transform: [{ rotate: areOptionalFieldsOpen ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {areOptionalFieldsOpen ? (
        <View className="flex-row items-start gap-3">
          <BpNumberInput
            ref={pulseRef}
            label="Pulso"
            unit="bpm"
            value={form.pulse}
            onChangeText={form.setPulse}
            maxLength={3}
            errorMessage={form.fieldErrors.pulse ?? undefined}
            returnKeyType="done"
          />
          {/* Observação ao lado do pulso: ocupa a coluna que antes ficava vazia, na mesma largura
              dos campos numéricos, em vez de um bloco à parte esticado pela largura toda. */}
          <View className="flex-1 gap-1">
            <Field
              label="Observação"
              value={form.note}
              onChangeText={form.setNote}
              maxLength={NOTE_MAX_LENGTH}
              errorMessage={form.fieldErrors.note ?? undefined}
              multiline
              numberOfLines={3}
              className="min-h-[88px] py-3"
              textAlignVertical="top"
            />
            <Text variant="caption" className="text-right">
              {form.note.length}/{NOTE_MAX_LENGTH}
            </Text>
          </View>
        </View>
      ) : null}

      {form.previewCategory ? (
        <View className="flex-row items-center justify-between gap-3 rounded-2xl bg-light-bg px-3 py-2.5 dark:bg-dark-bg">
          <Text variant="caption" className="flex-1">
            Classificação de referência
          </Text>
          <BpCategoryBadge category={form.previewCategory} size="sm" />
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Horário da medição: ${formatShortDateTime(form.measuredAt)}. Toque para editar.`}
        onPress={() => setIsPickerOpen(true)}
        className="min-h-[48px] flex-row items-center justify-center gap-2 rounded-2xl border border-light-border px-4 dark:border-dark-border"
      >
        <CalendarDaysIcon size={16} color={palette.muted} strokeWidth={2} />
        <Text variant="body">{formatShortDateTime(form.measuredAt)}</Text>
      </Pressable>

      {isPickerOpen ? (
        <DateTimeField
          value={form.measuredAt}
          mode="datetime"
          maximumDate={new Date()}
          accessibilityLabel="Horário da medição"
          onChange={form.setMeasuredAt}
          onClose={() => setIsPickerOpen(false)}
        />
      ) : null}

      <Button
        label={submitLabel}
        size="lg"
        icon={CheckIcon}
        onPress={onSubmit}
        loading={form.isSaving}
        disabled={!form.canSubmit}
      />

      {form.submitError ? (
        <View className="flex-row items-center gap-2">
          <TriangleAlertIcon size={16} color={palette.danger} strokeWidth={2.25} />
          <Text variant="caption" accessibilityRole="alert" color={palette.danger} className="flex-1">
            {form.submitError}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
