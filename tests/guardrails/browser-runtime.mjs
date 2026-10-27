// TASK-18: somente dados sintéticos, sem screenshots/áudio/imagens em arquivo.
// Node 24 + Chromium; servidores locais são encerrados ao final. Não carrega o app clínico.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const processes = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket, step = 'startup';
const cdpPort = Number(process.env.AFERI_T18_CDP_PORT ?? 9234);
try {
  for (const dir of ['photo-review','web-capture','web-voice']) processes.push(spawn(process.execPath, ['serve.mjs'], { cwd: path.join(root,'demos',dir), stdio: 'ignore' }));
  processes.push(spawn('chromium', ['--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--disable-component-update',
    '--no-first-run',`--remote-debugging-port=${cdpPort}`,`--user-data-dir=/tmp/aferi-task18-browser-${process.pid}`,'about:blank'], { stdio: 'ignore' }));
  let targets;
  for (let i=0;i<80;i++) { try { targets = await (await fetch(`http://127.0.0.1:${cdpPort}/json`)).json(); break; } catch { await delay(150); } }
  socket = new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  let id=0; const calls=new Map(), requests=[], exceptions=[]; let sentinelLeaks=0, cancelledWorkerAttach=0, workerInstrumentationErrors=0;
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.id){const pending=calls.get(message.id);calls.delete(message.id);if(message.error)pending.reject(Error('cdp-failed'));else pending.resolve(message.result);}
    if(message.method==='Network.requestWillBeSent'){const request=message.params.request;const url=new URL(request.url);requests.push({origin:url.origin,protocol:url.protocol,method:request.method});}
    if(message.method==='Runtime.exceptionThrown')exceptions.push('runtime-error');
    if(message.method==='Runtime.consoleAPICalled' && JSON.stringify(message.params.args).includes('SENTINELA-T18'))sentinelLeaks++;
    if(message.method==='Target.attachedToTarget' && message.params.targetInfo.type==='worker'){
      const sessionId=message.params.sessionId;
      void (async()=>{await rpc('Network.enable',{},sessionId);await rpc('Runtime.enable',{},sessionId);await rpc('Runtime.runIfWaitingForDebugger',{},sessionId);})().catch(()=>{if(message.params.waitingForDebugger)cancelledWorkerAttach++;else workerInstrumentationErrors++;});
    }
  });
  function rpc(method,params={},sessionId){return new Promise((resolve,reject)=>{const next=++id;calls.set(next,{resolve,reject});socket.send(JSON.stringify({id:next,method,params,sessionId}));});}
  async function evaluate(expression){const response=await rpc('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.exceptionDetails)throw Error('browser-evaluation-failed');return response.result.value;}
  async function until(expression){for(let i=0;i<160;i++){if(await evaluate(expression))return;await delay(150);}throw Error('condition-timeout');}
  const click=(label,times=1)=>evaluate(`(()=>{const button=[...document.querySelectorAll('[role="button"]')].find(b=>(b.getAttribute('aria-label')??b.textContent.trim())===${JSON.stringify(label)});if(!button)throw Error('button-missing');for(let i=0;i<${times};i++)button.click();})()`);
  const type=(label,value)=>evaluate(`(()=>{const input=document.querySelector('[aria-label='+CSS.escape(${JSON.stringify(label)})+']');Object.getOwnPropertyDescriptor(input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const input=label=>evaluate(`document.querySelector('input[aria-label='+CSS.escape(${JSON.stringify(label)})+']')?.value`);
  async function storage(){return evaluate(`(async()=>{let opfs=0;if(navigator.storage?.getDirectory){const dir=await navigator.storage.getDirectory();for await(const entry of dir.keys())opfs++;}return {indexedDb:(await indexedDB.databases()).length,caches:(await caches.keys()).length,serviceWorkers:(await navigator.serviceWorker.getRegistrations()).length,localStorage:localStorage.length,sessionStorage:sessionStorage.length,opfsEntries:opfs};})()`);}
  const emptyStorage={indexedDb:0,caches:0,serviceWorkers:0,localStorage:0,sessionStorage:0,opfsEntries:0};
  const browserVersion=await rpc('Browser.getVersion');
  await rpc('Runtime.enable');await rpc('Network.enable');await rpc('Page.enable');await rpc('Accessibility.enable');
  await rpc('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:true});
  await rpc('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.guardrails={mediaRequests:0,speechStarts:0,workers:0,terminated:0};
    if(navigator.mediaDevices?.getUserMedia){const native=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=(...args)=>{window.guardrails.mediaRequests++;return native(...args);};}
    for(const name of ['SpeechRecognition','webkitSpeechRecognition']){const ctor=window[name];if(ctor?.prototype?.start&&!ctor.prototype.start.guardrailsWrapped){const native=ctor.prototype.start;const wrapped=function(...args){window.guardrails.speechStarts++;return native.apply(this,args);};wrapped.guardrailsWrapped=true;ctor.prototype.start=wrapped;}}
    const NativeWorker=window.Worker;window.Worker=class extends NativeWorker {constructor(...args){super(...args);window.guardrails.workers++;this.closed=false;}terminate(){if(!this.closed){window.guardrails.terminated++;this.closed=true;}super.terminate();}};
  `});
  step='synthetic-review';
  await rpc('Page.navigate',{url:'http://127.0.0.1:8096/'});await until(`document.body?.innerText.includes('Simular candidatos completos')`);
  await click('Simular candidatos completos');await until(`!!document.querySelector('input[aria-label="Sistólica"]')`);
  assert.equal(await input('Sistólica'),'120');assert.equal(await input('Pulso'),'72');
  assert.equal(await evaluate(`document.querySelector('input[aria-label="Sistólica"]').autocomplete`),'off');
  assert.equal(await evaluate(`document.querySelector('textarea[aria-label="Observação"]').autocomplete`),'off');
  await type('Sistólica','135');await type('Observação','SENTINELA-T18');
  await click('Confirmar simulação',2);await until(`document.body.innerText.includes('Confirmação demonstrada somente em memória.')`);
  assert.equal(await evaluate(`document.body.innerText.includes('135 por 80')`),true);
  await click('Simular campo incerto');await until(`!!document.querySelector('input[aria-label="Sistólica"]')`);
  assert.equal(await input('Sistólica'),'');
  await click('Cancelar');assert.equal(await evaluate(`!!document.querySelector('input[aria-label="Sistólica"]')`),false);
  await click('Demonstração de voz');await click('Simular decimais e pulso');await until(`!!document.querySelector('input[aria-label="Sistólica"]')`);
  assert.equal(await input('Sistólica'),'135');assert.equal(await input('Diastólica'),'85');
  await click('Simular escala mista');assert.equal(await input('Sistólica'),'');
  assert.equal(await evaluate(`document.body.innerText.includes('Incerto: escala incerta')`),true);
  await click('Simular resultado parcial');assert.equal(await evaluate(`!!document.querySelector('input[aria-label="Sistólica"]')`),false);
  await click('Simular doze por oito');
  const ax = await rpc('Accessibility.getFullAXTree');
  assert.ok(ax.nodes.some(node=>node.name?.value==='Sistólica'));
  assert.ok(ax.nodes.some(node=>node.name?.value==='Confirmar simulação'&&node.role?.value==='button'));
  await rpc('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const dimensions=await evaluate(`(()=>{const buttons=[...document.querySelectorAll('[role="button"]')].filter(b=>b.getBoundingClientRect().height>0);return {overflow:document.documentElement.scrollWidth>window.innerWidth,minHeight:Math.min(...buttons.map(b=>b.getBoundingClientRect().height)),minWidth:Math.min(...buttons.map(b=>b.getBoundingClientRect().width))};})()`);
  assert.equal(dimensions.overflow,false);assert.ok(dimensions.minHeight>=48&&dimensions.minWidth>=48);
  await rpc('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await rpc('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate(`document.activeElement!==document.body`),true);
  const reviewStorage=await storage();assert.deepEqual(reviewStorage,emptyStorage);
  assert.equal(await evaluate(`window.guardrails.mediaRequests+window.guardrails.speechStarts+window.guardrails.workers`),0);
  step='real-ocr-synthetic-card';
  await rpc('Page.navigate',{url:'http://127.0.0.1:8098/'});await until(`document.body?.innerText.includes('Testar OCR real com cartão sintético')`);
  await click('Testar OCR real com cartão sintético (sem câmera)');await until(`!!document.querySelector('input[aria-label="Sistólica"]')`);
  assert.equal(await input('Sistólica'),'120');assert.equal(await input('Diastólica'),'80');assert.equal(await input('Pulso'),'72');
  assert.equal(await evaluate(`window.guardrails.workers===window.guardrails.terminated&&window.guardrails.mediaRequests===0`),true);
  await click('Confirmar revisão em memória');await until(`document.body.innerText.includes('Confirmação demonstrada somente em memória.')`);
  await click('Testar OCR real com cartão sintético (sem câmera)');await click('Cancelar captura');await until(`document.body.innerText.includes('Tentativa cancelada.')`);await delay(500);
  assert.equal(await evaluate(`!!document.querySelector('input[aria-label="Sistólica"]')`),false);
  await click('Testar OCR real com cartão sintético (sem câmera)');await until(`!!document.querySelector('input[aria-label="Sistólica"]')`);
  await evaluate(`window.dispatchEvent(new Event('pagehide'))`);await until(`document.body.innerText.includes('Revisão cancelada.')`);
  const photoStorage=await storage();assert.deepEqual(photoStorage,emptyStorage);
  step='web-speech-local-gate';
  await rpc('Page.navigate',{url:'http://127.0.0.1:8100/'});await until(`document.body?.innerText.includes('Verificar e começar fala local')`);
  const capabilities=await evaluate(`(()=>{const Speech=window.SpeechRecognition??window.webkitSpeechRecognition;return {constructor:!!Speech,available:typeof Speech?.available==='function',processLocally:Speech?('processLocally' in new Speech()):false};})()`);
  await click('Verificar e começar fala local');await until(`document.body.innerText.includes('Voz local indisponível nesta tentativa.')||document.body.innerText.includes('Ouvindo localmente.')`);
  const unavailable=await evaluate(`document.body.innerText.includes('Voz local indisponível nesta tentativa.')`);
  if(!unavailable)throw Error('live-microphone-test-needs-controlled-audio');
  assert.equal(await evaluate(`window.guardrails.speechStarts`),0);
  assert.equal(await evaluate(`!!document.querySelector('input[aria-label="Sistólica"]')`),false);
  step='web-speech-unavailability-details';
  const unavailableIssue=await evaluate(`(()=>{const text=document.body.innerText;return text.includes('Pacote pt-BR local não está pronto')?'model-missing':text.includes('Reconhecedor explicitamente local indisponível')?'local-unavailable':text.includes('Não foi possível verificar pt-BR local')?'language-unverified':'other-safe-failure';})()`);
  const unavailableAX=await rpc('Accessibility.getFullAXTree');assert.ok(unavailableAX.nodes.some(node=>node.role?.value==='alert'));
  step='manual-open';
  await click('Ir para registro manual');await until(`document.body.innerText.includes('Manual · avaliação sem persistência')`);
  await type('Sistólica','120');await type('Diastólica','80');
  step='manual-enter-focus';
  await until(`!![...document.querySelectorAll('[role="button"]')].find(b=>b.getAttribute('aria-label')==='Confirmar manual em memória'&&b.getAttribute('aria-disabled')!=='true')`);
  await rpc('Page.bringToFront');
  await evaluate(`[...document.querySelectorAll('[role="button"]')].find(b=>b.getAttribute('aria-label')==='Confirmar manual em memória').focus()`);
  await until(`document.activeElement.getAttribute('aria-label')==='Confirmar manual em memória'`);
  step='manual-enter-submit';
  await rpc('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await rpc('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await until(`document.body.innerText.includes('Confirmação manual demonstrada somente em memória.')`);
  step='final-storage-network';
  const voiceStorage=await storage();assert.deepEqual(voiceStorage,emptyStorage);
  const external=requests.filter(r=>!['http://127.0.0.1:8096','http://127.0.0.1:8098','http://127.0.0.1:8100'].includes(r.origin)&&!['blob:','data:'].includes(r.protocol));
  assert.deepEqual(external,[]);assert.equal(requests.filter(r=>!['GET','HEAD'].includes(r.method)).length,0);assert.deepEqual(exceptions,[]);assert.equal(sentinelLeaks,0);assert.equal(workerInstrumentationErrors,0);
  process.stdout.write(JSON.stringify({passed:true,browser:browserVersion.product,syntheticReview:true,realOcrOnSyntheticCard:true,webSpeech:{...capabilities,unavailable,issue:unavailableIssue,startCalls:0,recognitionProven:false},accessibility:{axNamesAndRoles:true,keyboardFocus:true,manualConfirmationWithEnter:true,mobileDimensions:dimensions},storage:{review:reviewStorage,photo:photoStorage,voice:voiceStorage},externalRequests:0,httpWrites:0,runtimeExceptions:0,sentinelConsoleLeaks:0,cancelledWorkerAttach,workerInstrumentationErrors,pagehideEvent:'simulated',physicalDevices:'not-tested'})+'\n');
} catch { process.stderr.write(`TASK-18 browser check failed at ${step}\n`);process.exitCode=1; }
finally {socket?.close();for(const child of processes)child.kill();}
