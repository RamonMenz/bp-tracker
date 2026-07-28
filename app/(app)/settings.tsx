import { useState } from 'react';
import { useColorScheme } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useSession } from '@/features/auth/useSession';
import { colors } from '@/theme/colors';

export default function SettingsScreen() {
  const { signOut, isLoading } = useSession();
  const scheme = useColorScheme() ?? 'light';
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignOut(): Promise<void> {
    setErrorMessage(null);
    try {
      await signOut();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível sair. Tente novamente.');
    }
  }

  return (
    <Screen>
      <Text variant="title">Ajustes</Text>
      <Button
        label="Sair"
        variant="destructive"
        onPress={handleSignOut}
        loading={isLoading}
        className="mt-6"
      />
      {errorMessage ? (
        <Text variant="caption" accessibilityRole="alert" color={colors[scheme].danger} className="mt-2">
          {errorMessage}
        </Text>
      ) : null}
    </Screen>
  );
}
