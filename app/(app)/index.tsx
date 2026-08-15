import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { TextInput } from 'react-native';

import { LastReadingCard } from '@/components/bp/LastReadingCard';
import { ReadingForm } from '@/components/bp/ReadingForm';
import { Card } from '@/components/ui/Card';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useLastReading } from '@/features/readings/useLastReading';
import { useReadingForm } from '@/features/readings/useReadingForm';

// Onboarding simples: o aviso aparece uma vez (no primeiro uso deste aparelho) e some ao ser
// dispensado — nunca mais bloqueia o caminho de registrar em ≤10s (CLAUDE.md §1).
const DISCLAIMER_DISMISSED_KEY = 'bp-tracker:disclaimer-dismissed';

export default function RecordScreen() {
  const form = useReadingForm();
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
        onSubmit={() => void form.submit()}
      />

      <LastReadingCard lastReading={lastReading} isLoading={isLastReadingLoading} />
    </Screen>
  );
}
