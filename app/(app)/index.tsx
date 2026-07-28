import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, TextInput, useColorScheme } from 'react-native';

import { BpCategoryBadge } from '@/components/bp/BpCategoryBadge';
import { BpNumberInput } from '@/components/bp/BpNumberInput';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { classifyBloodPressure } from '@/domain/bp-classification';
import { useAddReading } from '@/features/readings/useAddReading';
import { colors } from '@/theme/colors';

const measuredAtFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export default function RecordScreen() {
  const { addReading, isSaving, error } = useAddReading();
  const scheme = useColorScheme() ?? 'light';
  const { autoFocus } = useLocalSearchParams<{ autoFocus?: string }>();

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [measuredAt, setMeasuredAt] = useState(() => new Date());
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const systolicRef = useRef<TextInput>(null);
  const diastolicRef = useRef<TextInput>(null);
  const pulseRef = useRef<TextInput>(null);

  // Toque no lembrete (local ou push) manda para cá com autoFocus=systolic — quem tocou quer
  // registrar, não navegar. O atraso dá tempo da transição de tela terminar antes do focus().
  useEffect(() => {
    if (autoFocus === 'systolic') {
      const timeout = setTimeout(() => systolicRef.current?.focus(), 300);
      return () => clearTimeout(timeout);
    }
  }, [autoFocus]);

  const systolicNumber = Number(systolic);
  const diastolicNumber = Number(diastolic);
  const hasPreview = systolic !== '' && diastolic !== '' && Number.isFinite(systolicNumber) && Number.isFinite(diastolicNumber);
  const previewCategory = hasPreview ? classifyBloodPressure(systolicNumber, diastolicNumber) : null;

  async function handleSave(): Promise<void> {
    const success = await addReading({ systolic, diastolic, pulse, note: '', measuredAt });

    if (success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSystolic('');
      setDiastolic('');
      setPulse('');
      setMeasuredAt(new Date());
    }
  }

  function handleDateChange(_event: unknown, selectedDate?: Date): void {
    setIsPickerOpen(Platform.OS === 'ios');

    if (selectedDate) {
      setMeasuredAt(selectedDate);
    }
  }

  return (
    <Screen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 24 }}>
      <Text variant="title" className="text-center">
        Registrar medição
      </Text>

      <BpNumberInput
        ref={systolicRef}
        label="Sistólica"
        value={systolic}
        onChangeText={setSystolic}
        maxLength={3}
        onDigitsComplete={() => diastolicRef.current?.focus()}
      />

      <BpNumberInput
        ref={diastolicRef}
        label="Diastólica"
        value={diastolic}
        onChangeText={setDiastolic}
        maxLength={3}
        onDigitsComplete={() => pulseRef.current?.focus()}
      />

      <BpNumberInput ref={pulseRef} label="Pulso (opcional)" value={pulse} onChangeText={setPulse} maxLength={3} />

      {previewCategory ? <BpCategoryBadge category={previewCategory} /> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Horário da medição: ${measuredAtFormatter.format(measuredAt)}. Toque para editar.`}
        onPress={() => setIsPickerOpen(true)}
        className="min-h-[48px] items-center justify-center"
      >
        <Text variant="caption">{measuredAtFormatter.format(measuredAt)}</Text>
      </Pressable>

      {isPickerOpen ? (
        <DateTimePicker value={measuredAt} mode="datetime" maximumDate={new Date()} onChange={handleDateChange} />
      ) : null}

      <Button label="Salvar" onPress={handleSave} loading={isSaving} />

      {error ? (
        <Text variant="caption" accessibilityRole="alert" color={colors[scheme].danger} className="text-center">
          {error}
        </Text>
      ) : null}
    </Screen>
  );
}
