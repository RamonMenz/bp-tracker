// Lê o arquivo gerado por `eas env:pull` e, SEM imprimir nenhum valor:
//   1. emite `::add-mask::` para cada valor (o GitHub passa a trocá-lo por *** no log inteiro);
//   2. lista só os NOMES, separando o que o Metro embute no APK (EXPO_PUBLIC_*) do resto;
//   3. avisa se houver debug token do App Check no ambiente.
// Uso: node tools/eas/env-names.cjs <arquivo.env>
const { readFileSync, appendFileSync } = require('node:fs');

const DEBUG_TOKEN = 'EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN';
// "true", "1" etc. não identificam nada e, mascarados, apagariam palavras comuns do log.
const MIN_MASK_LENGTH = 6;

const file = process.argv[2];
if (!file) {
  process.stderr.write('Uso: node tools/eas/env-names.cjs <arquivo.env>\n');
  process.exit(2);
}

const publicNames = [];
const otherNames = [];
const secretNames = [];

for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
  const line = rawLine.trim();
  // `eas env:pull` escreve as de visibilidade "secret" como comentário: `# NOME=***** (secret)`.
  const secret = /^#\s*([A-Za-z_][A-Za-z0-9_]*)=\*+ \(secret\)$/.exec(line);
  if (secret) {
    secretNames.push(secret[1]);
    continue;
  }
  if (line === '' || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq <= 0) continue;
  const name = line.slice(0, eq).trim();
  let value = line.slice(eq + 1).trim();
  if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
  if (value.length >= MIN_MASK_LENGTH) process.stdout.write(`::add-mask::${value}\n`);
  (name.startsWith('EXPO_PUBLIC_') ? publicNames : otherNames).push({ name, isEmpty: value === '' });
}

const fmt = (list) => (list.length === 0 ? '  (nenhuma)' : list.map((v) => `  - ${v.name}${v.isEmpty ? ' (vazia)' : ''}`).join('\n'));

process.stdout.write(
  [
    'Variáveis do ambiente "development" da EAS (somente NOMES):',
    'EXPO_PUBLIC_* — o Metro as embute no JavaScript do APK (qualquer pessoa com o APK pode lê-las):',
    fmt(publicNames),
    'Outras (não vão para o JavaScript; podem ir para a config nativa, ex.: GOOGLE_SERVICES_JSON):',
    fmt(otherNames),
    'Visibilidade "secret" (não saem dos servidores da EAS; só o builder as vê):',
    secretNames.length === 0 ? '  (nenhuma)' : secretNames.map((n) => `  - ${n}`).join('\n'),
    '',
  ].join('\n'),
);

const hasDebugToken = publicNames.some((v) => v.name === DEBUG_TOKEN && !v.isEmpty) || secretNames.includes(DEBUG_TOKEN);
if (hasDebugToken) {
  process.stdout.write(
    `::warning::${DEBUG_TOKEN} está definida no ambiente "development" da EAS. O código só a lê dentro de if (__DEV__), ` +
      'removido no build release; o passo de inspeção do APK confere se o valor ficou fora do bundle. Ainda assim, ' +
      'é credencial: o recomendado é tirá-la da EAS e mantê-la só no .env.local do computador.\n',
  );
}
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `has_debug_token=${hasDebugToken}\n`);
}
