/**
 * @jest-environment node
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * PDF-01 — guarda contra regressão do carregamento sob demanda: o jsPDF/AutoTable e o pipeline do
 * relatório só podem entrar no app por `import()` dinâmico, a partir dos módulos previstos. Um
 * `import ... from 'jspdf'` estático em qualquer módulo do app faria o Metro colocar a biblioteca
 * no bundle inicial (e no Android). A prova em runtime é tools/pdf-relatorio/browser-check.cjs.
 */

const ROOT = join(__dirname, '..', '..', '..');
const SOURCE_DIRS = ['app', 'src'];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const fullPath = join(directory, name);

    if (statSync(fullPath).isDirectory()) {
      return name === '__testutils__' ? [] : sourceFiles(fullPath);
    }

    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [fullPath] : [];
  });
}

const FILES = SOURCE_DIRS.flatMap((directory) => sourceFiles(join(ROOT, directory))).map((file) => ({
  path: relative(ROOT, file).split('\\').join('/'),
  source: readFileSync(file, 'utf8'),
}));

const STATIC_IMPORT = (specifier: string) =>
  new RegExp(`(?:from\\s+|require\\()\\s*['"]${specifier}['"]|^\\s*import\\s+['"]${specifier}['"]`, 'm');
const DYNAMIC_IMPORT = (specifier: string) => new RegExp(`import\\(\\s*['"]${specifier}['"]\\s*\\)`);

describe('carregamento sob demanda do relatório PDF (PDF-01)', () => {
  it('a varredura enxerga o código do app (sanidade)', () => {
    expect(FILES.some((file) => file.path === 'app/(app)/history.tsx')).toBe(true);
    expect(FILES.some((file) => file.path === 'src/features/report/render-report-pdf.ts')).toBe(true);
  });

  it.each(['jspdf', 'jspdf-autotable'])('nenhum módulo do app importa %s de forma estática', (library) => {
    expect(FILES.filter((file) => STATIC_IMPORT(library).test(file.source)).map((file) => file.path)).toEqual([]);
  });

  it.each(['jspdf', 'jspdf-autotable'])('%s só é carregado por import() dinâmico no renderizador', (library) => {
    expect(FILES.filter((file) => DYNAMIC_IMPORT(library).test(file.source)).map((file) => file.path)).toEqual([
      'src/features/report/render-report-pdf.ts',
    ]);
  });

  it('o pipeline (e o renderizador que ele traz) só é alcançado por import() no adaptador Web', () => {
    const staticUsers = FILES.filter(
      (file) => STATIC_IMPORT('./report-pdf-pipeline').test(file.source) || STATIC_IMPORT('@/features/report/report-pdf-pipeline').test(file.source),
    );
    const dynamicUsers = FILES.filter((file) => DYNAMIC_IMPORT('./report-pdf-pipeline').test(file.source));
    const rendererUsers = FILES.filter(
      (file) =>
        file.path !== 'src/features/report/report-pdf-pipeline.ts' &&
        (STATIC_IMPORT('./render-report-pdf').test(file.source) || STATIC_IMPORT('@/features/report/render-report-pdf').test(file.source)),
    );

    expect(staticUsers.map((file) => file.path)).toEqual([]);
    expect(dynamicUsers.map((file) => file.path)).toEqual(['src/features/report/report-pdf-platform.web.ts']);
    expect(rendererUsers.map((file) => file.path)).toEqual([]);
  });

  it('o adaptador nativo não referencia pipeline, renderizador nem jsPDF (bundle Android limpo)', () => {
    const native = FILES.find((file) => file.path === 'src/features/report/report-pdf-platform.native.ts');

    expect(native?.source).not.toMatch(/report-pdf-pipeline|render-report-pdf|jspdf/);
  });
});
