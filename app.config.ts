import type { ConfigContext, ExpoConfig } from 'expo/config';

// Config pública por design — o que protege os dados são as Security Rules + App Check, não esconder a apiKey; o `.env.local` segue gitignored só para não fixar no repositório a qual projeto Firebase (dev/prod) cada ambiente aponta.
type FirebaseExtra = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId: string;
  /** Só é usada pelo FCM na web; no Android o token vem do google-services.json. */
  vapidKey: string | undefined;
};

const ENV_HINT =
  'Copie .env.example para .env.local e preencha com os valores do seu projeto Firebase.';

function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(`Variável de ambiente ausente: ${name}. ${ENV_HINT}`);
  }

  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];

  return value === undefined || value.trim() === '' ? undefined : value;
}

const firebase: FirebaseExtra = {
  apiKey: requireEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: requireEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  appId: requireEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
  messagingSenderId: requireEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  vapidKey: optionalEnv('EXPO_PUBLIC_FIREBASE_VAPID_KEY'),
};

// OAuth Web Client ID do mesmo projeto Firebase — @react-native-google-signin usa esse valor
// (não o Android client ID) para obter o idToken trocado por credencial no signInWithCredential.
const googleWebClientId = requireEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');

// Site key do reCAPTCHA Enterprise (App Check na web). Pública por design, igual à config do
// Firebase. Opcional enquanto o App Check não estiver configurado no Console — sem ela o
// initAppCheck apenas não inicializa, e com enforcement desligado o app segue funcionando.
//
// O DEBUG TOKEN do App Check deliberadamente NÃO entra aqui: `extra` é embutido no manifesto de
// qualquer build, inclusive produção. Ele é lido de process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN
// dentro de um bloco `if (__DEV__)`, que o Metro elimina no build de produção.
const appCheck = {
  recaptchaSiteKey: optionalEnv('EXPO_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY'),
};

// DSN do Sentry (coletor de erro em produção na web — ver src/services/crashReporter.web.ts).
// Pública por design, igual à config do Firebase: ela existe para ir no bundle client-side, é só o
// endereço do projeto para onde o relatório é enviado, não uma credencial. Opcional enquanto o
// projeto no sentry.io não existir — sem ela o adapter apenas não inicializa (registra um aviso
// único e vira no-op), e o app segue funcionando normalmente.
const sentry = {
  dsn: optionalEnv('EXPO_PUBLIC_SENTRY_DSN'),
};

// `export default` aqui é exigido pelo Expo para app.config.ts — é a exceção à regra de exports nomeados.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'BP Tracker',
  slug: 'bp-tracker',
  scheme: 'bptracker',
  icon: './assets/icon.png',
  // Config plugins do @react-native-firebase: sem eles o Crashlytics entra no bundle JS mas o
  // módulo nativo nunca é configurado (o plugin do `app` adiciona o gradle do google-services; o
  // do `crashlytics`, o plugin de crash reporting). Um coletor de erro que não inicializa seria o
  // mesmo ponto cego que src/services/crashReporter.native.ts existe para fechar.
  //
  // `expo-notifications` precisa estar aqui também: é o plugin que declara `POST_NOTIFICATIONS`
  // no AndroidManifest (obrigatória a partir do Android 13) — sem ela, `requestPermissionsAsync`
  // nunca mostra o popup nativo, só nega em silêncio (é exatamente o sintoma que motivou este
  // comentário: "permissão negada" sem diálogo nenhum na tela).
  plugins: ['@react-native-firebase/app', '@react-native-firebase/crashlytics', 'expo-notifications'],
  android: {
    // Não pode mudar depois de publicado na Play Store.
    package: 'com.ramonmenz.bptracker',
    // Caminho, não credencial: o arquivo em si é gitignored (CLAUDE.md §4.4) e precisa ser baixado
    // do Firebase Console antes do primeiro build. Sem ele o prebuild falha com mensagem explícita
    // — preferível a gerar um build sem Crashlytics configurado, em silêncio.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      // blue-600 — mesma cor primária de src/theme/colors.ts (era um teal de placeholder antes
      // da arte final do ícone).
      backgroundColor: '#2563EB',
    },
  },
  ios: {
    bundleIdentifier: 'com.ramonmenz.bptracker',
    googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist',
  },
  web: {
    // 'single' (SPA) é o padrão quando web.output não é declarado — explicitado aqui porque é
    // o que torna válido o rewrite catch-all para /index.html no vercel.json.
    output: 'single',
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  extra: {
    ...config.extra,
    firebase,
    googleWebClientId,
    appCheck,
    sentry,
    // Gerado por `eas build:configure` (config dinâmica não aceita escrita automática do eas-cli
    // — precisa entrar aqui manualmente). Liga este projeto ao projeto EAS
    // @ramoncode/bp-tracker; sem isso `eas build`/`eas init` não sabem para onde enviar o build.
    eas: {
      projectId: '19964a88-fc2d-4c83-a298-0c0f7396f105',
    },
  },
});
