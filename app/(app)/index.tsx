import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { TextInput } from 'react-native';

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
   * limpa os campos para '' assim que o submit dá certo — ler `form.systolic` depois do await
   * pegaria string vazia, e a média da sessão sairia de um `Number('')`.
   */
  async function handleSubmit(): Promise<void> {
    const snapshot: SessionReading = {
      systolic: Number(form.systolic),
      diastolic: Number(form.diastolic),
      pulse: form.pulse === '' ? null : Number(form.pulse),
    };

    const { success } = await form.submit();

    if (success) {
      flow.handleReadingSaved(snapshot);
    }
  }

  // Toque no lembrete (local ou push) manda para cá com autoFocus=systolic — quem tocou quer
  // registrar, não navegar. O atraso dá tempo da transição de tela terminar antes do focus().
  useEffect(() => {
    if (autoFocus === 'systolic') {
      const timeout = setTimeout(() => systolicRef.current?.focus(), 300);
      return () => clearTimeout(timeout);
    }
  }, [autoFocus]);

  return (
    <Screen>
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

      {/* Em 'idle' o card não existe — o formulário continua sendo a primeira coisa da tela, e o
          caminho de registrar em ≤10s (CLAUDE.md §1) segue intacto para quem só quer uma medição. */}
      {flow.state !== 'idle' ? (
        <SecondMeasurementCard
          state={flow.state}
          secondsRemaining={flow.secondsRemaining}
          average={flow.average}
          onAccept={flow.acceptSecondMeasurement}
          onDecline={flow.decline}
          onDismissSummary={flow.dismissSummary}
        />
      ) : null}

      <LastReadingCard lastReading={lastReading} isLoading={isLastReadingLoading} />
    </Screen>
  );
}
