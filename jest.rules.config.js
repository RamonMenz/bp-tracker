// Suíte à parte de jest.config.js: tests/firestore.rules.test.ts precisa do emulador do
// Firestore rodando (porta 8080) — por isso não entra no `npm test` (que deve rodar sem infra
// externa) e ganha o script dedicado `npm run test:rules`, que sobe o emulador via
// `firebase emulators:exec` (CLAUDE.md §4.6).
//
// ⚠️ NÃO use `preset: 'jest-expo'` aqui, nem "padronize" com o jest.config.js. O setup do
// jest-expo/react-native substitui o `fetch` global por stubs, e o @firebase/rules-unit-testing
// usa `fetch` para falar com o hub do emulador. O sintoma é todos os testes falhando com
// "HTTP Error undefined when attempting to reach Emulator Hub at undefined" — mesmo com as
// rules corretas. Por isso a transformação é feita direto com babel-jest + babel-preset-expo.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  transformIgnorePatterns: ['/node_modules/(?!(firebase|@firebase)/)'],
};
