import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { LastReadingCard } from '@/components/bp/LastReadingCard';
import { ReadingForm } from '@/components/bp/ReadingForm';
import { SecondMeasurementCard } from '@/components/bp/SecondMeasurementCard';
import { Card } from '@/components/ui/Card';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import type { SessionReading } from '@/domain/session-average';
import { useLastReading } from '@/features/readings/useLastReading';
import { useReadingForm } from '@/features/readings/useReadingForm';
import { useSecondMeasurementFlow } from '@/features/readings/useSecondMeasurementFlow';

// Onboarding simples: o aviso aparece uma vez (no primeiro uso deste aparelho) e some ao ser
// dispensado — nunca mais bloqueia o caminho de registrar em ≤10s (CLAUDE.md §1).
const DISCLAIMER_DISMISSED_KEY = 'bp-tracker:disclaimer-dismissed';

export default function RecordScreen() {
  const form = useReadingForm();
  const flow = useSecondMeasurementFlow();
  const { lastReading, isLoading: isLastReadingLoading } = useLastReading();
  const { autoFocus } = useLocalSearchParams<{ autoFocus?: string }>();

  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const systolicRef = useRef<TextInput>(null);

  useEffect(() => {
    AsyncStorage.getItem(DISCLAIMER_DISMISSED_KEY)
      .then((value) => {
        if (value !== 'true') {
          setShowDisclaimer(true);
        }
      })
      .catch(() => {
        // Falha ao ler a preferência não deve travar o formulário — pior caso, o aviso reaparece.
      });
  }, []);

  function handleDismissDisclaimer(): void {
    setShowDisclaimer(false);
    AsyncStorage.setItem(DISCLAIMER_DISMISSED_KEY, 'true').catch(() => undefined);
  }

  /**
   * O retrato dos campos TEM que ser tirado antes do await: no modo criação, `useReadingForm`
   * limpa TODOS os campos assim que o submit dá certo — ler `form.systolic` (ou `form.note`,
   * `form.measuredAt`) depois do await pegaria valores já zerados. `readingId`, por outro lado,
   * só existe DEPOIS do submit (é o id devolvido pelo Firestore) — por isso o objeto completo só
   * é montado ao final, quando já se sabe que deu certo.
   */
  async function handleSubmit(): Promise<void> {
    const snapshot: SessionReading = {
      systolic: Number(form.systolic),
      diastolic: Number(form.diastolic),
      pulse: form.pulse === '' ? null : Number(form.pulse),
    };
    const note = form.note === '' ? null : form.note;
    const measuredAt = form.measuredAt;

    const { success, readingId } = await form.submit();

    if (success && readingId !== null) {
      flow.handleReadingSaved({ ...snapshot, id: readingId, note, measuredAt });
    }
  }

  /** A segunda medição vem do pop-up, em string — o fluxo trabalha com números. */
  function handleSubmitSecondMeasurement(values: { systolic: string; diastolic: string; pulse: string }): void {
    void flow.submitSecondMeasurement({
      systolic: Number(values.systolic),
      diastolic: Number(values.diastolic),
      pulse: values.pulse === '' ? null : Number(values.pulse),
    });
  }

  // Toque no lembrete (local ou push) manda para cá com autoFocus=systolic — quem tocou quer
  // registrar, não navegar. O atraso dá tempo da transição de tela terminar antes do focus().
  useEffect(() => {
    if (autoFocus === 'systolic') {
      const timeout = setTimeout(() => systolicRef.current?.focus(), 300);
      return () => clearTimeout(timeout);
    }
  }, [autoFocus]);

  // QUALQUER pop-up sobre o formulário tem que escondê-lo do leitor de tela, não só o que repete
  // rótulos de campo: atrás do scrim o bloco continua montado e navegável por gestos, então quem
  // usa leitor de tela sairia do pop-up sem perceber e passearia por um conteúdo que, para quem
  // enxerga, está coberto (CLAUDE.md §4.7). Vale para 'measuring' (cujos campos ainda por cima
  // duplicam os rótulos "Sistólica"/"Diastólica"/"Pulso" daqui) e para 'offer'.
  // `accessibilityViewIsModal` do Card resolve isso só no iOS, e o app é Android + web.
  // gap-4 = tokens.spacing.lg, o mesmo espaçamento que o Screen já aplicava entre estes filhos.
  const isSecondMeasurementOpen = flow.state === 'measuring' || flow.state === 'offer';

  return (
    <Screen>
      <View
        accessibilityElementsHidden={isSecondMeasurementOpen}
        importantForAccessibility={isSecondMeasurementOpen ? 'no-hide-descendants' : 'auto'}
        className="gap-4"
      >
        <Text variant="title">Registrar medição</Text>

        {showDisclaimer ? (
          <Card>
            <Disclaimer onDismiss={handleDismissDisclaimer} />
          </Card>
        ) : null}

        <ReadingForm
          form={form}
          title="Nova medição"
          submitLabel="Salvar medição"
          systolicRef={systolicRef}
          onSubmit={() => void handleSubmit()}
        />
      </View>

      {/* Em 'idle' nada disto existe — o formulário continua sendo a primeira coisa da tela, e o
          caminho de registrar em ≤10s (CLAUDE.md §1) segue intacto para quem só quer uma medição.
          Em 'offer' e 'measuring' o que sai daqui é um pop-up, não um card na tela; só o resumo
          de 'summary' é um card inline. */}
      {flow.state !== 'idle' ? (
        <SecondMeasurementCard
          state={flow.state}
          secondsRemaining={flow.secondsRemaining}
          average={flow.average}
          isSaving={flow.isSaving}
          saveError={flow.saveError}
          onAccept={flow.acceptSecondMeasurement}
          onSubmitSecondMeasurement={handleSubmitSecondMeasurement}
          onDecline={flow.decline}
          onDismissSummary={flow.dismissSummary}
        />
      ) : null}

      <LastReadingCard lastReading={lastReading} isLoading={isLastReadingLoading} />
    </Screen>
  );
}
