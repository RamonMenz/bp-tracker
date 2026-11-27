// Traz para o log do GitHub o log completo de um build da EAS, que `eas build --wait` não mostra
// (no CI ele só acompanha o status). Entrada: o JSON de `eas build:view <id> --json`.
// Saída: o log por fase, um resumo das linhas de erro ao final e, em $GITHUB_OUTPUT, status e
// URL da página do build. A URL do artefato vai SÓ para <dir>/apk-url.txt — nunca para
// $GITHUB_OUTPUT nem `env:` de passo, que o GitHub imprime no cabeçalho de cada passo.
// As mensagens do log também são gravadas em <dir>/eas-build.log, para o resumo final.
// Uso: node tools/eas/build-report.cjs <build.json> <dir>
const { readFileSync, appendFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { Buffer } = require('node:buffer');
const { gunzipSync } = require('node:zlib');

const ERROR_PATTERN = /(error|failed|failure|exception|what went wrong|e: file:|unresolved reference|\bcause\b)/i;
const MAX_ERROR_LINES = 120;

function pageUrl(build) {
  const account = build.app?.ownerAccount?.name;
  const slug = build.app?.slug;
  return account && slug ? `https://expo.dev/accounts/${account}/projects/${slug}/builds/${build.id}` : '';
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return (bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes).toString('utf8');
}

// Os arquivos de log da EAS são JSON por linha ({ msg, phase, ... }); aceita texto puro também.
function parseLines(text) {
  return text.split(/\r?\n/).filter(Boolean).map((line) => {
    try {
      const entry = JSON.parse(line);
      return { phase: entry.phase ?? entry.marker ?? '', msg: String(entry.msg ?? '') };
    } catch {
      return { phase: '', msg: line };
    }
  });
}

async function main() {
  const file = process.argv[2];
  const outDir = process.argv[3];
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  const build = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!build?.id) throw new Error('JSON sem build');

  const url = pageUrl(build);
  const lines = [];
  const logFiles = Array.isArray(build.logFiles) ? build.logFiles : [];
  for (const [index, logUrl] of logFiles.entries()) {
    try {
      lines.push(...parseLines(await download(logUrl)));
    } catch (error) {
      // A URL é assinada: não é impressa. Só o índice e o motivo.
      process.stdout.write(`::warning::Não foi possível baixar o arquivo de log ${index + 1}/${logFiles.length}: ${error.message}\n`);
    }
  }

  let currentPhase = null;
  for (const { phase, msg } of lines) {
    if (phase && phase !== currentPhase) {
      if (currentPhase !== null) process.stdout.write('::endgroup::\n');
      process.stdout.write(`::group::Fase EAS: ${phase}\n`);
      currentPhase = phase;
    }
    process.stdout.write(`${msg}\n`);
  }
  if (currentPhase !== null) process.stdout.write('::endgroup::\n');
  if (outDir) {
    writeFileSync(path.join(outDir, 'eas-build.log'), lines.map(({ phase, msg }) => `[${phase}] ${msg}`).join('\n'));
    writeFileSync(path.join(outDir, 'apk-url.txt'), build.artifacts?.applicationArchiveUrl ?? build.artifacts?.buildUrl ?? '');
  }

  const errorLines = lines.filter(({ msg }) => ERROR_PATTERN.test(msg)).slice(-MAX_ERROR_LINES);
  process.stdout.write('\n===== Resumo do build EAS =====\n');
  process.stdout.write(`ID: ${build.id}\nPerfil: ${build.buildProfile ?? '?'}\nStatus: ${build.status}\n`);
  if (build.error) process.stdout.write(`Erro (EAS): [${build.error.errorCode ?? '?'}] ${build.error.message ?? ''}\n`);
  process.stdout.write(`Linhas de log baixadas: ${lines.length}\n`);
  if (build.status !== 'FINISHED' && errorLines.length > 0) {
    process.stdout.write(`\n----- Últimas ${errorLines.length} linhas com indício de erro -----\n`);
    for (const { phase, msg } of errorLines) process.stdout.write(`[${phase}] ${msg}\n`);
  }
  process.stdout.write(`\nPágina do build: ${url}\n`);

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `status=${build.status}\npage_url=${url}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Build EAS \`${build.buildProfile ?? ''}\`: ${build.status}\n\n[Página do build](${url})\n`);
  }
}

main().catch((error) => {
  process.stdout.write(`::error::Falha ao montar o relatório do build: ${error.message}\n`);
  process.exit(1);
});
