module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/functions/', '<rootDir>/tests/'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  // O padrão de 5 s não basta com o cache de transformação frio (sempre no CI): o primeiro teste
  // de uma suíte de tela paga o Babel dos módulos que só são carregados no primeiro render.
  // history.test.tsx passava de 5 s em todo push; o teste em si leva ~150 ms com o cache quente.
  testTimeout: 20000,
  // jest-expo ignora todo node_modules exceto uma lista fixa de pacotes RN/Expo (ver
  // node_modules/jest-expo/jest-preset.js) — firebase/@firebase não está nela, e o SDK modular
  // publica ESM (`export * from ...`) que o require() do CommonJS não entende sem passar pelo
  // babel-jest. Mesma lista do preset + firebase|@firebase|lucide-react-native, para não perder
  // as exceções que o preset já cobre.
  //
  // lucide-react-native: os ícones são importados pelo subcaminho `/icons/<nome>`, que resolve
  // para .mjs. Sem esta exceção, QUALQUER teste que renderize um componente com ícone falha com
  // "Cannot use import statement outside a module".
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|firebase|@firebase|lucide-react-native))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  // O preset só mapeia transform pra '\.[jt]sx?$' — @firebase/util publica um .mjs
  // (dist/postinstall.mjs) que fica de fora dessa regex e chega cru (ESM) no require() do Jest.
  transform: {
    '^.+\\.mjs$': 'babel-jest',
  },
};
