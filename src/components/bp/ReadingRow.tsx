import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';

import { Text } from '@/components/ui/Text';
import { classifyBloodPressure, type BpCategory } from '@/domain/bp-classification';
import type { Reading } from '@/types/models';

import { BpCategoryBadge } from './BpCategoryBadge';

export interface ReadingRowProps {
  id: string;
  reading: Reading;
  hasPendingWrites: boolean;
  onRequestDelete: (id: string) => void;
}

const CATEGORY_SPOKEN_LABEL: Record<BpCategory, string> = {
  normal: 'normal',
  elevated: 'elevada',
  stage1: 'estágio 1',
  stage2: 'estágio 2',
  crisis: 'crise',
};

const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function ReadingRow({ id, reading, hasPendingWrites, onRequestDelete }: ReadingRowProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const category = classifyBloodPressure(reading.systolic, reading.diastolic);

  // "por", não "/" — leitor de tela deve anunciar "120 por 80", não "120 barra 80" (CLAUDE.md §4.7).
  const pulsePhrase = reading.pulse !== null ? `, pulso ${reading.pulse}` : '';
  const pendingPhrase = hasPendingWrites ? ', pendente de sincronização' : '';
  const accessibilityLabel = `${reading.systolic} por ${reading.diastolic}${pulsePhrase}, ${CATEGORY_SPOKEN_LABEL[category]}, medido às ${timeFormatter.format(reading.measuredAt)}${pendingPhrase}`;

  function handleDeletePress(): void {
    swipeableRef.current?.close();
    onRequestDelete(id);
  }

  function renderRightActions() {
    return (
      <RectButton
        onPress={handleDeletePress}
        style={styles.deleteAction}
        accessibilityRole="button"
        accessibilityLabel="Excluir medição"
      >
        <Text variant="body" color="#FFFFFF" style={{ fontWeight: '600' }}>
          Excluir
        </Text>
      </RectButton>
    );
  }

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false}>
      <View
        accessible
        accessibilityLabel={accessibilityLabel}
        className="flex-row items-center justify-between border-b border-light-border bg-light-surface px-4 py-3 dark:border-dark-border dark:bg-dark-surface"
      >
        <View>
          <Text variant="body" style={{ fontWeight: '600' }}>
            {reading.systolic} / {reading.diastolic}
            {reading.pulse !== null ? `  ·  ${reading.pulse} bpm` : ''}
          </Text>
          <Text variant="caption">{timeFormatter.format(reading.measuredAt)}</Text>
        </View>

        <View className="items-end gap-1">
          <BpCategoryBadge category={category} />
          {hasPendingWrites ? <Text variant="caption">Pendente de sincronização</Text> : null}
        </View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteAction: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B3261E',
  },
});
