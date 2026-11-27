import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { InlineFeedback } from '@/components/ui/InlineFeedback';
import { Text } from '@/components/ui/Text';
import { CalendarDaysIcon } from '@/components/ui/icons';
import type { ReportPeriodRequest } from '@/features/report/report-pdf-platform.types';
import type { ReportReview, ReportStage } from '@/features/report/useReportPdf';
import { formatShortDate } from '@/lib/datetime';
import { colors } from '@/theme/colors';
import { useColorScheme } from '@/theme/useColorScheme';

import { ReportReviewPanel } from './ReportReviewPanel';

export interface ExportPdfDialogProps {
  visible: boolean;
  stage: ReportStage;
  /** Presente na etapa de revisão: resumo e URL local da pré-visualização. */
  review: ReportReview | null;
  /** Mensagem amigável já traduzida (useReportPdf.error) — nunca error.message cru. */
  error: string | null;
  onPrepare: (request: ReportPeriodRequest) => void;
  onSave: () => void;
  onRetry: () => void;
  onChangePeriod: () => void;
  /** Fecha o diálogo; durante a preparação ou revisão, também as descarta (quem monta decide). */
  onCancel: () => void;
}

type Shortcut = ReportPeriodRequest['kind'];

interface ShortcutOption {
  value: Shortcut;
  label: string;
}

/** Mesmo arranjo do ExportCsvDialog: dois por linha, para caber com o texto ampliado (§4.7). */
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

const INVALID_CUSTOM_RANGE_MESSAGE = 'A data de fim deve ser igual ou posterior à de início.';

/** Compara só o dia local (os seletores entregam meia-noite local). */
function isDayBefore(a: Date, b: Date): boolean {
  return new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() < new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
}

/**
 * Escolha do período do relatório PDF, no padrão visual e de acessibilidade do `ExportCsvDialog`
 * (spec-relatorio-pdf §3.2.1), sem reutilizar o cálculo de período do CSV: aqui o diálogo só
 * devolve o PEDIDO; dias civis, fuso e bordas são resolvidos no pipeline puro do relatório.
 *
 * Componente burro (CLAUDE.md §3.4): guarda só o rascunho da escolha. Diferente do CSV, fica
 * aberto durante a geração — o erro (ex.: período vazio) aparece aqui e o usuário pode trocar o
 * intervalo sem reabrir nada.
 */
export function ExportPdfDialog({
  visible,
  stage,
  review,
  error,
  onPrepare,
  onSave,
  onRetry,
  onChangePeriod,
  onCancel,
}: ExportPdfDialogProps) {
  const scheme = useColorScheme();
  const palette = colors[scheme];

  const [shortcut, setShortcut] = useState<Shortcut>('last30');
  const [customStart, setCustomStart] = useState(() => new Date());
  const [customEnd, setCustomEnd] = useState(() => new Date());
  const [isStartPickerOpen, setIsStartPickerOpen] = useState(false);
  const [isEndPickerOpen, setIsEndPickerOpen] = useState(false);

  const isGenerating = stage === 'preparing';
  const isReviewing = stage === 'review' && review !== null;
  const isCustom = shortcut === 'custom';
  const isCustomRangeInverted = isCustom && isDayBefore(customEnd, customStart);
  const canGenerate = !isCustomRangeInverted && !isGenerating;

  function handleGenerate(): void {
    onPrepare(shortcut === 'custom' ? { kind: 'custom', start: customStart, end: customEnd } : { kind: shortcut });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)' }}>
        <Card
          accessibilityViewIsModal
          elevation="flat"
          className={`w-full ${isReviewing ? 'max-w-[720px]' : 'max-w-[420px]'}`}
          style={{ maxHeight: '92%' }}
        >
          <ScrollView contentContainerStyle={{ gap: 16 }}>
            {isReviewing ? (
              <ReportReviewPanel
                review={review}
                isPreparing={isGenerating}
                error={error}
                onSave={onSave}
                onRetry={onRetry}
                onChangePeriod={onChangePeriod}
                onCancel={onCancel}
              />
            ) : (
              <>
                <Text variant="sectionHeader">Período do relatório</Text>

                <Text variant="body">
                  O PDF é preparado neste aparelho, com as medições do período escolhido. Você revisa a prévia antes de salvar.
                </Text>

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
                            accessibilityState={{ checked: isSelected, selected: isSelected, disabled: isGenerating }}
                            // O react-native-web 0.21 ignora accessibilityState: sem aria-checked, o
                            // leitor de tela na Web não sabe qual período está marcado (PDF-21).
                            aria-checked={isSelected}
                            disabled={isGenerating}
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
                          disabled={isGenerating}
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
                          disabled={isGenerating}
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
                    // Dias futuros bloqueados aqui e, de novo, no pipeline (fonte da regra).
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
                    maximumDate={new Date()}
                    accessibilityLabel="Fim do período"
                    onChange={setCustomEnd}
                    onClose={() => setIsEndPickerOpen(false)}
                  />
                ) : null}

                {isGenerating ? (
                  <Text variant="caption" accessibilityLiveRegion="polite">
                    Preparando o relatório…
                  </Text>
                ) : null}

                {error ? <InlineFeedback tone="danger" message={error} /> : null}

                <View className="gap-3">
                  <Button label="Preparar relatório" onPress={handleGenerate} loading={isGenerating} disabled={!canGenerate} />
                  {/* Habilitado durante a geração: cancelar nunca fica bloqueado (spec §3.4.5). */}
                  <Button label="Cancelar" variant="ghost" onPress={onCancel} />
                </View>
              </>
            )}
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}
