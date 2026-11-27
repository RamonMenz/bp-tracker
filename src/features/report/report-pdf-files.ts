// API legada do expo-file-system (subcaminho no SDK 57), a mesma de src/lib/file.native.ts.
import * as FileSystem from 'expo-file-system/legacy';

import { logError } from '@/lib/logger';

/**
 * Ciclo de vida do PDF temporário do Android (spec-relatorio-pdf §3.5.3–3.5.5, PDF-17). Só o
 * adaptador nativo e o pipeline do `expo-print` usam este módulo.
 *
 * - O PDF nasce no cache privado do app (`cacheDirectory`), numa pasta por geração:
 *   `aferi-relatorios/<geração>/aferi-relatorio-AAAA-MM-DD_a_AAAA-MM-DD.pdf`. Nunca em
 *   `documentDirectory`; nada é copiado para fora pelo app (a cópia que o usuário salvar pelo
 *   sistema fica com o destino escolhido).
 * - Não compartilhado (cancelar, alterar período, trocar de conta, resultado tardio): apagado na
 *   hora.
 * - Compartilhado: apagado `SHARE_GRACE_MS` depois de a folha de compartilhamento fechar. O
 *   `shareAsync` do Android resolve quando o seletor fecha — o app de destino pode ainda estar
 *   lendo (ex.: diálogo de upload aberto). Com o app em segundo plano o Android pode adiar o
 *   timer; a remoção então acontece depois, nunca antes.
 * - Resíduos de interrupção (app encerrado no meio): varredura limitada no início da geração
 *   seguinte, só de pastas de geração e de PDFs do `expo-print` mais velhos que
 *   `RESIDUE_MIN_AGE_MS` e que não estejam em uso neste processo.
 *
 * Logs sem caminho, nome de arquivo, valores ou identificadores: só o escopo e um código fixo.
 */

export const REPORT_DIRECTORY_NAME = 'aferi-relatorios';
/** Pasta onde o `printToFileAsync` do Android grava (`cacheDir/Print/<uuid>.pdf`). */
export const PRINT_DIRECTORY_NAME = 'Print';
export const SHARE_GRACE_MS = 5 * 60_000;
export const RESIDUE_MIN_AGE_MS = 30 * 60_000;
/** Teto de entradas examinadas por varredura: a limpeza nunca vira uma operação longa. */
export const MAX_SWEEP_ENTRIES = 20;

const GENERATION_NAME = /^\d{13}-[a-z0-9]{6,}$/;
const PRINT_OUTPUT_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i;
const REPORT_FILE_NAME = /^aferi-relatorio-\d{4}-\d{2}-\d{2}_a_\d{4}-\d{2}-\d{2}\.pdf$/;

/** Arquivos em uso neste processo (prontos para revisão, em compartilhamento ou na carência). */
const inUse = new Set<string>();

class ReportFileError extends Error {
  constructor(code: string) {
    super(code);
    this.name = 'ReportFileError';
  }
}

function cacheRoot(): string {
  const cache = FileSystem.cacheDirectory;

  if (cache === null) {
    throw new ReportFileError('report-cache-unavailable');
  }

  return cache.endsWith('/') ? cache : `${cache}/`;
}

function reportRoot(): string {
  return `${cacheRoot()}${REPORT_DIRECTORY_NAME}/`;
}

/** Pasta de geração do arquivo, só se ele estiver mesmo dentro de `aferi-relatorios/`. */
function generationDirectoryOf(uri: string): string | null {
  const root = reportRoot();

  if (!uri.startsWith(root)) {
    return null;
  }

  const [generation, fileName, ...rest] = uri.slice(root.length).split('/');
  return rest.length === 0 && GENERATION_NAME.test(generation) && REPORT_FILE_NAME.test(fileName ?? '')
    ? `${root}${generation}/`
    : null;
}

/**
 * Move o PDF recém-gerado pelo `expo-print` (nome aleatório em `cache/Print/`) para uma pasta de
 * geração própria, com o nome sem identificador pessoal que o destino do compartilhamento mostra.
 * Se algo falhar, o arquivo original é apagado: não fica cópia clínica órfã.
 */
