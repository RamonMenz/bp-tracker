/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  transform: {
    // ts-jest emite o aviso TS151002 pedindo isolatedModules para o par module/moduleResolution
    // "Node16" do tsconfig — mas isolatedModules desligaria a checagem de tipo real do arquivo de
    // teste (viraria transpile puro), e nada mais no projeto rodaria `tsc` sobre
    // src/**/*.test.ts (o build exclui testes de propósito, ver tsconfig.json). O aviso é sobre
    // uma ambiguidade CJS/ESM que não se aplica aqui — o projeto não declara "type": "module" —
    // por isso é silenciado em vez de aceito às custas da checagem de tipo.
    '^.+\\.ts$': ['ts-jest', { diagnostics: { ignoreCodes: [151002] } }],
  },
};
