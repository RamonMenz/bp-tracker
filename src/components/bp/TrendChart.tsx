import { useState } from 'react';
import { ActivityIndicator, Pressable, useColorScheme, View } from 'react-native';
// react-native-gifted-charts, não victory-native: para uma linha dupla simples (sistólica +
// diastólica) ela pede só SVG + gradiente (ambos padrão em projeto Expo, via expo-linear-gradient
// + react-native-svg). victory-native (XL) exige @shopify/react-native-skia como peer — um runtime
// gráfico nativo bem mais pesado para o que este gráfico precisa fazer.
import { LineChart } from 'react-native-gifted-charts';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
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

const CHART_HEIGHT = 160;

export function TrendChart({ trend7d, trend30d, isLoading }: TrendChartProps) {
  const [window, setWindow] = useState<TrendWindow>(7);
  const scheme = resolveColorScheme(useColorScheme());
  const palette = colors[scheme];

  const points = window === 7 ? trend7d : trend30d;
  const accessibilityLabel = `Tendência de pressão dos últimos ${window} dias`;

  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Text variant="sectionHeader">Tendência</Text>

        <View className="flex-row gap-2">
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
                  'min-h-[48px] min-w-[48px] items-center justify-center rounded-lg px-3',
                  isSelected ? 'bg-light-primary dark:bg-dark-primary' : 'bg-transparent',
                ].join(' ')}
              >
                <Text variant="caption" color={isSelected ? palette.primaryFg : palette.muted} style={{ fontWeight: '600' }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={{ height: CHART_HEIGHT }} className="mt-3 items-center justify-center">
          <ActivityIndicator accessibilityLabel="Carregando tendência" />
        </View>
      ) : points.length === 0 ? (
        <View style={{ height: CHART_HEIGHT }} className="mt-3 items-center justify-center">
          <Text variant="caption" className="text-center">
            Sem medições suficientes nesse período para mostrar a tendência.
          </Text>
        </View>
      ) : (
        <View accessible accessibilityLabel={accessibilityLabel} accessibilityRole="image" className="mt-3">
          <LineChart
            data={points.map((point) => ({ value: point.averageSystolic, label: point.label }))}
            data2={points.map((point) => ({ value: point.averageDiastolic }))}
            color={palette.primary}
            color2={palette.muted}
            thickness={2}
            thickness2={2}
            dataPointsRadius={3}
            dataPointsColor={palette.primary}
            dataPointsColor2={palette.muted}
            curved
            hideRules
            xAxisColor={palette.border}
            yAxisColor={palette.border}
            yAxisTextStyle={{ color: palette.muted, fontSize: 11 }}
            xAxisLabelTextStyle={{ color: palette.muted, fontSize: 11 }}
            height={CHART_HEIGHT}
            initialSpacing={16}
            endSpacing={16}
          />
        </View>
      )}

      <View className="mt-2 flex-row gap-4">
        <View className="flex-row items-center gap-1.5">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.primary }} />
          <Text variant="caption">Sistólica</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.muted }} />
          <Text variant="caption">Diastólica</Text>
        </View>
      </View>
    </Card>
  );
}
