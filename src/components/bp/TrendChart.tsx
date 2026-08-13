import { useState } from 'react';
import { ActivityIndicator, Pressable, useColorScheme, View } from 'react-native';
// react-native-gifted-charts, não victory-native: para uma linha dupla simples (sistólica +
// diastólica) ela pede só SVG + gradiente (ambos padrão em projeto Expo, via expo-linear-gradient
// + react-native-svg). victory-native (XL) exige @shopify/react-native-skia como peer — um runtime
// gráfico nativo bem mais pesado para o que este gráfico precisa fazer.
import { LineChart } from 'react-native-gifted-charts';

import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { TrendingUpIcon } from '@/components/ui/icons';
import type { TrendPoint, TrendWindow } from '@/features/readings/useReadingsTrend';
import { colors, resolveColorScheme } from '@/theme/colors';

export interface TrendChartProps {
  trend7d: TrendPoint[];
  trend30d: TrendPoint[];
  isLoading: boolean;
}

const WINDOW_OPTIONS: readonly { value: TrendWindow; label: string }[] = [
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
];

const CHART_HEIGHT = 170;

export function TrendChart({ trend7d, trend30d, isLoading }: TrendChartProps) {
  const [window, setWindow] = useState<TrendWindow>(7);
  const scheme = resolveColorScheme(useColorScheme());
  const palette = colors[scheme];

  const points = window === 7 ? trend7d : trend30d;
  const accessibilityLabel = `Tendência de pressão dos últimos ${window} dias`;

  return (
    <Card className="gap-3">
      <SectionHeader title="Tendência" icon={TrendingUpIcon} />

      {/* Segmentado em linha própria, e não ao lado do título: os 48dp de alvo mínimo
          (CLAUDE.md §4.7) não cabem na régua do cabeçalho sem espremer o texto. */}
      <View className="flex-row gap-1 rounded-2xl bg-light-bg p-1 dark:bg-dark-bg">
        {WINDOW_OPTIONS.map((option) => {
          const isSelected = option.value === window;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Ver tendência dos últimos ${option.label}`}
              onPress={() => setWindow(option.value)}
              className={[
                'min-h-[48px] flex-1 items-center justify-center rounded-xl',
                isSelected ? 'bg-light-surface dark:bg-dark-surface' : 'bg-transparent',
              ].join(' ')}
              style={isSelected ? { borderWidth: 1, borderColor: palette.border } : undefined}
            >
              <Text
                variant="body"
                color={isSelected ? palette.primary : palette.muted}
                style={{ fontWeight: isSelected ? '700' : '500' }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={{ height: CHART_HEIGHT }} className="items-center justify-center">
          <ActivityIndicator accessibilityLabel="Carregando tendência" color={palette.primary} />
        </View>
      ) : points.length === 0 ? (
        <View style={{ height: CHART_HEIGHT }} className="items-center justify-center px-4">
          <Text variant="body" className="text-center">
            Sem medições suficientes nesse período para mostrar a tendência.
          </Text>
        </View>
      ) : (
        <View accessible accessibilityLabel={accessibilityLabel} accessibilityRole="image">
          <LineChart
            data={points.map((point) => ({ value: point.averageSystolic, label: point.label }))}
            data2={points.map((point) => ({ value: point.averageDiastolic }))}
            color={palette.primary}
            color2={palette.muted}
            thickness={2.5}
            thickness2={2.5}
            dataPointsRadius={3.5}
            dataPointsColor={palette.primary}
            dataPointsColor2={palette.muted}
            curved
            hideRules
            xAxisColor={palette.border}
            yAxisColor={palette.border}
            yAxisTextStyle={{ color: palette.muted, fontSize: 12 }}
            xAxisLabelTextStyle={{ color: palette.muted, fontSize: 12 }}
            height={CHART_HEIGHT}
            initialSpacing={16}
            endSpacing={16}
          />
        </View>
      )}

      <View className="flex-row gap-5">
        <LegendItem color={palette.primary} label="Sistólica" />
        <LegendItem color={palette.muted} label="Diastólica" />
      </View>
    </Card>
  );
}

interface LegendItemProps {
  color: string;
  label: string;
}

function LegendItem({ color, label }: LegendItemProps) {
  return (
    <View className="flex-row items-center gap-2">
      <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: color }} />
      <Text variant="caption">{label}</Text>
    </View>
  );
}
