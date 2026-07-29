import type { User } from 'firebase/auth';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

/**
 * Guarda de navegação do gate de autenticação: enquanto `isLoading` for true não decide nada
 * (o _layout mostra splash). Depois, redireciona para o grupo certo com base no segmento atual,
 * cobrindo também deep links diretos para uma rota de (app) ou (auth).
 */
export function useAuthRedirect(user: User | null, isLoading: boolean): void {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (user === null && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (user !== null && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [user, isLoading, segments, router]);
}
