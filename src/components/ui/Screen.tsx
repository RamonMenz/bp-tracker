import { KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/theme/tokens';

export type ScreenProps = ScrollViewProps;

export function Screen({ children, contentContainerStyle, ...props }: ScreenProps) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-light-bg dark:bg-dark-bg">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        // No Android o windowSoftInputMode padrão do Expo ("resize") já reduz a área visível —
        // aplicar "padding" também aqui causaria dois ajustes de layout competindo entre si.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          // "handled": sem isso, com o teclado aberto o primeiro toque em "Salvar" só fecha o
          // teclado e o botão precisa de um segundo toque — um toque a mais no caminho que o
          // CLAUDE.md §1 limita a 4.
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            { flexGrow: 1, padding: tokens.spacing.lg, gap: tokens.spacing.lg },
            contentContainerStyle,
          ]}
          {...props}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
