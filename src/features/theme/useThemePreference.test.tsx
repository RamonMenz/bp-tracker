import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { colorScheme } from 'nativewind';
import { Pressable, Text } from 'react-native';

import { useColorScheme } from '@/theme/useColorScheme';

import { THEME_PREFERENCE_KEY, type ThemePreference } from './theme-preference.storage';
import { ThemePreferenceProvider, useThemePreference } from './useThemePreference';

/**
 * Uma sonda que lê as DUAS pontas de uma vez: a preferência escolhida (`useThemePreference`) e o
 * esquema resolvido que os componentes usam para pintar (`useColorScheme` de `@/theme`). É a
 * ligação entre elas que este recurso precisa garantir.
 */
function Probe(): React.JSX.Element {
  const { preference, setPreference } = useThemePreference();
  const scheme = useColorScheme();

  return (
    <>
      <Text testID="preference">{preference}</Text>
      <Text testID="scheme">{scheme}</Text>
      {(['light', 'dark', 'system'] as ThemePreference[]).map((value) => (
        <Pressable key={value} testID={`set-${value}`} onPress={() => setPreference(value)}>
          <Text>{value}</Text>
        </Pressable>
      ))}
    </>
  );
}

function renderProbe() {
  return render(
    <ThemePreferenceProvider>
      <Probe />
    </ThemePreferenceProvider>,
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  // O esquema do NativeWind é um observable de MÓDULO — sobrevive entre testes. Sem este reset, o
  // tema escolhido num teste vazaria para o seguinte.
  colorScheme.set('system');
});

describe('ThemePreferenceProvider', () => {
  it("começa em 'system' quando não há nada gravado", async () => {
    await renderProbe();

    await waitFor(() => expect(screen.getByTestId('preference')).toHaveTextContent('system'));
  });

  /**
   * A regressão que este recurso mais arrisca: a preferência é lida do AsyncStorage de forma
   * assíncrona, então é possível montar tudo e só aplicar o tema quando o usuário toca em algo —
   * o app abriria no tema errado. Aqui o tema tem de virar SEM nenhuma interação.
   */
  it('aplica a preferência gravada já na primeira carga, sem interação', async () => {
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, 'dark');

    await renderProbe();

    await waitFor(() => expect(screen.getByTestId('scheme')).toHaveTextContent('dark'));
    expect(screen.getByTestId('preference')).toHaveTextContent('dark');
  });

  it('troca o esquema resolvido ao escolher uma preferência', async () => {
    await renderProbe();

    await waitFor(() => expect(screen.getByTestId('scheme')).toHaveTextContent('light'));

    fireEvent.press(screen.getByTestId('set-dark'));

    await waitFor(() => expect(screen.getByTestId('scheme')).toHaveTextContent('dark'));
  });

  it('persiste a escolha para a próxima abertura do app', async () => {
    await renderProbe();

    fireEvent.press(screen.getByTestId('set-dark'));

    await waitFor(async () => {
      await expect(AsyncStorage.getItem(THEME_PREFERENCE_KEY)).resolves.toBe('dark');
    });
  });

  /**
   * CLAUDE.md §4.3: erro de persistência nunca trava a tela nem vira erro cru. O tema pedido vale
   * nesta sessão de qualquer jeito — só não sobrevive ao fechamento do app.
   */
  it('mantém o tema aplicado mesmo quando a gravação falha', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disco cheio'));

    await renderProbe();

    fireEvent.press(screen.getByTestId('set-dark'));

    await waitFor(() => expect(screen.getByTestId('scheme')).toHaveTextContent('dark'));
  });

  it('usa o padrão sem quebrar quando a leitura falha', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage indisponível'));

    await renderProbe();

    await waitFor(() => expect(screen.getByTestId('preference')).toHaveTextContent('system'));
  });
});
