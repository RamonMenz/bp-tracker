import { Redirect } from 'expo-router';

// Rota de entrada. Enquanto não existe sessão, aponta direto para o app;
// o desvio para /(auth)/sign-in passa a depender do useSession na Fase 2.
export default function Index() {
  return <Redirect href="/(app)" />;
}
