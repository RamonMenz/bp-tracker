import type { SessionReading } from '@/domain/session-average';
import type { SecondMeasurementState } from '@/features/readings/useSecondMeasurementFlow';

import { SecondMeasurementDialog } from './SecondMeasurementDialog';
import { SecondMeasurementOfferDialog } from './SecondMeasurementOfferDialog';
import { SecondMeasurementSummaryDialog } from './SecondMeasurementSummaryDialog';

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
 * Apresentação da sugestão de segunda medição (protocolo AHA: duas leituras com 1-2 min de
 * intervalo, reportando a média).
 *
 * Despacha por estado: os três (convite, 2ª leitura, resumo) são pop-ups em sequência — nenhum
 * cai solto no scroll da tela depois que o de baixo fecha.
 *
 * Componente burro (CLAUDE.md §3.4): todo o estado da sessão mora em `useSecondMeasurementFlow` —
 * aqui só entram props e sai desenho. O estado 'idle' não é tratado: a tela só monta este
 * componente quando `state !== 'idle'`.
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

    return <SecondMeasurementSummaryDialog visible average={average} onDismiss={onDismissSummary} />;
  }

  // 'measuring' virou um pop-up: os valores da segunda medição são digitados ALI, não no
  // ReadingForm grande da tela (que continua sendo o da primeira medição, intocado). O card de
  // fundo sai de cena junto — deixá-lo por baixo do scrim só duplicaria o "Segunda medição" que o
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

  // 'offer' também virou pop-up: como card no scroll, abaixo do formulário, o convite passava
  // despercebido justo no instante em que faz sentido — logo depois de salvar a primeira medição.
  return (
    <SecondMeasurementOfferDialog
      visible
      secondsRemaining={secondsRemaining}
      onAccept={onAccept}
      onDecline={onDecline}
    />
  );
}
