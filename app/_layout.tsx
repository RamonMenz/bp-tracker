import { Stack } from 'expo-router';

// Providers globais, carregamento de fontes e auth gate entram aqui nas próximas fases.
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
