// Seletor explícito de leitor da demo de avaliação. O padrão continua sendo o motor decidido
// (Tesseract.js); o leitor de sete segmentos é EXPERIMENTAL e não existe no app.
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { WebPhotoCaptureScreen } from '@/screens/WebPhotoCaptureScreen.web';

import { SevenSegmentCaptureScreen } from './seven-segment/SevenSegmentCaptureScreen';

type Reader = 'tesseract' | 'seven-segment';
const READERS: { id: Reader; label: string }[] = [
  { id: 'tesseract', label: 'OCR Tesseract.js (motor decidido)' },
  { id: 'seven-segment', label: 'Leitor de sete segmentos (experimental)' },
];

export function DemoRoot() {
  const [reader, setReader] = useState<Reader>('tesseract');
  return <View className="flex-1">
    <View className="mx-auto w-full max-w-xl gap-2 px-4 pt-4" accessibilityRole="radiogroup" accessibilityLabel="Leitor">
      <Text>Leitor desta avaliação:</Text>
      {READERS.map(option => <Button key={option.id} label={option.label} variant={reader === option.id ? 'primary' : 'secondary'}
        accessibilityRole="radio" accessibilityState={{ checked: reader === option.id }} onPress={() => setReader(option.id)} />)}
    </View>
    {reader === 'tesseract' ? <WebPhotoCaptureScreen /> : <Screen><SevenSegmentCaptureScreen /></Screen>}
  </View>;
}
