const { colors } = require('./src/theme/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Duas paletas nomeadas em vez de uma só: o par `bg-light-surface dark:bg-dark-surface`
      // mantém os dois valores explícitos no JSX, sem depender de CSS vars/global.css.
      colors: {
        light: colors.light,
        dark: colors.dark,
      },
    },
  },
  plugins: [],
};
