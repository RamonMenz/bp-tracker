const assert = require('node:assert/strict');
const isVoice = process.argv[2] === '--voice';
const project = isVoice ? 'voice' : 'capture';
const withDisabledNetworkInspector = require(`../../demos/android-${project}/plugins/with-disabled-network-inspector`);
const source = require(`../../demos/android-${project}/app.json`).expo;

async function main() {
  if (isVoice) {
    assert(source.plugins.includes('./plugins/with-disabled-network-inspector.js'));
    assert.throws(() => withDisabledNetworkInspector({ ...source, android: { ...source.android, allowBackup: true } }), /voice-network-config-mismatch/);
  }
  const config = withDisabledNetworkInspector(structuredClone(source));
  const preserved = [{ type: 'comment', value: 'Static fixture' }, { type: 'property', key: 'unrelated', value: 'kept' }];
  const mod = config.mods.android.gradleProperties;
  const input = [...structuredClone(preserved),
    { type: 'property', key: 'EX_DEV_CLIENT_NETWORK_INSPECTOR', value: 'true' },
    { type: 'property', key: 'EX_DEV_CLIENT_NETWORK_INSPECTOR', value: 'true' }];
  const result = await mod({ ...config, modResults: input, modRequest: { platform: 'android', introspect: false } });
  const expected = [...preserved, { type: 'property', key: 'EX_DEV_CLIENT_NETWORK_INSPECTOR', value: 'false' }];
  assert.deepEqual(result.modResults, expected);
  const repeated = await mod({ ...config, modResults: result.modResults, modRequest: { platform: 'android', introspect: false } });
  assert.deepEqual(repeated.modResults, expected);
  assert.throws(() => withDisabledNetworkInspector({ ...source, android: { package: 'other.package' } }), new RegExp(`${project}-network-config-mismatch`));
  process.stdout.write('Network inspector: real Expo mod disables duplicate/default flags, preserves other properties and rejects another package. No APK/device/SDK telemetry test.\n');
}
main().catch(() => { process.stderr.write('network-inspector-check-failed\n'); process.exitCode = 1; });
