import type { ReactNode } from 'react';
import { View } from 'react-native';

export function Panel({ children }: { children: ReactNode }) {
  return <View style={{ gap: 12 }}>{children}</View>;
}
