import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, TextInput, useColorScheme, View } from 'react-native';

import { BpCategoryBadge } from '@/components/bp/BpCategoryBadge';
import { BpNumberInput } from '@/components/bp/BpNumberInput';
import { LastReadingCard } from '@/components/bp/LastReadingCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { ActivityIcon, CalendarDaysIcon, CheckIcon, TriangleAlertIcon } from '@/components/ui/icons';
import { useLastReading } from '@/features/readings/useLastReading';
import { useReadingForm } from '@/features/readings/useReadingForm';
import { formatShortDateTime } from '@/lib/datetime';
import { colors, resolveColorScheme } from '@/theme/colors';

// Onboarding simples: o aviso aparece uma vez (no primeiro uso deste aparelho) e some ao ser
// dispensado — nunca mais bloqueia o caminho de registrar em ≤10s (CLAUDE.md §1).
const DISCLAIMER_DISMISSED_KEY = 'bp-tracker:disclaimer-dismissed';

export default function RecordScreen() {
  const form = useReadingForm();
  const { lastReading, isLoading: isLastReadingLoading } = useLastReading();
  const scheme = resolveColorScheme(useColorScheme());
  const palette = colors[scheme];
  const { autoFocus } = useLocalSearchParams<{ autoFocus?: string }>();

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const systolicRef = useRef<TextInput>(null);
  const diastolicRef = useRef<TextInput>(null);
  const pulseRef = useRef<TextInput>(null);

  useEffect(() => {
    AsyncStorage.getItem(DISCLAIMER_DISMISSED_KEY)
      .then((value) => {
        if (value !== 'true') {
          setShowDisclaimer(true);
        }
      })
      .catch(() => {
        // Falha ao ler a preferência não deve travar o formulário — pior caso, o aviso reaparece.
      });
  }, []);

  function handleDismissDisclaimer(): void {
    setShowDisclaimer(false);
    AsyncStorage.setItem(DISCLAIMER_DISMISSED_KEY, 'true').catch(() => undefined);
  }

  // Toque no lembrete (local ou push) manda para cá com autoFocus=systolic — quem tocou quer
  // registrar, não navegar. O atraso dá tempo da transição de tela terminar antes do focus().
  useEffect(() => {
    if (autoFocus === 'systolic') {
      const timeout = setTimeout(() => systolicRef.current?.focus(), 300);
      return () => clearTimeout(timeout);
    }
  }, [autoFocus]);

  function handleDateChange(_event: unknown, selectedDate?: Date): void {
    setIsPickerOpen(Platform.OS === 'ios');

    if (selectedDate) {
      form.setMeasuredAt(selectedDate);
    }
  }

  return (
    <Screen>
      <Text variant="title">Registrar medição</Text>

      {showDisclaimer ? (
        <Card>
          <Disclaimer onDismiss={handleDismissDisclaimer} />
        </Card>
      ) : null}

      <Card className="gap-4">
        <SectionHeader title="Nova medição" icon={ActivityIcon} />

        {/* Sistólica e diastólica lado a lado: é assim que o par aparece no aparelho de pressão
            e no papel, e mantém os dois campos na mesma dobra, acima do teclado. */}
        <View className="flex-row items-start gap-3">
          <BpNumberInput
            ref={systolicRef}
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

        <View className="flex-row items-start gap-3">
          <BpNumberInput
            ref={pulseRef}
            label="Pulso (opcional)"
            unit="bpm"
            value={form.pulse}
            onChangeText={form.setPulse}
            maxLength={3}
            errorMessage={form.fieldErrors.pulse ?? undefined}
            returnKeyType="done"
          />
          {/* Coluna vazia deliberada: mantém o pulso na mesma largura da sistólica, preservando
              a grade de duas colunas em vez de esticar um campo de 3 dígitos pela tela toda. */}
          <View className="flex-1" />
        </View>

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
          <DateTimePicker
            value={form.measuredAt}
            mode="datetime"
            maximumDate={new Date()}
            onChange={handleDateChange}
          />
        ) : null}

        <Button
          label="Salvar medição"
          size="lg"
          icon={CheckIcon}
          onPress={() => void form.submit()}
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

      <LastReadingCard lastReading={lastReading} isLoading={isLastReadingLoading} />
    </Screen>
  );
}
