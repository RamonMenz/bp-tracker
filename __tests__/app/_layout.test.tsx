import { render } from '@testing-library/react-native';

// Fora de src/ (não elegível para o alias @/) — aponta para o arquivo de rota real em
// app/_layout.tsx. Mesmo motivo dos outros testes de rota em __tests__/: um .test.tsx dentro de
// app/ viraria rota de verdade.
import RootLayout from '../../app/_layout';

const mockUseSession = jest.fn();
const mockUseAuthRedirect = jest.fn();
const mockUseOnboardingGate = jest.fn();
const mockUseNotificationRedirect = jest.fn();
const mockUseForegroundPush = jest.fn();

// RootNavigator não é exportado — só o RootLayout. O único jeito de observar "useOnboardingGate
// foi chamado com (user, isLoading)" é montar a árvore de verdade e espiar o hook por fora,
// exatamente como este mock faz.
// global.css não é JS — sem stub o Jest tenta compilar Tailwind como módulo e quebra na
// importação de app/_layout.tsx. Nenhum transform do projeto lida com .css (é o Metro, no bundle
// real, quem processa isto via NativeWind); `virtual: true` porque o arquivo nem chega a existir
// do ponto de vista do resolver depois de mockado.
jest.mock('../../global.css', () => ({}), { virtual: true });

jest.mock('expo-router', () => ({ Stack: () => null }));

// GestureHandlerRootView chama um módulo nativo (RNGestureHandlerModule.install) que não existe
// neste ambiente de teste — o projeto não tem o setup oficial de jest do
// react-native-gesture-handler configurado globalmente, e não é o alvo deste teste. Um `View`
// comum preserva o suficiente (renderiza os filhos) sem precisar do módulo nativo.
jest.mock('react-native-gesture-handler', () => {
  const { View } = jest.requireActual('react-native');
  return { GestureHandlerRootView: View };
});

jest.mock('@/features/auth/useSession', () => ({
  useSession: () => mockUseSession(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/features/auth/useAuthRedirect', () => ({ useAuthRedirect: (...args: unknown[]) => mockUseAuthRedirect(...args) }));

jest.mock('@/features/onboarding/useOnboardingGate', () => ({
  useOnboardingGate: (...args: unknown[]) => mockUseOnboardingGate(...args),
}));

jest.mock('@/features/reminders/useNotificationRedirect', () => ({
  useNotificationRedirect: (...args: unknown[]) => mockUseNotificationRedirect(...args),
}));

jest.mock('@/features/reminders/useForegroundPush', () => ({
  useForegroundPush: (...args: unknown[]) => mockUseForegroundPush(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RootLayout — gate de onboarding', () => {
  /**
   * Cobertura mínima do Prompt 3, item 2: `useOnboardingGate` precisa estar ligado ao MESMO
   * `user`/`isLoading` de `useSession`, ao lado de `useAuthRedirect` — não uma suíte inteira sobre
   * o `_layout`, só a garantia de que o fio foi conectado.
   */
  it('chama useOnboardingGate com o user e o isLoading da sessão', async () => {
    const user = { uid: 'user-1' };
    mockUseSession.mockReturnValue({ user, isLoading: false });

    await render(<RootLayout />);

    expect(mockUseOnboardingGate).toHaveBeenCalledWith(user, false);
    expect(mockUseAuthRedirect).toHaveBeenCalledWith(user, false);
  });

  it('não decide nada enquanto a sessão ainda carrega', async () => {
    mockUseSession.mockReturnValue({ user: null, isLoading: true });

    await render(<RootLayout />);

    expect(mockUseOnboardingGate).toHaveBeenCalledWith(null, true);
  });
});
