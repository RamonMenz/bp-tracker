import { Modal, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { ActivityIcon } from '@/components/ui/icons';
import { classifyBloodPressure } from '@/domain/bp-classification';
import type { SessionReading } from '@/domain/session-average';

import { BpCategoryBadge, CATEGORY_LABEL } from './BpCategoryBadge';

export interface SecondMeasurementSummaryDialogProps {
  visible: boolean;
  average: SessionReading;
  onDismiss: () => void;
}

/** Scrim sobre a tela — mesmo tom de ConfirmDialog.tsx, para os pop-ups do app não divergirem. */
const BACKDROP_COLOR = 'rgba(15, 23, 42, 0.55)';

/**
 * Pop-up do RESUMO da segunda medição (protocolo AHA), no molde de `ConfirmDialog` e dos outros
 * dois pop-ups da sessão (`SecondMeasurementOfferDialog`, `SecondMeasurementDialog`) — Card dentro
 * de um Modal transparente, com o mesmo scrim e o mesmo tratamento do botão físico "voltar" do
 * Android.
 *
 * Era um card comum no scroll da tela, abaixo do formulário: depois que o pop-up da 2ª medição
 * fechava, o resumo "caía" solto ali embaixo, quebrando a sequência de pop-ups do convite e da 2ª
 * leitura. Como pop-up, as três etapas (convite → 2ª medição → resumo) aparecem em sequência, sem
 * essa queda.
 *
 * Não há "cancelar" aqui — é só a confirmação de uma leitura já salva (como o caso sem `onCancel`
 * de `ConfirmDialog`): o botão "Concluir" e o botão físico "voltar" caem na mesma saída.
 *
 * Componente burro (CLAUDE.md §3.4): só props entram e desenho sai. Quem decide quando abrir e
 * fechar é `useSecondMeasurementFlow`.
 */
export function SecondMeasurementSummaryDialog({ visible, average, onDismiss }: SecondMeasurementSummaryDialogProps) {
  const category = classifyBloodPressure(average.systolic, average.diastolic);
  const pulsePhrase = average.pulse !== null ? `, pulso ${average.pulse} batimentos por minuto` : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Botão físico "voltar" do Android: sem isto o pop-up vira uma armadilha na única plataforma
      // nativa do app. Cai na mesma saída do "Concluir" — não há ação a cancelar, a média já está salva.
      onRequestClose={onDismiss}
    >
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: BACKDROP_COLOR }}>
        <Card accessibilityViewIsModal elevation="flat" className="w-full max-w-[420px] gap-3">
          <SectionHeader title="Média das duas medições" icon={ActivityIcon} />

          {/* Mesmo desenho do valor grande de LastReadingCard: o número da média não pode aparecer num
              terceiro formato só por estar em outro card. */}
          <View
            accessible
            accessibilityLabel={`Média das duas medições: ${average.systolic} por ${average.diastolic} milímetros de mercúrio${pulsePhrase}, ${CATEGORY_LABEL[category].toLowerCase()}`}
            className="gap-2.5"
          >
            <View className="flex-row items-end justify-between gap-3">
              <View className="flex-row items-baseline gap-1.5">
                <Text variant="metric">
                  {average.systolic}/{average.diastolic}
                </Text>
                <Text variant="caption">mmHg</Text>
              </View>

              {average.pulse !== null ? (
                <View className="items-end">
                  <Text variant="sectionHeader" style={{ fontVariant: ['tabular-nums'] }}>
                    {average.pulse}
                  </Text>
                  <Text variant="caption">bpm</Text>
                </View>
              ) : null}
            </View>

            <BpCategoryBadge category={category} />
          </View>

          {/* A média não é um resumo à parte: ela SUBSTITUIU a primeira leitura no mesmo documento
              (ver useSecondMeasurementFlow.submitSecondMeasurement) — o texto precisa dizer isso. */}
          <Text variant="caption">A média das duas medições foi salva no seu histórico.</Text>

          <Button label="Concluir" onPress={onDismiss} />
        </Card>
      </View>
    </Modal>
  );
}
