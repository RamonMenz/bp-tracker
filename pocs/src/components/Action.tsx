import { Pressable, StyleSheet, Text } from 'react-native';

export function Action({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
    style={[styles.action, disabled && { opacity: 0.45 }]} onPress={onPress}><Text style={styles.label}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  action: { backgroundColor: '#1d4ed8', minHeight: 48, padding: 14, borderRadius: 8 },
  label: { color: '#ffffff', fontSize: 16, textAlign: 'center' },
});
