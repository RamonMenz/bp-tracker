import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { InlineFeedback } from '@/components/ui/InlineFeedback';
import { Text } from '@/components/ui/Text';
import { TriangleAlertIcon } from '@/components/ui/icons';
import type { ReportReview } from '@/features/report/useReportPdf';
import { colors } from '@/theme/colors';
import { useColorScheme } from '@/theme/useColorScheme';

import { PdfPreviewFrame } from './PdfPreviewFrame';

export interface ReportReviewPanelProps {
  review: ReportReview;
  isPreparing: boolean;
  error: string | null;
  onSave: () => void;
  onRetry: () => void;
  onChangePeriod: () => void;
  onCancel: () => void;
  /** `share` (Android): sem prévia embutida; a ação vira "Salvar ou compartilhar". */
  deliveryMode?: 'download' | 'share';
}

/**
 * Revisão antes de exportar (spec-relatorio-pdf §3.4): resumo, avisos de cobertura, pré-visualização
 * local e as ações "Salvar PDF", "Alterar período" e "Cancelar". Com cobertura não confirmada
 * (cache, omissão ou pendência), o aviso vem ANTES do botão de salvar, que passa a dizer que se
 * trata de recorte parcial, e "Tentar novamente" faz uma nova leitura (PDF-19).
 *
 * Componente burro: as ações só avisam quem montou.
 */
export function ReportReviewPanel({
  review,
  isPreparing,
  error,
  onSave,
  onRetry,
  onChangePeriod,
  onCancel,
  deliveryMode = 'download',
}: ReportReviewPanelProps) {
  const scheme = useColorScheme();
  const palette = colors[scheme];
  const isPartial = !review.isCoverageConfirmed;
  const isShare = deliveryMode === 'share';
  const saveLabel = isShare
    ? isPartial
      ? 'Salvar ou compartilhar recorte parcial'
      : 'Salvar ou compartilhar PDF'
    : isPartial
      ? 'Salvar recorte parcial em PDF'
      : 'Salvar PDF';

  return (
    <View className="gap-4">
      <Text variant="sectionHeader">Revisar relatório</Text>

      <View className="gap-1">
        <Text variant="body">{review.requestedPeriod}</Text>
        {review.coverageLines.map((line) => (
          <Text key={line} variant="caption">
            {line}
          </Text>
        ))}
      </View>

      <View className="gap-1">
        {review.averages.map((line) => (
          <Text key={line.label} variant="body">
            {`${line.label}: ${line.value} (${line.denominator})`}
          </Text>
        ))}
      </View>

      {isPartial ? (
        // Aviso, não erro: borda e ícone em tom neutro — vermelho fica para ação destrutiva.
        <View
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          className="gap-2 rounded-2xl border p-3"
          style={{ borderColor: palette.text, backgroundColor: palette.primaryTint }}
        >
          <View className="flex-row items-center gap-2">
            <TriangleAlertIcon size={18} color={palette.text} strokeWidth={2} />
            <Text variant="label">Cobertura não confirmada</Text>
          </View>
          <Text variant="body">{review.coverageStatement}</Text>
          {review.warnings.map((warning) => (
            <Text key={warning} variant="body">{`• ${warning}`}</Text>
          ))}
          <Text variant="caption">
            {isShare
              ? 'Você pode tentar novamente com conexão ou salvar/compartilhar este recorte parcial; o PDF declara a condição.'
              : 'Você pode tentar novamente com conexão ou salvar este recorte parcial; o PDF declara a condição.'}
          </Text>
        </View>
      ) : null}

      {isShare ? (
        // Android: sem pré-visualização embutida nesta versão (spec §3.4.1 pede recurso compatível
        // com a plataforma; o leitor de PDF escolhido pelo usuário faz esse papel).
        <Text variant="body">
          Este aparelho não mostra a prévia do PDF dentro do Aferi. Depois de salvar ou compartilhar, abra o arquivo no aplicativo escolhido para conferi-lo.
        </Text>
      ) : (
        <PdfPreviewFrame url={review.previewUrl} title="Pré-visualização do relatório em PDF" />
      )}

      <Text variant="caption">
        {isShare
          ? 'O PDF foi preparado neste aparelho. Ao salvar ou compartilhar, o destino escolhido pode manter uma cópia fora do controle do Aferi.'
          : 'O PDF foi preparado neste aparelho. Ao salvar, a cópia fica no destino que você escolher, fora do controle do Aferi.'}
      </Text>

      {error ? <InlineFeedback tone="danger" message={error} /> : null}

      <View className="gap-3">
        <Button
          label={saveLabel}
          onPress={onSave}
          disabled={isPreparing}
        />
        {isPartial ? (
          <Button label="Tentar novamente" variant="secondary" onPress={onRetry} loading={isPreparing} />
        ) : null}
        <Button label="Alterar período" variant="secondary" onPress={onChangePeriod} disabled={isPreparing} />
        <Button label="Cancelar" variant="ghost" onPress={onCancel} />
      </View>
    </View>
  );
}
