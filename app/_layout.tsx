import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAuthRedirect } from '@/features/auth/useAuthRedirect';
import { SessionProvider, useSession } from '@/features/auth/useSession';
import { useNotificationRedirect } from '@/features/reminders/useNotificationRedirect';

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
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
