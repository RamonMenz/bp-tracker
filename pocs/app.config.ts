import type { ExpoConfig } from 'expo/config';

// Aplicativo separado: não importa a configuração Firebase ou plugins do produto.
const config: ExpoConfig = {
  name: 'Aferi — PoCs locais',
  slug: 'aferi-local-pocs',
  version: '0.1.0',
  scheme: 'aferipoc',
  platforms: ['android', 'web'],
  android: {
    package: 'com.ramonmenz.aferipoc',
    permissions: ['android.permission.CAMERA', 'android.permission.RECORD_AUDIO'],
  },
  web: { bundler: 'metro', output: 'single' },
  plugins: ['expo-dev-client'],
};
export default config;
