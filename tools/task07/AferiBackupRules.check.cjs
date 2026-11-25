// Host-only integration with real Expo mods; temporary files are static fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { parseStringPromise } = require('xml2js');
const withNoBackup = require('../../demos/android-capture/plugins/with-no-backup');
const source = require('../../demos/android-capture/app.json').expo;

async function main() {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aferi-backup-check-'));
  try {
    const platformProjectRoot = path.join(projectRoot, 'android');
    const config = withNoBackup(structuredClone(source));
    const modRequest = { projectRoot, platformProjectRoot, platform: 'android', introspect: false };
    const manifest = { manifest: { application: [{ $: {
      'android:name': '.MainApplication', 'android:allowBackup': 'true',
      'android:debuggable': 'true', 'android:usesCleartextTraffic': 'true',
    } }], 'uses-permission': [{ $: { 'android:name': 'android.permission.CAMERA' } }] } };
    const result = await config.mods.android.manifest({ ...config, modRequest, modResults: manifest });
    const app = result.modResults.manifest.application[0].$;
    assert.equal(app['android:allowBackup'], 'false');
    assert.equal(app['android:debuggable'], 'true');
    assert.equal(app['android:usesCleartextTraffic'], 'true');
    assert.deepEqual(manifest.manifest['uses-permission'], [{ $: { 'android:name': 'android.permission.CAMERA' } }]);
    const runResources = () => config.mods.android.dangerous({ ...config, modRequest, modResults: {} });
    await runResources();
    // A repeated prebuild must retain identical resources.
    await runResources();
    const required = ['root', 'file', 'database', 'sharedpref', 'external', 'device_root', 'device_file', 'device_database', 'device_sharedpref'];
    const sections = [];
    for (const [attribute, root] of [['android:fullBackupContent', 'full-backup-content'], ['android:dataExtractionRules', 'data-extraction-rules']]) {
      const name = app[attribute].replace('@xml/', '') + '.xml';
      const parsed = await parseStringPromise(await fs.readFile(path.join(platformProjectRoot, 'app/src/main/res/xml', name), 'utf8'));
      if (root === 'full-backup-content') sections.push(parsed[root]);
      else {
        assert.equal(parsed[root]['cloud-backup'].length, 1);
        assert.equal(parsed[root]['device-transfer'].length, 1);
        sections.push(parsed[root]['cloud-backup'][0], parsed[root]['device-transfer'][0]);
      }
    }
    for (const section of sections) {
      assert.equal(section.include, undefined);
      assert.deepEqual(section.exclude.map((entry) => entry.$.domain).sort(), [...required].sort());
      assert(section.exclude.every((entry) => entry.$.path === '.'));
    }
    assert.throws(() => withNoBackup({ ...source, android: { ...source.android, package: 'other.package' } }), /capture-backup-config-mismatch/);
    assert.throws(() => withNoBackup({ ...source, android: { ...source.android, allowBackup: true } }), /capture-backup-config-mismatch/);
    const reserved = path.join(platformProjectRoot, 'app/src/main/res/xml/aferi_capture_backup_rules.xml');
    await fs.writeFile(reserved, 'unrelated-static-fixture');
    await assert.rejects(runResources(), /capture-backup-resource-conflict/);
    assert.equal(await fs.readFile(reserved, 'utf8'), 'unrelated-static-fixture');
    process.stdout.write('Backup rules: real Expo mods, manifest/resource linkage, CE/DE/external exclusions, repeat and conflict guards passed. No APK/device/backup executed.\n');
  } finally {
    await fs.rm(projectRoot, { recursive: true, force: true });
  }
}
main().catch(() => { process.stderr.write('backup-rules-check-failed\n'); process.exitCode = 1; });
