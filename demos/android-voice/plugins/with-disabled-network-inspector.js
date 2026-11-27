// Build-time only; Dev Launcher consumes this property before adding OkHttp instrumentation.
const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withDisabledNetworkInspector(config) {
  if (config.android?.package !== 'com.ramonmenz.aferivoicetest' || config.android?.allowBackup !== false) {
    throw new Error('voice-network-config-mismatch');
  }
  return withGradleProperties(config, (mod) => {
    mod.modResults = mod.modResults.filter((entry) =>
      entry.type !== 'property' || entry.key !== 'EX_DEV_CLIENT_NETWORK_INSPECTOR');
    mod.modResults.push({ type: 'property', key: 'EX_DEV_CLIENT_NETWORK_INSPECTOR', value: 'false' });
    return mod;
  });
};
