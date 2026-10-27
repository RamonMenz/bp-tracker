import { View } from 'react-native';

import { PhotoReadingReview } from '@/components/bp/PhotoReadingReview';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { interpretPhoto } from '@/domain/interpret-photo';
import { PHOTO_INTERPRETATION_EXAMPLES } from '@/features/assisted-entry/photo-interpretation-examples';
import { usePhotoReview } from '@/features/assisted-entry/usePhotoReview';

export function PhotoReviewDemoScreen() {
  const review = usePhotoReview();
  function load(kind: keyof typeof PHOTO_INTERPRETATION_EXAMPLES) {
    const attempt = review.state.phase === 'waiting' ? review.state.attempt : review.recapture();
    review.receive(attempt, interpretPhoto({ ...PHOTO_INTERPRETATION_EXAMPLES[kind], capturedAtMs: Date.now() }));
  }
  return (
    <Screen>
      <View className="mx-auto w-full max-w-xl gap-5">
        <Text variant="title" accessibilityRole="header">Aferi · revisão de fotografia</Text>
        <Card className="gap-3">
          <Text>Demonstração isolada · dados sintéticos</Text>
          <Text>Sem câmera, OCR, autenticação ou salvamento. Escolha um cenário para revisar.</Text>
          <Text>O parser interpreta texto e posições sintéticos rotulados. Acerto nestes casos não mede a acurácia do OCR.</Text>
          <Button label="Simular candidatos completos" onPress={() => load('complete')} />
          <Button label="Simular campo incerto" variant="secondary" onPress={() => load('uncertain')} />
          <Button label="Simular valor inválido" variant="secondary" onPress={() => load('invalid')} />
          <Button label="Interpretar rótulos e números separados (sintético)" variant="secondary" onPress={() => load('layout')} />
          <Button label="Interpretar display com acessórios (sintético)" variant="secondary" onPress={() => load('accessories')} />
          <Button label="Interpretar leitura parcial (sintético)" variant="secondary" onPress={() => load('partial')} />
          <Button label="Interpretar números sem rótulos (sintético)" variant="secondary" onPress={() => load('unidentified')} />
        </Card>
        <PhotoReadingReview review={review} />
      </View>
    </Screen>
  );
}
