// Guarda: o decodificador de sete segmentos é CANDIDATO e NÃO está habilitado no produto. Este teste
// falha se qualquer arquivo de app/ ou native-modules/ importar src/domain/seven-segment
// (aguarda decisão da orientadora: P02/P106/P048; docs/fotografia-lab.md).
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '..', '..', '..');
const SKIP = new Set(['node_modules', 'build', '.gradle', '.cxx', '.expo', 'dist']);
const SOURCE = /\.(?:[cm]?[jt]sx?|kt|java)$/;
const IMPORT = /seven-segment/;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return SOURCE.test(name) ? [path] : [];
  });
}

test.each(['app', 'native-modules'])('nenhum arquivo de %s/ referencia src/domain/seven-segment', folder => {
  const offenders = sources(join(ROOT, folder))
    .filter(path => IMPORT.test(readFileSync(path, 'utf8')))
    .map(path => relative(ROOT, path));
  expect(offenders).toEqual([]);
});

test('a guarda enxerga os arquivos que deve vigiar', () => {
  expect(sources(join(ROOT, 'app')).length).toBeGreaterThan(0);
  expect(sources(join(ROOT, 'native-modules')).length).toBeGreaterThan(0);
});
