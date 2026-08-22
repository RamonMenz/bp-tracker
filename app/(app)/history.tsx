import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExportCsvDialog } from '@/components/bp/ExportCsvDialog';
import { ReadingRow, type ReadingRowPosition } from '@/components/bp/ReadingRow';
import { TrendChart } from '@/components/bp/TrendChart';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InlineFeedback } from '@/components/ui/InlineFeedback';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { ClipboardListIcon, DownloadIcon, HeartPulseIcon, TriangleAlertIcon } from '@/components/ui/icons';
import { useExportCsv } from '@/features/export/useExportCsv';
import { useDeleteReading } from '@/features/readings/useDeleteReading';
import type { ReadingListItem } from '@/features/readings/useReadings';
import { useReadings } from '@/features/readings/useReadings';
import { useReadingsTrend } from '@/features/readings/useReadingsTrend';
import { dayKey, dayLabel } from '@/lib/datetime';
import { colors } from '@/theme/colors';
import { useColorScheme } from '@/theme/useColorScheme';
import { tokens } from '@/theme/tokens';

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
  const { deleteReading, isDeleting, error: deleteError } = useDeleteReading();
  const { exportCsv, isExporting, error: exportError } = useExportCsv();
  const router = useRouter();
  const scheme = useColorScheme();
  const palette = colors[scheme];

  const { items, stickyHeaderIndices } = useMemo(() => buildListItems(readings), [readings]);

  /** id da medição aguardando confirmação — null enquanto não há diálogo aberto. */
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  /** id da medição sendo excluída agora — é o que diz a QUAL linha o indicador de progresso
   *  pertence, já que useDeleteReading é um hook só, compartilhado pela lista inteira. */
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const flashListRef = useRef<FlashListRef<ListItem>>(null);
  /** Offset e tamanho de `readings` capturados no instante da exclusão — o que
   *  `handleCommitLayoutEffect` (abaixo) usa pra saber SE e PARA ONDE restaurar o scroll. `null`
   *  quando não há restauração pendente. */
  const pendingScrollRestoreRef = useRef<{ offset: number; readingsLengthBeforeDelete: number } | null>(
    null,
  );

  // BUG: excluir uma medição jogava a rolagem para o fundo da lista. `FlashList` tenta preservar
  // a posição sozinho (`maintainVisibleContentPosition`, ligado por padrão), mas esse recurso
  // depende do ScrollView NATIVO entender essa prop — e o ScrollView do react-native-web não a
  // implementa. Sem esse suporte, a projeção de offset da lib calcula um ajuste errado e roda por
  // cima do nosso `scrollToOffset` (ela mesma se descreve como assentando de forma assíncrona,
  // "~200-300ms depois"), então uma correção de uma vez só (ex.: um único requestAnimationFrame)
  // não bastava — a lib corrigia de novo por cima, ainda levando pro fundo. `disabled` no prop
  // `maintainVisibleContentPosition` (ver FlashList mais abaixo) desliga essa projeção só na web,
  // deixando nosso restore como único mecanismo ali; no Android o recurso nativo da lib funciona
  // de verdade — não desligamos por lá.
  //
  // `onCommitLayoutEffect`, e não um rAF avulso, é quem diz com precisão quando o layout da linha
  // a menos de fato assentou — ele roda de um useLayoutEffect interno da FlashList. Por isso a
  // captura (em handleConfirmDelete) e a checagem (aqui) SÓ mexem em refs dentro de handlers/
  // callbacks, nunca no corpo do componente: um useEffect ou uma leitura de ref durante o render
  // deste componente assentaria DEPOIS do useLayoutEffect da FlashList no mesmo commit (efeito de
  // filho roda antes do do pai), tarde demais pra este callback já ver a decisão tomada.
  function handleCommitLayoutEffect(): void {
    const pending = pendingScrollRestoreRef.current;

    if (Platform.OS !== 'web' || pending === null || readings.length >= pending.readingsLengthBeforeDelete) {
      return;
    }

    pendingScrollRestoreRef.current = null;
    flashListRef.current?.scrollToOffset({ offset: pending.offset, animated: false });
  }

  function handleRequestEdit(readingId: string): void {
    router.push(`/(app)/edit-reading/${readingId}`);
  }

  function handleRequestDelete(readingId: string): void {
    // Trava de duplo toque: com uma exclusão já em voo, useDeleteReading não tem como rastrear
    // duas ao mesmo tempo (é um único par isDeleting/error para a tela toda).
    if (deletingId !== null) {
      return;
    }

    setPendingDeleteId(readingId);
  }

  async function handleConfirmDelete(): Promise<void> {
    if (pendingDeleteId === null) {
      return;
    }

    const readingId = pendingDeleteId;
    setPendingDeleteId(null);
    setDeletingId(readingId);

    if (Platform.OS === 'web') {
      const offset = flashListRef.current?.getAbsoluteLastScrollOffset();

      if (offset !== undefined) {
        pendingScrollRestoreRef.current = { offset, readingsLengthBeforeDelete: readings.length };
      }
    }

    const success = await deleteReading(readingId);

    // Exclusão falhou: a linha não vai sumir de `readings`, então a condição de
    // handleCommitLayoutEffect nunca fecharia sozinha — sem isto o offset capturado aqui ficaria
    // pendurado à espera de uma exclusão bem-sucedida futura, restaurando o scroll pro momento
    // errado.
    if (!success) {
      pendingScrollRestoreRef.current = null;
    }

    setDeletingId(null);
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
        ref={flashListRef}
        data={items}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        // Ver comentário do restore acima (BUG do scroll indo pro fundo ao excluir): na web a lib
        // compete com o nosso ajuste manual de scroll e vence, então desligamos a projeção dela
        // aqui. No Android ela funciona de verdade — o objeto só existe quando `disabled` teria
        // efeito, para não acender um warning de prop nova por engano num FlashList mais antigo.
        maintainVisibleContentPosition={Platform.OS === 'web' ? { disabled: true } : undefined}
        onCommitLayoutEffect={handleCommitLayoutEffect}
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
              onPress={() => setIsExportDialogOpen(true)}
              loading={isExporting}
            />
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
              isDeleting={isDeleting && deletingId === item.reading.id}
              onRequestDelete={handleRequestDelete}
              onRequestEdit={handleRequestEdit}
            />
          )
        }
      />

      {/* Fora da FlashList de propósito (BUG-07): dentro do ListHeaderComponent, o erro nascia no
          topo absoluto da lista — quem excluía uma linha várias rolagens abaixo nunca via a
          mensagem. Ancorado aqui, ela fica visível não importa até onde a lista tenha rolado. */}
      {exportError || deleteError ? (
        <View pointerEvents="box-none" className="absolute inset-x-4 bottom-4 gap-2">
          {exportError ? <InlineFeedback tone="danger" message={exportError} style={tokens.shadow.raised} /> : null}
          {deleteError ? <InlineFeedback tone="danger" message={deleteError} style={tokens.shadow.raised} /> : null}
        </View>
      ) : null}

      <ConfirmDialog
        visible={pendingDeleteId !== null}
        title="Excluir medição?"
        message="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        isDestructive
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDeleteId(null)}
      />

      <ExportCsvDialog
        visible={isExportDialogOpen}
        isExporting={isExporting}
        error={exportError}
        onExport={(range) => {
          // Fecha ao iniciar a exportação — o feedback de erro/sucesso continua no InlineFeedback
          // já ancorado fora da FlashList (ver acima), não duplicado aqui dentro do diálogo.
          setIsExportDialogOpen(false);
          void exportCsv(range);
        }}
        onCancel={() => setIsExportDialogOpen(false)}
      />
    </SafeAreaView>
  );
}
