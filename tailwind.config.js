const { colors } = require('./src/theme/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // 'class' em vez do padrão 'media': com 'media' as classes `dark:` só respondem ao
  // prefers-color-scheme do SO e ignoram qualquer estado JS — o NativeWind chega a lançar
  // "Cannot manually set color scheme, as dark mode is type 'media'" ao tentar forçar o esquema.
  // A preferência manual de tema (src/features/theme) depende desta linha para existir.
  darkMode: 'class',
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
