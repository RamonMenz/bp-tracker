import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_THEME_PREFERENCE,
  THEME_PREFERENCE_KEY,
  readThemePreference,
  writeThemePreference,
} from './theme-preference.storage';

jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));

const { logError } = jest.requireMock('@/lib/logger') as { logError: jest.Mock };

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('readThemePreference', () => {
  it('devolve a preferência gravada', async () => {
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, 'dark');

    await expect(readThemePreference()).resolves.toBe('dark');
  });

  it("devolve 'system' quando nunca houve escolha", async () => {
    await expect(readThemePreference()).resolves.toBe(DEFAULT_THEME_PREFERENCE);
    expect(DEFAULT_THEME_PREFERENCE).toBe('system');
  });

  /**
   * O AsyncStorage devolve `string`, não `ThemePreference` — o valor pode ser lixo de uma versão
   * anterior do app ou de outra origem no mesmo domínio (web). Sem a validação, esse lixo chegaria
   * ao `colorScheme.set` do NativeWind.
   */
  it('descarta valor inválido gravado e cai no padrão', async () => {
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, 'roxo');

    await expect(readThemePreference()).resolves.toBe('system');
  });

  // CLAUDE.md §4.3: falha de leitura não trava a tela — vira fallback silencioso e log.
  it('cai no padrão e loga quando o AsyncStorage falha', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage indisponível'));

    await expect(readThemePreference()).resolves.toBe('system');
    expect(logError).toHaveBeenCalledWith('theme.readPreference', expect.any(Error));
  });
});

describe('writeThemePreference', () => {
  it('grava a preferência escolhida', async () => {
    await writeThemePreference('light');

    await expect(AsyncStorage.getItem(THEME_PREFERENCE_KEY)).resolves.toBe('light');
  });

  // Não rejeita: quem chama (useThemePreference) já aplicou o tema na tela e não tem o que fazer
  // com um erro aqui além de registrar.
  it('não rejeita quando o AsyncStorage falha', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disco cheio'));

    await expect(writeThemePreference('dark')).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalledWith('theme.writePreference', expect.any(Error));
  });
});
