import { ActivityIndicator, useColorScheme, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { ClockIcon, HeartPulseIcon } from '@/components/ui/icons';
import { classifyBloodPressure } from '@/domain/bp-classification';
import type { ReadingListItem } from '@/features/readings/useReadings';
import { formatDayAndTime } from '@/lib/datetime';
import { colors, resolveColorScheme } from '@/theme/colors';

import { BpCategoryBadge, CATEGORY_LABEL } from './BpCategoryBadge';

export interface LastReadingCardProps {
  lastReading: ReadingListItem | null;
  isLoading: boolean;
}

/**
 * Card "Última medição": o valor mais recente em corpo grande, com a categoria ao lado.
 *
 * Fica ABAIXO do formulário na Home de propósito — a home é o formulário (CLAUDE.md §1), e
 * empurrar os campos para fora da primeira dobra custaria rolagem no caminho de ≤10s.
 */
export function LastReadingCard({ lastReading, isLoading }: LastReadingCardProps) {
  const scheme = resolveColorScheme(useColorScheme());
  const palette = colors[scheme];

  return (
    <Card className="gap-3">
      <SectionHeader title="Última medição" icon={HeartPulseIcon} />

      {isLoading ? (
        <View className="h-16 items-center justify-center">
          <ActivityIndicator accessibilityLabel="Carregando última medição" color={palette.primary} />
        </View>
      ) : lastReading === null ? (
        <Text variant="body" className="py-2">
          Nenhuma medição registrada ainda. A primeira que você salvar aparece aqui.
        </Text>
      ) : (
        <LastReadingContent reading={lastReading} mutedColor={palette.muted} />
      )}
    </Card>
  );
}

interface LastReadingContentProps {
  reading: ReadingListItem;
  mutedColor: string;
}

function LastReadingContent({ reading, mutedColor }: LastReadingContentProps) {
  const category = classifyBloodPressure(reading.systolic, reading.diastolic);
  const pulsePhrase = reading.pulse !== null ? `, pulso ${reading.pulse} batimentos por minuto` : '';
  const pendingPhrase = reading.hasPendingWrites ? ', pendente de sincronização' : '';

  return (
    <View
      accessible
      accessibilityLabel={`Última medição: ${reading.systolic} por ${reading.diastolic} milímetros de mercúrio${pulsePhrase}, ${CATEGORY_LABEL[category].toLowerCase()}, ${formatDayAndTime(reading.measuredAt)}${pendingPhrase}`}
      className="gap-2.5"
    >
      <View className="flex-row items-end justify-between gap-3">
        <View className="flex-row items-baseline gap-1.5">
          <Text variant="metric">
            {reading.systolic}/{reading.diastolic}
          </Text>
          <Text variant="caption">mmHg</Text>
        </View>

        {reading.pulse !== null ? (
          <View className="items-end">
            <Text variant="sectionHeader" style={{ fontVariant: ['tabular-nums'] }}>
              {reading.pulse}
            </Text>
            <Text variant="caption">bpm</Text>
          </View>
        ) : null}
      </View>

      <BpCategoryBadge category={category} />

      <View className="flex-row items-center gap-1.5">
        <ClockIcon size={14} color={mutedColor} strokeWidth={2} />
        <Text variant="caption">{formatDayAndTime(reading.measuredAt)}</Text>
        {reading.hasPendingWrites ? <Text variant="caption">· Pendente de sincronização</Text> : null}
      </View>
    </View>
  );
}
