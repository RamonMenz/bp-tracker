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

// `export default` aqui é exigido pelo Expo para app.config.ts — é a exceção à regra de exports nomeados.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'BP Tracker',
  slug: 'bp-tracker',
  scheme: 'bptracker',
  extra: {
    ...config.extra,
    firebase,
    googleWebClientId,
    appCheck,
  },
});
