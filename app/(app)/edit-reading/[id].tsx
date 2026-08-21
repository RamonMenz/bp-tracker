import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { ReadingForm } from '@/components/bp/ReadingForm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TriangleAlertIcon } from '@/components/ui/icons';
import { useReadingForm, type EditableReading } from '@/features/readings/useReadingForm';
import { useReadings } from '@/features/readings/useReadings';
import { colors } from '@/theme/colors';
import { useColorScheme } from '@/theme/useColorScheme';

const NOT_FOUND_MESSAGE = 'Essa medição não está mais disponível. Ela pode ter sido excluída.';

/**
 * Formulário em si, num componente à parte de propósito: `useReadingForm` lê `initialReading`
 * apenas na montagem (é semente de `useState`). Montá-lo só depois que a medição existe é o que
 * garante os campos pré-preenchidos — se ele nascesse junto com a tela, nasceria vazio e assim
 * ficaria quando o histórico terminasse de carregar.
 */
function EditReadingFormCard({ reading }: { reading: EditableReading }) {
  const form = useReadingForm(reading);
  const router = useRouter();

  async function handleSave(): Promise<void> {
    const { success } = await form.submit();

    if (success) {
      // Volta para a tela de origem (o histórico): a lista já reflete a correção pelo onSnapshot,
      // sem precisar de nenhum aviso de "salvo com sucesso" por cima dela.
      router.back();
    }
  }

  return (
    <>
      <ReadingForm
        form={form}
        title="Medição"
        submitLabel="Salvar alterações"
        onSubmit={() => void handleSave()}
      />

      {/* Esta rota é empilhada sobre as abas, que não desenham header (ver (app)/_layout.tsx) —
          sem este botão, na web não sobraria caminho de volta sem salvar. */}
      <Button label="Cancelar" variant="secondary" onPress={() => router.back()} disabled={form.isSaving} />
    </>
  );
}

export default function EditReadingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { readings, isLoading, error } = useReadings();
  const scheme = useColorScheme();
  const palette = colors[scheme];
  const router = useRouter();

  // A medição vem do mesmo listener que alimenta o histórico: já está em cache (funciona offline),
  // é a mesma fonte de verdade da lista de onde o usuário veio, e não custa uma leitura extra.
  const reading = readings.find((item) => item.id === id);

  if (isLoading) {
    return (
      <Screen contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator accessibilityLabel="Carregando medição" color={palette.primary} />
      </Screen>
    );
  }

  if (error !== null || reading === undefined) {
    return (
      <Screen contentContainerStyle={{ justifyContent: 'center' }}>
        <Card className="items-center gap-3">
          <TriangleAlertIcon size={28} color={palette.danger} strokeWidth={2} />
          <Text variant="body" accessibilityRole="alert" color={palette.danger} className="text-center">
            {error ?? NOT_FOUND_MESSAGE}
          </Text>
          <Button label="Voltar" variant="secondary" className="self-stretch" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="title">Editar medição</Text>

      <View className="gap-4">
        <EditReadingFormCard reading={reading} />
      </View>
    </Screen>
  );
}
