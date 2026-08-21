import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { ActivityIcon, ClockIcon } from '@/components/ui/icons';
import { classifyBloodPressure } from '@/domain/bp-classification';
import type { SessionReading } from '@/domain/session-average';
import type { SecondMeasurementState } from '@/features/readings/useSecondMeasurementFlow';

import { BpCategoryBadge, CATEGORY_LABEL } from './BpCategoryBadge';
import { SecondMeasurementDialog } from './SecondMeasurementDialog';

export interface SecondMeasurementCardProps {
  state: SecondMeasurementState;
  secondsRemaining: number;
  average: SessionReading | null;
  /** `useSecondMeasurementFlow.isSaving` — a segunda medição sendo gravada. Só vale em 'measuring'. */
  isSaving: boolean;
  /** `useSecondMeasurementFlow.saveError`: mensagem amigável já traduzida, nunca crua (§4.3). */
  saveError: string | null;
  onAccept: () => void;
  onSubmitSecondMeasurement: (values: { systolic: string; diastolic: string; pulse: string }) => void;
  onDecline: () => void;
  onDismissSummary: () => void;
}

/**
 * Texto de apoio do contador. Nunca é "Aguarde..." sozinho: o app não bloqueia nada aqui — o
 * intervalo é sugestão do protocolo, e quem quiser medir antes pode (CLAUDE.md §1, interface
 * calma). Por isso o zero vira um convite, não um "liberado".
 */
function countdownLabel(secondsRemaining: number): string {
  return secondsRemaining > 0 ? `Sugestão: aguarde mais ${secondsRemaining}s` : 'Pode medir quando quiser';
}

/**
 * Card da sugestão de segunda medição (protocolo AHA: duas leituras com 1-2 min de intervalo,
 * reportando a média).
 *
 * Componente burro (CLAUDE.md §3.4): todo o estado da sessão mora em `useSecondMeasurementFlow` —
 * aqui só entram props e sai desenho. O estado 'idle' não é tratado: a tela só monta este card
 * quando `state !== 'idle'`.
 *
 * O tom é informativo, nunca prescritivo — o app registra, não diagnostica (CLAUDE.md §1).
 */
export function SecondMeasurementCard({
  state,
  secondsRemaining,
  average,
  isSaving,
  saveError,
  onAccept,
  onSubmitSecondMeasurement,
  onDecline,
  onDismissSummary,
}: SecondMeasurementCardProps) {
  if (state === 'summary') {
    // A média é preenchida na mesma transição que leva o fluxo a 'summary'; a checagem existe
    // para o TypeScript — sem os dois valores não há resumo nenhum a mostrar.
    if (average === null) {
      return null;
    }

    return <SessionSummary average={average} onDismissSummary={onDismissSummary} />;
  }

  // 'measuring' virou um pop-up: os valores da segunda medição são digitados ALI, não no
  // ReadingForm grande da tela (que continua sendo o da primeira medição, intocado). O card de
  // fundo sai de cena junto — deixá-lo por baixo do scrim só duplicaria o "Medição 2 de 2" que o
  // próprio pop-up já anuncia.
  if (state === 'measuring') {
    return (
      <SecondMeasurementDialog
        visible
        isSaving={isSaving}
        error={saveError}
        onSubmit={onSubmitSecondMeasurement}
        onCancel={onDecline}
      />
    );
  }

  return (
    <Card className="gap-3">
      <SectionHeader title="Quer confirmar com uma segunda medição?" icon={ClockIcon} />

      <Text variant="body">
        O protocolo clínico sugere medir de novo em cerca de 1 minuto, para reduzir a variação da primeira
        leitura.
      </Text>

      <Text variant="caption">{countdownLabel(secondsRemaining)}</Text>

      <View className="gap-2">
        <Button label="Medir novamente" variant="secondary" onPress={onAccept} />
        <Button label="Não, obrigado" variant="ghost" onPress={onDecline} />
      </View>
    </Card>
  );
}

interface SessionSummaryProps {
  average: SessionReading;
  onDismissSummary: () => void;
}

function SessionSummary({ average, onDismissSummary }: SessionSummaryProps) {
  const category = classifyBloodPressure(average.systolic, average.diastolic);
  const pulsePhrase = average.pulse !== null ? `, pulso ${average.pulse} batimentos por minuto` : '';

  return (
    <Card className="gap-3">
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

      <Button label="Concluir" onPress={onDismissSummary} />
    </Card>
  );
}
