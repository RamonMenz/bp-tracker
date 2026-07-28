import { useState } from 'react';
import { useColorScheme } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useSession } from '@/features/auth/useSession';
import { colors } from '@/theme/colors';

export default function SignInScreen() {
  const { signIn, isLoading } = useSession();
  const scheme = useColorScheme() ?? 'light';
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignIn(): Promise<void> {
    setErrorMessage(null);
    try {
      await signIn();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente.');
    }
  }

  return (
    <Screen contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <Text variant="title">BP Tracker</Text>
      <Button label="Entrar com Google" onPress={handleSignIn} loading={isLoading} />
      {errorMessage ? (
        <Text variant="caption" accessibilityRole="alert" color={colors[scheme].danger}>
          {errorMessage}
        </Text>
      ) : null}
    </Screen>
  );
}
