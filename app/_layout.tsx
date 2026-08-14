import '../global.css';

import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAuthRedirect } from '@/features/auth/useAuthRedirect';
import { SessionProvider, useSession } from '@/features/auth/useSession';
import { useNotificationRedirect } from '@/features/reminders/useNotificationRedirect';
import { ThemePreferenceProvider } from '@/features/theme/useThemePreference';

function RootNavigator() {
  const { user, isLoading } = useSession();

  useAuthRedirect(user, isLoading);
  useNotificationRedirect();

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-light-bg dark:bg-dark-bg"
        accessibilityLabel="Carregando"
      >
        <ActivityIndicator />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Por fora do SessionProvider: a preferência de tema é do APARELHO, não da conta, e precisa
          valer também nas telas de login e no indicador de carregamento abaixo — todos anteriores
          a existir um usuário. */}
      <ThemePreferenceProvider>
        <SessionProvider>
          <RootNavigator />
        </SessionProvider>
      </ThemePreferenceProvider>
    </GestureHandlerRootView>
  );
}
