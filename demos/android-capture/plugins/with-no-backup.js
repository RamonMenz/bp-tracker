/* global __dirname */
// Build-time only: static resources for the isolated evaluation package.
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

const RESOURCES = ['aferi_capture_backup_rules.xml', 'aferi_capture_data_extraction_rules.xml'];

module.exports = function withNoBackup(config) {
  if (config.android?.package !== 'com.ramonmenz.afericapturetest' || config.android?.allowBackup !== false) {
    throw new Error('capture-backup-config-mismatch');
  }
  config = withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    application.$['android:allowBackup'] = 'false';
    application.$['android:fullBackupContent'] = '@xml/aferi_capture_backup_rules';
    application.$['android:dataExtractionRules'] = '@xml/aferi_capture_data_extraction_rules';
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    const target = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/xml');
    // Check both reserved files before writing; never overwrite an unknown resource.
    const resources = await Promise.all(RESOURCES.map(async (name) => {
      const contents = await fs.readFile(path.join(__dirname, 'backup-rules', name), 'utf8');
      try {
        if (await fs.readFile(path.join(target, name), 'utf8') !== contents) {
          throw new Error('capture-backup-resource-conflict');
        }
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      return { name, contents };
    }));
    await fs.mkdir(target, { recursive: true });
    for (const { name, contents } of resources) {
      await fs.writeFile(path.join(target, name), contents, 'utf8');
    }
    return mod;
  }]);
};
