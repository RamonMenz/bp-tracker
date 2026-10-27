import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import ts from 'typescript';

// Importa módulos puros da spike em memória, sem app/Firebase/motor/captura.
async function loadTypescript(filename, dependencies = {}) {
  const source = await readFile(new URL(filename, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', code)(module, module.exports, name => {
    if (!(name in dependencies)) throw Error('unexpected-dependency');
    return dependencies[name];
  });
  return module.exports;
}
const contracts = await loadTypescript('../src/domain/contracts.ts');
const { Attempt } = await loadTypescript('../src/features/attempt.ts', { '@/domain/contracts': contracts });
const { interpretPhoto, parseOcr } = await loadTypescript('../src/domain/interpret-photo.ts');
const observation = tokens => ({ kind: 'ocr', coordinateSpace: 'upright-frame', capturedAtMs: 1793001600000, tokens });
const token = text => ({ text, confidence: null, box: { x: 0, y: 0, width: 1, height: 1 } });

test('rótulos explícitos; ausentes e números acessórios não são completados', () => {
  const found = interpretPhoto(observation([token('SYS 120'), token('DIA 80'), token('MEM 99')])).fields;
  assert.equal(found.systolic.value, 120); assert.equal(found.diastolic.value, 80);
  assert.equal(found.pulse.status, 'missing');
  assert.equal(found.systolic.basis, 'label');
  assert.equal(interpretPhoto(observation([token('SYS 120 150')])).fields.systolic.reason, 'unreadable');
  assert.equal(interpretPhoto(observation([token('120 80')])).fields.systolic.status, 'missing');
});
test('ambiguidade e valor fora de faixa não são corrigidos silenciosamente', () => {
  assert.equal(interpretPhoto(observation([token('SYS 120'), token('SYS 150')])).fields.systolic.status, 'uncertain');
  assert.equal(interpretPhoto(observation([token('SYS 400')])).fields.systolic.value, 400);
});
test('saída desconhecida, excessiva ou coordenadas inválidas é rejeitada', () => {
  for (const value of [null, observation([token('SYS 120'), { text: 'x', box: {} }]),
    observation(Array(501).fill(token('x'))), { ...observation([]), coordinateSpace: 'raw-frame' },
    observation([{ ...token('SYS 120'), confidence: 2 }])]) {
    assert.throws(() => parseOcr(value));
  }
  assert.equal(parseOcr(observation([token('SYS 120')])).tokens.length, 1);
});
test('cancelamento libera recursos existentes e os obtidos tardiamente uma vez', () => {
  const scope = new Attempt(); let released = 0;
  scope.own(() => released++); scope.cancel(); scope.cancel(); scope.own(() => released++);
  assert.equal(released, 2); assert.throws(() => scope.check(), { code: 'cancelled' });
});
test('resultado tardio e timeout não viram sucesso', async () => {
  const scope = new Attempt(); let complete;
  const waiting = scope.wait(new Promise(resolve => { complete = resolve; }), 1000);
  scope.cancel(); complete('sentinela-sintetica');
  await assert.rejects(waiting, { code: 'cancelled' });
  const timeout = new Attempt(); let disposed = false; timeout.own(() => { disposed = true; });
  await assert.rejects(timeout.wait(new Promise(() => {}), 5), { code: 'timeout' });
  assert.equal(disposed, true);
});
test('erro do fornecedor perde mensagem/cause; erros seguros mantêm códigos', async () => {
  const scope = new Attempt();
  await assert.rejects(scope.wait(Promise.reject(new Error('SENTINELA-CONTEUDO')), 100), error =>
    error.code === 'engine-failed' && !error.message.includes('SENTINELA') && error.cause === undefined);
  await assert.rejects(scope.wait(Promise.reject(new contracts.PocError('model-missing')), 100), { code: 'model-missing' });
});
test('entrada da spike não contém persistência, coletores ou fallback remoto', async () => {
  const directory = resolve(import.meta.dirname, '../src');
  async function scan(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) await scan(file);
      else {
        const content = await readFile(file, 'utf8');
        assert.doesNotMatch(content, /from ['"](?:firebase|@react-native-firebase|@sentry)|\b(?:addDoc|setDoc|updateDoc|localStorage|indexedDB|MediaRecorder)\s*\(/, file);
        assert.doesNotMatch(content, /console\.(?:log|error|warn)\s*\(/, file);
      }
    }
  }
  await scan(directory);
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(pkg.dependencies).some(name => /firebase|sentry|speech-recognition/i.test(name)), false);
  const nativeDir = new URL('../modules/aferi-local-recognition/android/src/main/java/expo/modules/aferilocal/', import.meta.url);
  for (const filename of await readdir(nativeDir)) {
    const content = await readFile(new URL(filename, nativeDir), 'utf8');
    assert.doesNotMatch(content, /FileOutputStream|\bImageCapture\b|\bcreateSpeechRecognizer\s*\(|\bLog\.[deiwv]\s*\(/, filename);
  }
});
