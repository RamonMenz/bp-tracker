// require, e não import: tailwind.config.js é CommonJS (`module.exports`) e fica fora do `include`
// do tsconfig — um import ESM dele não resolveria tipo nenhum.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwindConfig = require('../../tailwind.config.js') as { darkMode?: unknown };

/**
 * Este teste existe porque a quebra correspondente é silenciosa no CI e barulhenta no aparelho.
 *
 * Com o padrão do NativeWind (`darkMode: 'media'`), as classes `dark:` só respondem ao
 * prefers-color-scheme do SO e ignoram qualquer estado JS — e `colorScheme.set` passa a LANÇAR
 * ("Cannot manually set color scheme, as dark mode is type 'media'"). Ou seja: remover esta linha
 * do tailwind.config.js não quebra nenhum outro teste, não quebra o build, e só aparece quando
 * alguém troca o tema no app de verdade.
 */
it("mantém darkMode: 'class' — a preferência manual de tema depende disso", () => {
  expect(tailwindConfig.darkMode).toBe('class');
});
