import { useState } from 'react';
import { useColorScheme, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { HeartPulseIcon, TriangleAlertIcon } from '@/components/ui/icons';
import { useSession } from '@/features/auth/useSession';
import { colors, resolveColorScheme } from '@/theme/colors';

export default function SignInScreen() {
  const { signIn, isLoading } = useSession();
  const scheme = resolveColorScheme(useColorScheme());
  const palette = colors[scheme];
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
    <Screen contentContainerStyle={{ justifyContent: 'center', gap: 24 }}>
      <View className="items-center gap-3">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-light-primaryTint dark:bg-dark-primaryTint">
          <HeartPulseIcon size={38} color={palette.primary} strokeWidth={2} />
        </View>
        <Text variant="title">BP Tracker</Text>
        <Text variant="body" className="text-center">
          Registre sua pressão arterial em segundos e acompanhe a evolução ao longo do tempo.
        </Text>
      </View>

      <Card className="gap-3">
        <Button label="Entrar com Google" size="lg" onPress={handleSignIn} loading={isLoading} />

        {errorMessage ? (
          <View className="flex-row items-center gap-2">
            <TriangleAlertIcon size={16} color={palette.danger} strokeWidth={2.25} />
            <Text variant="caption" accessibilityRole="alert" color={palette.danger} className="flex-1">
              {errorMessage}
            </Text>
          </View>
        ) : null}
      </Card>

      <Disclaimer />
    </Screen>
  );
}
