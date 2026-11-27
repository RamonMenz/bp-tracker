/* global __dirname */
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, readdirSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const output = mkdtempSync(path.join(tmpdir(), 'aferi-android-voice-off-'));
const env = {
  ...process.env,
  EXPO_NO_DOTENV: '1',
  EXPO_NO_TELEMETRY: '1',
  EXPO_OFFLINE: '1',
  EXPO_PUBLIC_FIREBASE_API_KEY: 'fixture-api-key',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-aferi-voice.invalid',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'demo-aferi-voice',
  EXPO_PUBLIC_FIREBASE_APP_ID: '1:1234567890:android:0000000000000000',
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '1234567890-fixture.apps.googleusercontent.com',
};
delete env.EXPO_PUBLIC_ANDROID_VOICE_ENABLED;

try {
  const result = spawnSync(process.execPath, [
    require.resolve('expo/bin/cli'), 'export', '-p', 'android', '--output-dir', output,
    '--source-maps', 'external', '--no-bytecode', '--max-workers', '2',
  ], { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, 'A exportação Android de produção deve funcionar');

  const metroDir = path.join(output, '_expo', 'static', 'js', 'android');
  const bundles = readdirSync(metroDir, { recursive: true }).filter(file => file.endsWith('.js'));
  assert.ok(bundles.length > 0, 'A exportação deve gerar os bundles Metro');
  const sourceMaps = readdirSync(output, { recursive: true }).filter(file => file.endsWith('.map'));
  assert.equal(sourceMaps.length, bundles.length, 'Cada bundle deve ter um mapa de origem');

  const sources = sourceMaps.flatMap(file => JSON.parse(readFileSync(path.join(output, file), 'utf8')).sources);
  assert.ok(sources.some(source => /components\/bp\/ReadingForm\.tsx$/.test(source)), 'O formulário manual deve estar no bundle');
  const voiceModule = /(?:VoiceEntry\.native|AndroidVoiceRegistration|loadAndroidVoice|VoiceReadingReview|useAndroidVoiceReview|useVoiceReview|useAssistedWriteContext|voice-android\.native|(?:android-)?voice-session|voice-capture-contract|assisted-reading-writer|interpret-voice-pt-br)\.[tj]sx?$/;
  assert.deepEqual(sources.filter(source => voiceModule.test(source)), [],
    'A flag ausente deve excluir os módulos JS de voz de todos os bundles');

  for (const file of bundles) {
    const code = readFileSync(path.join(metroDir, file), 'utf8');
    assert.doesNotMatch(code, /Registrar por voz|Verificar voz local|Confirmar e salvar medição|AferiLocalVoice/,
      'A flag ausente deve excluir a entrada, o binding e a confirmação de voz');
  }
  process.stdout.write('VOZ-01: formulário manual no bundle Android e módulos JS de voz ausentes.\n');
} finally {
  rmSync(output, { recursive: true, force: true });
}
