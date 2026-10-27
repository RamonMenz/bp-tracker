import { StyleSheet, Text, View } from 'react-native';

import type { PocResult } from '@/domain/contracts';

export function Result({ result }: { result: PocResult | null }) {
  if (!result) return null;
  return <View style={styles.box}>
    {result.candidates && Object.entries(result.candidates.fields).map(([name, field]) =>
      <Text key={name} style={styles.text}>{({ systolic: 'Sistólica', diastolic: 'Diastólica', pulse: 'Pulso' }[name])}: {field.status === 'candidate' ? field.value : field.status === 'uncertain' ? (field.reason === 'ambiguous-label' ? 'Incerto — rótulo ambíguo; confira manualmente' : 'Incerto — rótulo sem número único legível') : 'Não identificado'}</Text>)}
    {result.finalTranscript && <Text selectable style={styles.text}>Resultado final transitório: {result.finalTranscript.text}</Text>}
    <Text style={styles.text}>Inicialização: {result.initializationMs?.toFixed(0) ?? 'não medido'} ms; reconhecimento: {result.recognitionMs.toFixed(0)} ms.</Text>
    <Text style={styles.text}>Não há botão de salvar nem conexão com o banco.</Text>
  </View>;
}

const styles = StyleSheet.create({
  text: { fontSize: 16, color: '#0f172a', lineHeight: 24 },
  box: { backgroundColor: '#e2e8f0', padding: 16, borderRadius: 8, gap: 10 },
});
