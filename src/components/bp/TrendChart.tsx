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

/** Largura reservada aos rótulos do eixo Y, descontada da área de plotagem. */
const Y_AXIS_LABEL_WIDTH = 38;

/** Folga nas pontas da série, para o primeiro e o último ponto não colarem nos eixos. */
const EDGE_SPACING = 16;

const SECTION_COUNT = 4;

/**
 * Faixa do eixo Y colada nos dados, com uma folga de 10 mmHg de cada lado arredondada na dezena.
 *
 * Sem isto o eixo começa em 0 e uma série que vive entre 76 e 160 fica espremida na metade de
 * cima do gráfico, com a metade de baixo vazia — a variação, que é a única coisa que o gráfico
 * existe para mostrar, vira uma linha quase reta.
 */
function computeAxisRange(points: TrendPoint[]): { yAxisOffset: number; maxValue: number } {
  const values = points.flatMap((point) => [point.averageSystolic, point.averageDiastolic]);

  if (values.length === 0) {
    return { yAxisOffset: 0, maxValue: 200 };
  }

  const yAxisOffset = Math.max(0, Math.floor((Math.min(...values) - 10) / 10) * 10);
  const top = Math.ceil((Math.max(...values) + 10) / 10) * 10;

  // A faixa é esticada até um múltiplo de (10 × nº de seções) para que cada divisão caia numa
  // dezena inteira. Sem isso o eixo sai com rótulos como 87 e 142, que num app clínico parecem
  // valor de medição e não marcação de escala.
  const step = Math.max(10, Math.ceil((top - yAxisOffset) / SECTION_COUNT / 10) * 10);

  return { yAxisOffset, maxValue: yAxisOffset + step * SECTION_COUNT };
}

export function TrendChart({ trend7d, trend30d, isLoading }: TrendChartProps) {
  const [window, setWindow] = useState<TrendWindow>(7);
  const [plotWidth, setPlotWidth] = useState(0);
  const scheme = resolveColorScheme(useColorScheme());
  const palette = colors[scheme];

  const points = window === 7 ? trend7d : trend30d;
  const accessibilityLabel = `Tendência de pressão dos últimos ${window} dias`;
  const { yAxisOffset, maxValue } = computeAxisRange(points);

  // A largura total que o gifted-charts desenha é
  // `yAxisLabelWidth + initialSpacing + spacing × (n-1) + endSpacing`. Não existe prop de largura
  // que ele respeite — passar `width` faz ele recalcular o spacing sozinho e vazar do card. O
  // controle real é resolver essa conta para `spacing`.
  const pointSpacing =
    points.length > 1
      ? Math.max(1, (plotWidth - Y_AXIS_LABEL_WIDTH - EDGE_SPACING * 2) / (points.length - 1))
      : 0;

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
        <View
          accessible
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="image"
          // `width: '100%'` + `overflow: hidden` são o que tornam esta medição confiável: sem
          // eles a View é dimensionada PELO gráfico, e como o spacing é calculado a partir da
          // medição, cada render realimentava uma largura maior até estabilizar vazando do card.
          // Com a largura presa à do pai, o onLayout devolve sempre a área útil real.
          style={{ width: '100%', overflow: 'hidden' }}
          onLayout={(event) => setPlotWidth(event.nativeEvent.layout.width)}
        >
          {plotWidth > 0 ? (
            <LineChart
              data={points.map((point) => ({ value: point.averageSystolic, label: point.label }))}
              data2={points.map((point) => ({ value: point.averageDiastolic }))}
              spacing={pointSpacing}
              yAxisOffset={yAxisOffset}
              maxValue={maxValue - yAxisOffset}
              noOfSections={SECTION_COUNT}
              yAxisLabelWidth={Y_AXIS_LABEL_WIDTH}
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
              initialSpacing={EDGE_SPACING}
              endSpacing={EDGE_SPACING}
            />
          ) : (
            <View style={{ height: CHART_HEIGHT }} />
          )}
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
