module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/functions/', '<rootDir>/tests/'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  // jest-expo ignora todo node_modules exceto uma lista fixa de pacotes RN/Expo (ver
  // node_modules/jest-expo/jest-preset.js) — firebase/@firebase não está nela, e o SDK modular
  // publica ESM (`export * from ...`) que o require() do CommonJS não entende sem passar pelo
  // babel-jest. Mesma lista do preset + firebase|@firebase, para não perder as exceções que o
  // preset já cobre.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|firebase|@firebase))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  // O preset só mapeia transform pra '\.[jt]sx?$' — @firebase/util publica um .mjs
  // (dist/postinstall.mjs) que fica de fora dessa regex e chega cru (ESM) no require() do Jest.
  transform: {
    '^.+\\.mjs$': 'babel-jest',
  },
};
