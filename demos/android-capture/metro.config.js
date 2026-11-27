const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const root = path.resolve(__dirname, '../..');
const config = getDefaultConfig(__dirname);
config.watchFolders = [root];
config.resolver.nodeModulesPaths = [path.join(root, 'node_modules')];
module.exports = withNativeWind(config, {
  input: path.join(root, 'global.css'),
  configPath: path.join(__dirname, '../photo-review/tailwind.config.js'),
});
