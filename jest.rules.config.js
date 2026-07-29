// Suíte à parte de jest.config.js: tests/firestore.rules.test.ts precisa do emulador do
// Firestore rodando (porta 8080) — por isso não entra no `npm test` (que deve rodar sem infra
// externa) e ganha o script dedicado `npm run test:rules`, que sobe o emulador via
// `firebase emulators:exec` (CLAUDE.md §4.6).
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
};
