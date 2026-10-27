import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PhotoReviewDemoScreen } from '@/screens/PhotoReviewDemoScreen';
import { VoiceReviewDemoScreen } from '@/screens/VoiceReviewDemoScreen';

/** Trocar modalidade desmonta a revisão anterior e descarta seu conteúdo. */
export function AssistedReviewDemoScreen() {
  const [mode, setMode] = useState<'photo' | 'voice'>('photo');
  return (
    <View className="flex-1 bg-light-bg dark:bg-dark-bg">
      <View className="flex-row flex-wrap justify-center gap-3 px-4 pt-3">
        <Button label="Demonstração de fotografia" variant={mode === 'photo' ? 'primary' : 'secondary'} onPress={() => setMode('photo')} />
        <Button label="Demonstração de voz" variant={mode === 'voice' ? 'primary' : 'secondary'} onPress={() => setMode('voice')} />
      </View>
      {mode === 'photo' ? <PhotoReviewDemoScreen /> : <VoiceReviewDemoScreen />}
    </View>
  );
}
