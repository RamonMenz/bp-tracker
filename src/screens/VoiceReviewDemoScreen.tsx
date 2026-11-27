import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';

import { VoiceReadingReview } from '@/components/bp/VoiceReadingReview';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useVoiceReview } from '@/features/assisted-entry/useVoiceReview';

export function VoiceReviewDemoScreen() {
  const review = useVoiceReview(); // Modo fixo: nenhuma porta clínica aceita aqui.
  const [text, setText] = useState('');
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => { if (state !== 'active') setText(''); });
    return () => listener.remove();
  }, []);
  function simulate(value: string, final: boolean = true) {
    const attempt = review.newAttempt();
    review.receiveFinal(attempt, { kind: 'transcript', locale: 'pt-BR', final,
      capturedAtMs: Date.now(), text: value }, 'synthetic');
    setText('');
  }
  const displayedReview = { ...review,
    cancel: () => { setText(''); review.cancel(); },
    recapture: () => { setText(''); return review.newAttempt(); } };
  return (
    <Screen>
      <View className="mx-auto w-full max-w-xl gap-5">
        <Text variant="title" accessibilityRole="header">Aferi · revisão de voz</Text>
        <Card className="gap-3">
          <Text>Demonstração isolada · texto sintético</Text>
          <Text>Reconhecedor local não conectado. Esta tela testa o parser e a revisão; não comprova reconhecimento de fala.</Text>
          <Text>Sem microfone, autenticação ou gravação clínica. Silêncio, transcrição e comandos de voz nunca confirmam uma medição.</Text>
          <Button label="Simular doze por oito" onPress={() => simulate('doze por oito')} />
          <Button label="Simular decimais e pulso" variant="secondary"
            onPress={() => simulate('treze vírgula cinco por oito vírgula cinco, pulso setenta e dois')} />
          <Button label="Simular escala mista" variant="secondary" onPress={() => simulate('doze por oitenta')} />
          <Button label="Simular correção ambígua" variant="secondary" onPress={() => simulate('doze por oito, não, quatorze por nove')} />
          <Button label="Simular silêncio" variant="secondary" onPress={() => simulate('')} />
          <Button label="Simular resultado parcial" variant="secondary" onPress={() => simulate('120 por 80', false)} />
          <Field label="Texto sintético para interpretação" value={text} maxLength={2000}
            autoComplete="off" autoCorrect={false} spellCheck={false}
            onChangeText={value => { setText(value); review.newAttempt(); }} multiline />
          <Button label="Interpretar texto sintético" variant="secondary" onPress={() => simulate(text)} />
        </Card>
        <VoiceReadingReview review={displayedReview} />
      </View>
    </Screen>
  );
}
