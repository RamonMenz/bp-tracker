import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { InlineFeedback } from '@/components/ui/InlineFeedback';
import { Text } from '@/components/ui/Text';
import { CalendarDaysIcon } from '@/components/ui/icons';
import { formatShortDate } from '@/lib/datetime';
import { colors } from '@/theme/colors';
import { useColorScheme } from '@/theme/useColorScheme';

export interface ExportCsvDialogProps {
  visible: boolean;
  isExporting: boolean;
  /** Mensagem amigável já traduzida (useExportCsv.error) — nunca error.message cru (CLAUDE.md §4.3). */
  error: string | null;
  onExport: (range?: { start: Date; end: Date }) => void;
  onCancel: () => void;
}

type Shortcut = 'last7' | 'last30' | 'all' | 'custom';

interface ShortcutOption {
  value: Shortcut;
  label: string;
}

/** Dois por linha, não um segmentado de quatro numa régua só: "Personalizado" e "Últimos 30 dias"
 *  não cabem lado a lado com o texto ampliado que o app nunca desativa (CLAUDE.md §4.7). */
const SHORTCUT_ROWS: readonly ShortcutOption[][] = [
  [
    { value: 'last7', label: 'Últimos 7 dias' },
    { value: 'last30', label: 'Últimos 30 dias' },
  ],
  [
    { value: 'all', label: 'Tudo' },
    { value: 'custom', label: 'Personalizado' },
  ],
];

const DAY_MS = 24 * 60 * 60 * 1000;

const INVALID_CUSTOM_RANGE_MESSAGE = 'A data de fim deve ser igual ou posterior à de início.';

/** Fim do dia local — sem isto, um "fim" de mode="date" (sempre meia-noite) excluiria quase toda
 *  a leitura do próprio dia final do range personalizado do filtro `<=` de getAllReadings. */
function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Pop-up de escolha do período a exportar, no molde de `ConfirmDialog` — Card dentro de um Modal
 * transparente, mesmo scrim, mesmo `onRequestClose` para o botão físico "voltar" do Android.
 *
 * Componente burro (CLAUDE.md §3.4): guarda só o rascunho da própria escolha (atalho selecionado,
 * datas do range personalizado). Não decide o que `onExport`/`onCancel` fazem depois — quem monta
 * decide se fecha o diálogo, quando chamar `exportCsv`, etc.
 */
export function ExportCsvDialog({ visible, isExporting, error, onExport, onCancel }: ExportCsvDialogProps) {
  const scheme = useColorScheme();
  const palette = colors[scheme];

  const [shortcut, setShortcut] = useState<Shortcut>('all');
  const [customStart, setCustomStart] = useState(() => new Date());
  const [customEnd, setCustomEnd] = useState(() => new Date());
  const [isStartPickerOpen, setIsStartPickerOpen] = useState(false);
  const [isEndPickerOpen, setIsEndPickerOpen] = useState(false);

  const isCustom = shortcut === 'custom';
  const isCustomRangeInverted = isCustom && customEnd.getTime() < customStart.getTime();
  const canExport = !isCustomRangeInverted;

  function computeRange(): { start: Date; end: Date } | undefined {
    if (shortcut === 'all') {
      return undefined;
    }

    if (shortcut === 'custom') {
      return { start: customStart, end: endOfDay(customEnd) };
    }

    const days = shortcut === 'last7' ? 7 : 30;
    return { start: new Date(Date.now() - days * DAY_MS), end: new Date() };
  }

  function handleExport(): void {
    onExport(computeRange());
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Botão físico "voltar" do Android: sem isto o pop-up vira uma armadilha na única
      // plataforma nativa do app.
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)' }}>
        <Card accessibilityViewIsModal elevation="flat" className="w-full max-w-[420px] gap-4">
          {/* Não repete o rótulo "Exportar CSV" do botão que abre este pop-up — evitar dois nós
              de texto iguais na árvore ao mesmo tempo (um deles some ao fechar, mas os dois
              coexistem enquanto o diálogo está aberto). */}
          <Text variant="sectionHeader">Período da exportação</Text>

          {/* radiogroup/radio, não um grupo de botões soltos: as quatro opções são mutuamente
              exclusivas — mesmo padrão de semântica do seletor de tema em Ajustes. O visual
              (fundo/borda conforme selecionado) é o dos botões segmentados de TrendChart.tsx. */}
          <View className="gap-2" accessibilityRole="radiogroup">
            {SHORTCUT_ROWS.map((row) => (
              <View key={row.map((option) => option.value).join('-')} className="flex-row gap-2">
                {row.map((option) => {
                  const isSelected = option.value === shortcut;

                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityLabel={option.label}
                      accessibilityState={{ checked: isSelected, selected: isSelected }}
                      onPress={() => setShortcut(option.value)}
                      className="min-h-[48px] flex-1 items-center justify-center rounded-2xl border px-2"
                      style={{
                        backgroundColor: isSelected ? palette.primaryTint : palette.bg,
                        borderColor: isSelected ? palette.primary : palette.border,
                      }}
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
            ))}
          </View>

          {isCustom ? (
            <View className="gap-2">
              <View className="flex-row items-start gap-3">
                <View className="flex-1 gap-1.5">
                  <Text variant="label">Início</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Início do período: ${formatShortDate(customStart)}. Toque para editar.`}
                    onPress={() => setIsStartPickerOpen(true)}
                    className="min-h-[48px] flex-row items-center justify-center gap-2 rounded-2xl border border-light-border px-3 dark:border-dark-border"
                  >
                    <CalendarDaysIcon size={16} color={palette.muted} strokeWidth={2} />
                    <Text variant="body">{formatShortDate(customStart)}</Text>
                  </Pressable>
                </View>

                <View className="flex-1 gap-1.5">
                  <Text variant="label">Fim</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Fim do período: ${formatShortDate(customEnd)}. Toque para editar.`}
                    onPress={() => setIsEndPickerOpen(true)}
                    className="min-h-[48px] flex-row items-center justify-center gap-2 rounded-2xl border border-light-border px-3 dark:border-dark-border"
                  >
                    <CalendarDaysIcon size={16} color={palette.muted} strokeWidth={2} />
                    <Text variant="body">{formatShortDate(customEnd)}</Text>
                  </Pressable>
                </View>
              </View>

              {isCustomRangeInverted ? (
                <Text variant="caption" accessibilityRole="alert" color={palette.danger}>
                  {INVALID_CUSTOM_RANGE_MESSAGE}
                </Text>
              ) : null}
            </View>
          ) : null}

          {isStartPickerOpen ? (
            <DateTimeField
              value={customStart}
              mode="date"
              maximumDate={new Date()}
              accessibilityLabel="Início do período"
              onChange={setCustomStart}
              onClose={() => setIsStartPickerOpen(false)}
            />
          ) : null}

          {isEndPickerOpen ? (
            <DateTimeField
              value={customEnd}
              mode="date"
              // Nunca depois de hoje — não faz sentido exportar até uma data que ainda não chegou.
              maximumDate={new Date()}
              accessibilityLabel="Fim do período"
              onChange={setCustomEnd}
              onClose={() => setIsEndPickerOpen(false)}
            />
          ) : null}

          {error ? <InlineFeedback tone="danger" message={error} /> : null}

          {/* Empilhado e em largura cheia, mesmo motivo de ConfirmDialog: com o texto ampliado
              (§4.7) os rótulos não cabem em meia linha. */}
          <View className="gap-3">
            <Button label="Exportar" onPress={handleExport} loading={isExporting} disabled={!canExport} />
            <Button label="Cancelar" variant="ghost" onPress={onCancel} disabled={isExporting} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
