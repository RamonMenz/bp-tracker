const { defineConfig, globalIgnores } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([
  globalIgnores(['node_modules/**', 'android/**', 'ios/**', 'dist/**', 'public/**']),
  expo,
  { settings: { 'import/resolver': { typescript: {
    project: './tsconfig.json',
    extensions: ['.native.ts', '.native.tsx', '.ts', '.tsx', '.js', '.json'],
  } } } },
  { rules: { 'no-console': 'error', 'no-restricted-imports': ['error', {
    patterns: ['firebase', 'firebase/*', '@react-native-firebase/*', '@sentry/*'],
  }] } },
]);
