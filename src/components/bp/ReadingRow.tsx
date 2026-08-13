import { useRef } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';

import { Text } from '@/components/ui/Text';
import { ClockIcon, TrashIcon } from '@/components/ui/icons';
import { classifyBloodPressure } from '@/domain/bp-classification';
import { formatTime } from '@/lib/datetime';
import { categoryColors, colors, resolveColorScheme } from '@/theme/colors';
import type { Reading } from '@/types/models';

import { BpCategoryBadge, CATEGORY_LABEL } from './BpCategoryBadge';

/** Posição da linha dentro do grupo do dia — define quais cantos do "card" ela arredonda. */
export type ReadingRowPosition = 'first' | 'middle' | 'last' | 'only';

export interface ReadingRowProps {
  id: string;
  reading: Reading;
  hasPendingWrites: boolean;
  position?: ReadingRowPosition;
  onRequestDelete: (id: string) => void;
}

const POSITION_CLASSNAME: Record<ReadingRowPosition, string> = {
  first: 'rounded-t-2xl border-t border-b',
  middle: 'border-b',
  last: 'rounded-b-2xl border-b',
  only: 'rounded-2xl border-y',
};

/** Recuo lateral do grupo, aplicado ao Swipeable para a ação de excluir recuar junto com a linha. */
const GROUP_HORIZONTAL_MARGIN = 16;

export function ReadingRow({
  id,
  reading,
  hasPendingWrites,
  position = 'middle',
  onRequestDelete,
}: ReadingRowProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const scheme = resolveColorScheme(useColorScheme());
  const palette = colors[scheme];
  const category = classifyBloodPressure(reading.systolic, reading.diastolic);
  const categoryPalette = categoryColors[scheme][category];

  // "por", não "/" — leitor de tela deve anunciar "120 por 80", não "120 barra 80" (CLAUDE.md §4.7).
  const pulsePhrase = reading.pulse !== null ? `, pulso ${reading.pulse}` : '';
  const pendingPhrase = hasPendingWrites ? ', pendente de sincronização' : '';
  const accessibilityLabel = `${reading.systolic} por ${reading.diastolic}${pulsePhrase}, ${CATEGORY_LABEL[category].toLowerCase()}, medido às ${formatTime(reading.measuredAt)}${pendingPhrase}`;

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
        <TrashIcon size={20} color="#FFFFFF" strokeWidth={2.25} />
        <Text variant="caption" color="#FFFFFF" style={{ fontWeight: '700' }}>
          Excluir
        </Text>
      </RectButton>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      containerStyle={{ marginHorizontal: GROUP_HORIZONTAL_MARGIN }}
    >
      <View
        accessible
        accessibilityLabel={accessibilityLabel}
        className={[
          // overflow-hidden é o que faz a faixa lateral colorida acompanhar o canto arredondado
          // em vez de vazar para fora dele.
          'flex-row items-stretch overflow-hidden border-x border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface',
          POSITION_CLASSNAME[position],
        ].join(' ')}
      >
        {/* Faixa lateral na cor da categoria: dá leitura de gravidade ao correr o olho pela
            lista, sem que a cor carregue sozinha a informação — o badge nomeia a categoria. */}
        <View style={{ width: 4, backgroundColor: categoryPalette.fg }} />

        <View className="flex-1 flex-row items-center justify-between gap-3 px-4 py-3.5">
          <View className="flex-1 gap-1">
            <View className="flex-row items-baseline gap-1.5">
              <Text variant="sectionHeader" style={{ fontVariant: ['tabular-nums'] }}>
                {reading.systolic}/{reading.diastolic}
              </Text>
              <Text variant="caption">mmHg</Text>
              {reading.pulse !== null ? <Text variant="caption">· {reading.pulse} bpm</Text> : null}
            </View>

            <View className="flex-row items-center gap-1.5">
              <ClockIcon size={13} color={palette.muted} strokeWidth={2} />
              <Text variant="caption">{formatTime(reading.measuredAt)}</Text>
              {hasPendingWrites ? <Text variant="caption">· Pendente de sincronização</Text> : null}
            </View>
          </View>

          <BpCategoryBadge category={category} size="sm" />
        </View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteAction: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#BE123C',
  },
});
