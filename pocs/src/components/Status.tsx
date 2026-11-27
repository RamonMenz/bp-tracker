import { Text } from 'react-native';

export function Status({ text }: { text: string }) {
  return <Text accessibilityLiveRegion="polite" style={{ fontSize: 16, color: '#0f172a', lineHeight: 24 }}>{text}</Text>;
}
