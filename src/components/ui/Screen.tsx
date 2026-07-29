import { ScrollView, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/theme/tokens';

export type ScreenProps = ScrollViewProps;

export function Screen({ children, contentContainerStyle, ...props }: ScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-light-bg dark:bg-dark-bg">
      <ScrollView
        contentContainerStyle={[{ flexGrow: 1, padding: tokens.spacing.lg }, contentContainerStyle]}
        {...props}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
