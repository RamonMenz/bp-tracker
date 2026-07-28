import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Alert, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReadingRow } from '@/components/bp/ReadingRow';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useDeleteReading } from '@/features/readings/useDeleteReading';
import type { ReadingListItem } from '@/features/readings/useReadings';
import { useReadings } from '@/features/readings/useReadings';
import { colors } from '@/theme/colors';

interface HeaderItem {
  type: 'header';
  key: string;
  label: string;
  averageSystolic: number;
  averageDiastolic: number;
}

interface RowItem {
  type: 'reading';
  key: string;
  reading: ReadingListItem;
}

type ListItem = HeaderItem | RowItem;

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

const dayLabelFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' });

function dayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(date) === dayKey(today)) {
    return 'Hoje';
  }

  if (dayKey(date) === dayKey(yesterday)) {
    return 'Ontem';
  }

  return dayLabelFormatter.format(date);
}

function average(values: number[]): number {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Assume readings já ordenado por measuredAt desc (vem assim de useReadings). */
function buildListItems(readings: ReadingListItem[]): { items: ListItem[]; stickyHeaderIndices: number[] } {
  const items: ListItem[] = [];
  const stickyHeaderIndices: number[] = [];

  let index = 0;

  while (index < readings.length) {
    const key = dayKey(readings[index].measuredAt);
    const group: ReadingListItem[] = [];

    while (index < readings.length && dayKey(readings[index].measuredAt) === key) {
      group.push(readings[index]);
      index += 1;
    }

    stickyHeaderIndices.push(items.length);
    items.push({
      type: 'header',
      key: `header-${key}`,
      label: dayLabel(group[0].measuredAt),
      averageSystolic: average(group.map((reading) => reading.systolic)),
      averageDiastolic: average(group.map((reading) => reading.diastolic)),
    });

    for (const reading of group) {
      items.push({ type: 'reading', key: reading.id, reading });
    }
  }

  return { items, stickyHeaderIndices };
}

export default function HistoryScreen() {
  const { readings, isLoading, error } = useReadings();
  const { deleteReading, error: deleteError } = useDeleteReading();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';

  const { items, stickyHeaderIndices } = useMemo(() => buildListItems(readings), [readings]);

  function handleRequestDelete(readingId: string): void {
    Alert.alert('Excluir medição?', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          void deleteReading(readingId);
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <Screen contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator accessibilityLabel="Carregando histórico" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text variant="body" accessibilityRole="alert" color={colors[scheme].danger} className="text-center">
          {error}
        </Text>
      </Screen>
    );
  }

  if (readings.length === 0) {
    return (
      <Screen contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text variant="sectionHeader" className="text-center">
          Nenhuma medição ainda
        </Text>
        <Text variant="body" className="text-center">
          Registre sua primeira pressão para começar seu histórico.
        </Text>
        <Button label="Registrar agora" onPress={() => router.push('/(app)')} />
      </Screen>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-light-bg dark:bg-dark-bg">
      {deleteError ? (
        <Text
          variant="caption"
          accessibilityRole="alert"
          color={colors[scheme].danger}
          className="px-4 py-2 text-center"
        >
          {deleteError}
        </Text>
      ) : null}

      <FlashList
        data={items}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        stickyHeaderIndices={stickyHeaderIndices}
        estimatedItemSize={72}
        renderItem={({ item }) =>
          item.type === 'header' ? (
            <View className="bg-light-bg px-4 py-2 dark:bg-dark-bg">
              <Text variant="sectionHeader">{item.label}</Text>
              <Text variant="caption">
                Média do dia: {item.averageSystolic} / {item.averageDiastolic}
              </Text>
            </View>
          ) : (
            <ReadingRow
              id={item.reading.id}
              reading={item.reading}
              hasPendingWrites={item.reading.hasPendingWrites}
              onRequestDelete={handleRequestDelete}
            />
          )
        }
      />
    </SafeAreaView>
  );
}
