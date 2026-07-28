import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuthRedirect } from '@/features/auth/useAuthRedirect';
import { SessionProvider, useSession } from '@/features/auth/useSession';

function RootNavigator() {
  const { user, isLoading } = useSession();

  useAuthRedirect(user, isLoading);

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
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}
