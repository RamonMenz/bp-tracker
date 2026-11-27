/* global __dirname */
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, readdirSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const output = mkdtempSync(path.join(tmpdir(), 'aferi-voice-off-'));
const env = {
  ...process.env,
  EXPO_NO_DOTENV: '1',
  EXPO_NO_TELEMETRY: '1',
  EXPO_OFFLINE: '1',
  EXPO_PUBLIC_FIREBASE_API_KEY: 'fixture-api-key',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-aferi-voice.invalid',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'demo-aferi-voice',
  EXPO_PUBLIC_FIREBASE_APP_ID: '1:1234567890:web:0000000000000000',
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '1234567890-fixture.apps.googleusercontent.com',
};
delete env.EXPO_PUBLIC_WEB_VOICE_ENABLED;

try {
  const result = spawnSync(process.execPath, [
    require.resolve('expo/bin/cli'), 'export', '-p', 'web', '--output-dir', output,
    '--source-maps', 'external', '--max-workers', '2',
  ], { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, 'A exportação Web de produção deve funcionar');

  const files = readdirSync(output, { recursive: true }).filter(file => file.endsWith('.js'));
  const bundles = files.filter(file => file.startsWith(path.join('_expo', 'static', 'js') + path.sep));
  assert.ok(bundles.length > 0, 'A exportação deve gerar os bundles Metro');

  const sources = bundles.flatMap(file => JSON.parse(readFileSync(path.join(output, file + '.map'), 'utf8')).sources);
  assert.ok(sources.some(source => /components\/bp\/ReadingForm\.tsx$/.test(source)), 'O formulário manual deve estar no bundle');
  assert.ok(sources.every(source => !/(VoiceEntry\.web|VoiceRegistration\.web|VoiceReadingReview|useWebVoiceReview|useVoiceReview|web-voice(-capability)?\.web|voice-session|assisted-reading-writer|interpret-voice-pt-br)\.[tj]sx?$/.test(source)),
    'A flag ausente deve excluir os módulos de voz de todos os chunks');

  for (const file of bundles) {
    const code = readFileSync(path.join(output, file), 'utf8');
    assert.doesNotMatch(code, /Registrar por voz|Confirmar e salvar medição|SpeechRecognition|processLocally/,
      'A flag ausente deve excluir a entrada, o reconhecedor local e a confirmação de voz');
  }
  process.stdout.write('VOZ-01: formulário manual no bundle Web e módulos de voz ausentes de todos os chunks.\n');
} finally {
  rmSync(output, { recursive: true, force: true });
}
