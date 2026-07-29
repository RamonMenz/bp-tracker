const expoConfig = require('eslint-config-expo/flat');
const { defineConfig, globalIgnores } = require('eslint/config');

module.exports = defineConfig([
  globalIgnores(['dist/**', 'functions/**', 'assets/**', 'ios/**', 'android/**']),
  expoConfig,
  {
    // eslint-config-expo só configura o resolver "node" para import/*, que não conhece o alias
    // @/* nem moduleSuffixes do tsconfig. O resolver "typescript" cobre os dois (e node_modules
    // também), então substitui — não soma a — o resolver node.
    // `extensions` é redundância deliberada com moduleSuffixes do tsconfig.json: esta versão do
    // eslint-import-resolver-typescript não lê moduleSuffixes (usa enhanced-resolve por baixo),
    // então o par nativo/web (ex.: src/lib/file.native.ts, sem file.ts bare) só resolve aqui
    // listando ".native.ts" explicitamente antes de ".ts".
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          extensions: ['.native.ts', '.native.tsx', '.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      },
    },
    rules: {
      // CLAUDE.md §4.5: nenhum console.* fora de src/lib/logger.ts, único ponto autorizado.
      'no-console': 'error',
    },
  },
  {
    files: ['src/lib/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // expo/no-dynamic-env-var protege o inlining estático do Metro em código empacotado — não
    // se aplica aqui: app.config.ts roda em Node puro (expo/eas-cli), nunca passa pelo Metro.
    files: ['app.config.ts'],
    rules: {
      'expo/no-dynamic-env-var': 'off',
    },
  },
  {
    files: ['jest.setup.js'],
    languageOptions: {
      globals: { jest: 'readonly' },
    },
  },
]);
