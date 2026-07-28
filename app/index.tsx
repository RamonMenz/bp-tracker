import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/useSession';

// O _layout.tsx só renderiza esta rota depois que isLoading resolve, então `user`
// já reflete o estado real de sessão aqui — sem isso, o redirect fixo do Fase 1
// brigaria com o gate de auth (useAuthRedirect) na primeira renderização.
export default function Index() {
  const { user } = useSession();

  return <Redirect href={user ? '/(app)' : '/(auth)/sign-in'} />;
}
