import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReadingRow, type ReadingRowPosition } from '@/components/bp/ReadingRow';
import { TrendChart } from '@/components/bp/TrendChart';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { ClipboardListIcon, DownloadIcon, HeartPulseIcon, TriangleAlertIcon } from '@/components/ui/icons';
import { useExportCsv } from '@/features/export/useExportCsv';
import { useDeleteReading } from '@/features/readings/useDeleteReading';
import type { ReadingListItem } from '@/features/readings/useReadings';
import { useReadings } from '@/features/readings/useReadings';
import { useReadingsTrend } from '@/features/readings/useReadingsTrend';
import { dayKey, dayLabel } from '@/lib/datetime';
import { colors, resolveColorScheme } from '@/theme/colors';

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
  position: ReadingRowPosition;
}

type ListItem = HeaderItem | RowItem;

function average(values: number[]): number {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function positionInGroup(index: number, groupSize: number): ReadingRowPosition {
  if (groupSize === 1) {
    return 'only';
  }

  if (index === 0) {
    return 'first';
  }

  return index === groupSize - 1 ? 'last' : 'middle';
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

    group.forEach((reading, indexInGroup) => {
      items.push({
        type: 'reading',
        key: reading.id,
        reading,
        position: positionInGroup(indexInGroup, group.length),
      });
    });
  }

  return { items, stickyHeaderIndices };
}

export default function HistoryScreen() {
  const { readings, isLoading, error } = useReadings();
  const { trend7d, trend30d, isLoading: isTrendLoading } = useReadingsTrend();
  const { deleteReading, error: deleteError } = useDeleteReading();
  const { exportCsv, isExporting, error: exportError } = useExportCsv();
  const router = useRouter();
  const scheme = resolveColorScheme(useColorScheme());
  const palette = colors[scheme];

  const { items, stickyHeaderIndices } = useMemo(() => buildListItems(readings), [readings]);

  /** id da medição aguardando confirmação — null enquanto não há diálogo aberto. */
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function handleRequestDelete(readingId: string): void {
    setPendingDeleteId(readingId);
  }

  function handleConfirmDelete(): void {
    if (pendingDeleteId === null) {
      return;
    }

    void deleteReading(pendingDeleteId);
    setPendingDeleteId(null);
  }

  if (isLoading) {
    return (
      <Screen contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator accessibilityLabel="Carregando histórico" color={palette.primary} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen contentContainerStyle={{ justifyContent: 'center' }}>
        <Card className="items-center gap-3">
          <TriangleAlertIcon size={28} color={palette.danger} strokeWidth={2} />
          <Text variant="body" accessibilityRole="alert" color={palette.danger} className="text-center">
            {error}
          </Text>
        </Card>
      </Screen>
    );
  }

  if (readings.length === 0) {
    return (
      <Screen contentContainerStyle={{ justifyContent: 'center' }}>
        <Card className="items-center gap-3 py-8">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-light-primaryTint dark:bg-dark-primaryTint">
            <ClipboardListIcon size={26} color={palette.primary} strokeWidth={2} />
          </View>
          <Text variant="sectionHeader" className="text-center">
            Nenhuma medição ainda
          </Text>
          <Text variant="body" className="text-center">
            Registre sua primeira pressão para começar seu histórico.
          </Text>
          <Button
            label="Registrar agora"
            icon={HeartPulseIcon}
            size="lg"
            className="mt-1 self-stretch"
            onPress={() => router.push('/(app)')}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-light-bg dark:bg-dark-bg">
      <FlashList
        data={items}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        stickyHeaderIndices={stickyHeaderIndices}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View className="gap-4 px-4 pb-1 pt-4">
            <Text variant="title">Histórico</Text>

            <TrendChart trend7d={trend7d} trend30d={trend30d} isLoading={isTrendLoading} />

            <Button
              label="Exportar CSV"
              variant="secondary"
              icon={DownloadIcon}
              onPress={() => void exportCsv()}
              loading={isExporting}
            />

            {exportError ? (
              <Text variant="caption" accessibilityRole="alert" color={palette.danger}>
                {exportError}
              </Text>
            ) : null}

            {deleteError ? (
              <Text variant="caption" accessibilityRole="alert" color={palette.danger}>
                {deleteError}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) =>
          item.type === 'header' ? (
            <View className="flex-row items-baseline justify-between gap-3 bg-light-bg px-4 pb-2 pt-5 dark:bg-dark-bg">
              <Text variant="label">{item.label}</Text>
              <Text variant="caption">
                Média {item.averageSystolic}/{item.averageDiastolic}
              </Text>
            </View>
          ) : (
            <ReadingRow
              id={item.reading.id}
              reading={item.reading}
              hasPendingWrites={item.reading.hasPendingWrites}
              position={item.position}
              onRequestDelete={handleRequestDelete}
            />
          )
        }
      />

      <ConfirmDialog
        visible={pendingDeleteId !== null}
        title="Excluir medição?"
        message="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        isDestructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </SafeAreaView>
  );
}
