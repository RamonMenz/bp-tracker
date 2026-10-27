// Executar com servidor estático :8095 e Chromium CDP :9222 já iniciados.
// OCR REAL sobre canvas sintético. Não representa câmera física ou voz pt-BR.
import assert from 'node:assert/strict';

const pages = await (await fetch('http://localhost:9222/json')).json();
const socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => { socket.onopen = resolve; });
let sequence = 0;
const pending = new Map();
const requests = [];
const consoleKinds = [];
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
  if (message.method === 'Network.requestWillBeSent') {
    const request = message.params.request;
    requests.push({ origin: new URL(request.url).origin, method: request.method });
  }
  // Nunca imprime argumentos da console ou conteúdo de exceções.
  if (message.method === 'Runtime.consoleAPICalled') consoleKinds.push(message.params.type);
  if (message.method === 'Target.attachedToTarget' && message.params.targetInfo.type === 'worker') {
    void command('Network.enable', {}, message.params.sessionId);
    void command('Runtime.enable', {}, message.params.sessionId);
  }
};
async function command(method, params = {}, sessionId) {
  const id = ++sequence;
  const result = new Promise(resolve => pending.set(id, resolve));
  socket.send(JSON.stringify({ id, method, params, sessionId }));
  return result;
}
async function evaluate(expression) {
  const response = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  assert.equal(Boolean(response.result.exceptionDetails), false, 'exception-in-runtime');
  return response.result.result.value;
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const click = label => evaluate(`Array.from(document.querySelectorAll('[role="button"]')).find(x=>x.textContent===${JSON.stringify(label)})?.click()`);
async function until(expression) {
  for (let index = 0; index < 120; index++) { if (await evaluate(expression)) return; await pause(250); }
  throw Error('condition-timeout');
}
try {
  await command('Network.enable'); await command('Runtime.enable');
  await command('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  await command('Page.navigate', { url: 'http://localhost:8095' });
  await until(`document.body.innerText.includes('PoC fotografia')`);
  await click('PoC fotografia'); await until(`document.body.innerText.includes('Testar OCR com cartão')`);
  await click('Testar OCR com cartão sintético (sem câmera)');
  await until(`document.body.innerText.includes('Resultado temporário.')`);
  const candidatesMatch = await evaluate(`['Sistólica: 120','Diastólica: 80','Pulso: 72'].every(x=>document.body.innerText.includes(x))`);
  assert.equal(candidatesMatch, true);
  const metrics = await evaluate(`document.body.innerText.match(/Inicialização:[^\\n]*/)?.[0]`);
  await click('Cancelar e descartar resultado');
  assert.equal(await evaluate(`document.body.innerText.includes('Sistólica:')`), false);
  await command('Browser.setPermission', { permission: { name: 'camera' }, setting: 'denied', origin: 'http://localhost:8095' });
  await click('Iniciar câmera');
  await until(`document.body.innerText.includes('Permissão negada') || document.body.innerText.includes('Câmera ou microfone indisponível')`);
  const cameraOutcome = await evaluate(`document.body.innerText.includes('Permissão negada')?'permission-denied':'device-unavailable'`);
  const storage = await evaluate(`(async()=>({indexedDbDatabases:(await indexedDB.databases()).length,caches:(await caches.keys()).length,serviceWorkers:(await navigator.serviceWorker.getRegistrations()).length}))()`);
  assert.equal(storage.indexedDbDatabases, 0); assert.equal(storage.caches, 0);
  // Cancelamento durante criação/carregamento; callbacks antigos não restauram resultado.
  await click('Testar OCR com cartão sintético (sem câmera)'); await click('Cancelar e descartar resultado');
  await pause(1000);
  assert.equal(await evaluate(`document.body.innerText.includes('Sistólica:')`), false);
  await click('Encerrar tentativa e voltar às PoCs'); await click('PoC voz local');
  await until(`document.body.innerText.includes('Iniciar voz local')`);
  const capabilities = await evaluate(`(()=>{const C=window.SpeechRecognition??window.webkitSpeechRecognition;return {constructor:!!C,available:!!C?.available,local:!!C&&'processLocally' in new C()}})()`);
  capabilities.modelStatus = await evaluate(`(async()=>{const C=window.SpeechRecognition??window.webkitSpeechRecognition;try{return C?.available?await C.available({langs:['pt-BR'],processLocally:true}):'unsupported'}catch{return 'query-failed'}})()`);
  // Só testa a saída negativa automaticamente quando não há API local verificável.
  if (!capabilities.available || !capabilities.local) {
    await click('Iniciar voz local');
    await until(`document.body.innerText.includes('Nenhum serviço remoto será utilizado')`);
  } else if (capabilities.modelStatus !== 'available') {
    await click('Iniciar voz local');
    await until(`document.body.innerText.includes('Modelo local não instalado') || document.body.innerText.includes('Nenhum serviço remoto será utilizado') || document.body.innerText.includes('Não foi possível reconhecer')`);
  }
  const writes = requests.filter(request => !['GET', 'HEAD'].includes(request.method)).length;
  const externalRequests = requests.filter(request => request.origin !== 'http://localhost:8095').length;
  assert.equal(writes, 0); assert.equal(externalRequests, 0);
  assert.equal(consoleKinds.includes('error'), false);
  process.stdout.write(JSON.stringify({ syntheticOcr: 'passed', candidatesMatch, cancelClearsResult: true,
    lateResultDiscarded: true, cameraOutcome, storage, writes, externalRequests, capabilities, metrics, cameraPhysical: 'not-tested',
    localPtBr: 'not-tested', note: 'Poucas amostras sintéticas; não é benchmark ou auditoria de privacidade do dispositivo.' }, null, 2) + '\n');
} finally { socket.close(); }
