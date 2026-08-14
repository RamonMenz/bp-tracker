import { useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';

import { Text } from '@/components/ui/Text';
import { ClockIcon, TrashIcon } from '@/components/ui/icons';
import { classifyBloodPressure } from '@/domain/bp-classification';
import { formatTime } from '@/lib/datetime';
import { categoryColors, colors } from '@/theme/colors';
import { useColorScheme } from '@/theme/useColorScheme';
import type { Reading } from '@/types/models';

import { BpCategoryBadge, CATEGORY_LABEL } from './BpCategoryBadge';

/** Posição da linha dentro do grupo do dia — define quais cantos do "card" ela arredonda. */
export type ReadingRowPosition = 'first' | 'middle' | 'last' | 'only';

export interface ReadingRowProps {
  id: string;
  reading: Reading;
  hasPendingWrites: boolean;
  position?: ReadingRowPosition;
  /** Exclusão desta linha em voo — troca o badge por um indicador e trava o swipe, para não dar
   *  para pedir uma segunda exclusão da mesma linha enquanto a primeira ainda não terminou. */
  isDeleting?: boolean;
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
  isDeleting = false,
  onRequestDelete,
}: ReadingRowProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const scheme = useColorScheme();
  const palette = colors[scheme];
  const category = classifyBloodPressure(reading.systolic, reading.diastolic);
  const categoryPalette = categoryColors[scheme][category];

  // "por", não "/" — leitor de tela deve anunciar "120 por 80", não "120 barra 80" (CLAUDE.md §4.7).
  const pulsePhrase = reading.pulse !== null ? `, pulso ${reading.pulse}` : '';
  const notePhrase = reading.note !== null && reading.note !== '' ? `, observação: ${reading.note}` : '';
  const pendingPhrase = hasPendingWrites ? ', pendente de sincronização' : '';
  const deletingPhrase = isDeleting ? ', excluindo' : '';
  const accessibilityLabel = `${reading.systolic} por ${reading.diastolic}${pulsePhrase}, ${CATEGORY_LABEL[category].toLowerCase()}, medido às ${formatTime(reading.measuredAt)}${notePhrase}${pendingPhrase}${deletingPhrase}`;

  function handleDeletePress(): void {
    swipeableRef.current?.close();
    onRequestDelete(id);
  }

  function renderRightActions() {
    return (
      <RectButton
        onPress={handleDeletePress}
        style={styles.deleteAction}
        // Escondido de leitor de tela de propósito: é o mesmo `handleDeletePress` do botão
        // persistente abaixo, e só é alcançável arrastando a linha — um gesto que TalkBack/
        // VoiceOver e teclado na web não fazem. Expor os dois com o mesmo rótulo duplicaria o
        // anúncio ("Excluir medição, botão" duas vezes na mesma linha); o botão persistente e a
        // accessibilityAction da linha são os caminhos garantidos, este é só o atalho visual do
        // gesto de arrastar, para quem consegue usá-lo.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
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
      // Trava o swipe (e, com ele, um segundo toque em "Excluir") enquanto esta linha já está
      // sendo excluída — a exclusão em voo é sinalizada abaixo, no lugar do badge de categoria.
      enabled={!isDeleting}
      containerStyle={{ marginHorizontal: GROUP_HORIZONTAL_MARGIN }}
    >
      <View
        style={isDeleting ? { opacity: 0.6 } : undefined}
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

        <View className="flex-1 flex-row items-center gap-1 py-3.5 pl-4 pr-1">
          {/* `accessible` funde este bloco (e só ele) num nó só de acessibilidade — o botão de
              excluir abaixo fica DE FORA de propósito. Um View `accessible` "engole" os filhos:
              qualquer coisa tocável lá dentro deixaria de ser alcançável por TalkBack/VoiceOver
              como controle próprio, exatamente o problema que este componente está corrigindo. */}
          <View
            accessible
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ busy: isDeleting }}
            // Caminho alternativo para quem prefere a rotor de ações do leitor de tela a navegar
            // até o botão persistente — mesma ação, mesmo handleDeletePress.
            accessibilityActions={[{ name: 'delete', label: 'Excluir medição' }]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === 'delete') {
                handleDeletePress();
              }
            }}
            className="flex-1 flex-row items-center justify-between gap-3"
          >
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

              {reading.note !== null && reading.note !== '' ? (
                <Text variant="caption" numberOfLines={1}>
                  {reading.note}
                </Text>
              ) : null}
            </View>

            {isDeleting ? (
              <ActivityIndicator accessibilityLabel="Excluindo medição" color={palette.danger} />
            ) : (
              <BpCategoryBadge category={category} size="sm" />
            )}
          </View>

          {/* Botão persistente, sempre visível — não só dentro do swipe (CLAUDE.md §4.7). É o
              caminho garantido de exclusão pra quem navega por teclado na web ou não consegue (ou
              não sabe que dá pra) arrastar a linha; o swipe acima continua funcionando como atalho
              a mais, não substituído. 48×48dp mínimo, mesmo handleDeletePress dos outros dois
              caminhos. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Excluir medição"
            accessibilityState={{ disabled: isDeleting }}
            disabled={isDeleting}
            onPress={handleDeletePress}
            className="h-12 w-12 items-center justify-center rounded-full"
          >
            <TrashIcon size={18} color={palette.muted} strokeWidth={2} />
          </Pressable>
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