export async function adoptPrintedFile(printedUri: string, fileName: string): Promise<string> {
  if (!REPORT_FILE_NAME.test(fileName)) {
    await deleteQuietly(printedUri);
    throw new ReportFileError('report-file-name-invalid');
  }

  const generation = `${Date.now()}-${Math.random().toString(36).slice(2, 10).padEnd(6, '0')}`;
  const directory = `${reportRoot()}${generation}/`;
  const target = `${directory}${fileName}`;

  try {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    await FileSystem.moveAsync({ from: printedUri, to: target });
  } catch {
    await deleteQuietly(printedUri);
    await deleteQuietly(directory);
    throw new ReportFileError('report-file-move-failed');
  }

  inUse.add(target);
  return target;
}

async function deleteQuietly(uri: string): Promise<boolean> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    return true;
  } catch {
    logError('report.cleanup', new Error('report-cleanup-failed'));
    return false;
  }
}

/** Apaga o PDF e a pasta da geração. Fora de `aferi-relatorios/`, não apaga nada. */
export async function removeReportFile(uri: string): Promise<void> {
  const directory = generationDirectoryOf(uri);
  inUse.delete(uri);

  if (directory === null) {
    logError('report.cleanup', new Error('report-cleanup-outside-directory'));
    return;
  }

  await deleteQuietly(directory);
}

/**
 * Agenda a remoção. O arquivo continua marcado como em uso até ser apagado, para a varredura
 * não o alcançar durante a carência.
 */
export function scheduleReportFileRemoval(uri: string, delayMs: number): void {
  setTimeout(() => {
    void removeReportFile(uri);
  }, delayMs);
}

function isOldEnough(modificationTimeSeconds: number | undefined, now: number): boolean {
  return modificationTimeSeconds !== undefined && now - modificationTimeSeconds * 1000 >= RESIDUE_MIN_AGE_MS;
}

/**
 * Varredura limitada de resíduos de interrupção. Examina no máximo `MAX_SWEEP_ENTRIES` entradas e
 * só apaga o que reconhece como do relatório: pastas de geração em `aferi-relatorios/` e PDFs com
 * nome de UUID em `Print/` (saída do `expo-print`, usado só pelo relatório). Devolve quantos itens
 * apagou. Falhas não interrompem a geração.
 */
export async function sweepReportResidues(now: number = Date.now()): Promise<number> {
  const candidates: string[] = [];

  async function collect(directory: string, pattern: RegExp, suffix: string): Promise<void> {
    let names: string[];

    try {
      const info = await FileSystem.getInfoAsync(directory);
      if (!info.exists) {
        return;
      }
      names = await FileSystem.readDirectoryAsync(directory);
    } catch {
      logError('report.cleanup', new Error('report-sweep-list-failed'));
      return;
    }

    for (const name of names) {
      if (candidates.length >= MAX_SWEEP_ENTRIES) {
        return;
      }
      if (pattern.test(name)) {
        candidates.push(`${directory}${name}${suffix}`);
      }
    }
  }

  let root: string;
  try {
    root = cacheRoot();
  } catch {
    return 0;
  }

  await collect(`${root}${REPORT_DIRECTORY_NAME}/`, GENERATION_NAME, '/');
  await collect(`${root}${PRINT_DIRECTORY_NAME}/`, PRINT_OUTPUT_NAME, '');

  let removed = 0;

  for (const candidate of candidates) {
    const isActive = [...inUse].some((uri) => uri === candidate || uri.startsWith(candidate));

    if (isActive) {
      continue;
    }

    try {
      const info = await FileSystem.getInfoAsync(candidate);

      if (!info.exists || !isOldEnough(info.modificationTime, now)) {
        continue;
      }
    } catch {
      logError('report.cleanup', new Error('report-sweep-info-failed'));
      continue;
    }

    if (await deleteQuietly(candidate)) {
      removed += 1;
    }
  }

  return removed;
}

/** Só para testes: arquivos marcados como em uso neste processo. */
export function reportFilesInUseForTests(): string[] {
  return [...inUse];
}
