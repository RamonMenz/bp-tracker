/* global __dirname */
const path = require('node:path');
const base = require('../../tailwind.config');

module.exports = {
  ...base,
  content: [path.join(__dirname, '../../src/**/*.{ts,tsx}'), path.join(__dirname, 'index.tsx')],
};
