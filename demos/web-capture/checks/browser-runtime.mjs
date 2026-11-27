// OCR real em WASM com cartão sintético. Não testa câmera física.
// Requer servidor :8098 e Chromium CDP :9224 iniciados separadamente.
import assert from 'node:assert/strict';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const virtualCamera = process.argv.includes('--virtual-camera');
const cdpPort = Number(process.env.AFERI_CDP_PORT ?? (virtualCamera ? 9225 : 9224));
let socket;
try {
  let pages;
  for(let i=0;i<60;i++) { try { pages=await (await fetch('http://127.0.0.1:'+cdpPort+'/json')).json();break; } catch { await delay(200); } }
  socket = new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  let id=0; const calls=new Map(); const requests=[]; const errors=[]; let workersSeen=0, cancelledWorkersBeforeAttach=0, workerInspectionFailures=0;
  socket.addEventListener('message',event=>{const msg=JSON.parse(event.data); if(msg.id){const call=calls.get(msg.id); calls.delete(msg.id);if(msg.error)call.reject(msg.error);else call.resolve(msg.result);} if(msg.method==='Network.requestWillBeSent') { const r=msg.params.request; const u=new URL(r.url); requests.push({origin:u.origin,protocol:u.protocol,method:r.method,asset:r.url.startsWith('http://127.0.0.1:8098/ocr/')}); }
    if(msg.method==='Runtime.exceptionThrown')errors.push('runtime-exception');
    if(msg.method==='Target.attachedToTarget' && msg.params.targetInfo.type==='worker') {
      workersSeen++; const sid=msg.params.sessionId;
      void (async()=>{ await rpc('Network.enable',{},sid); await rpc('Runtime.enable',{},sid); await rpc('Runtime.runIfWaitingForDebugger',{},sid); })().catch(() => { if(msg.params.waitingForDebugger)cancelledWorkersBeforeAttach++;else workerInspectionFailures++; });
    }});
  const rpc=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const next=++id;calls.set(next,{resolve,reject});socket.send(JSON.stringify({id:next,method,params,sessionId}));});
  const evaluate=async expression=>{const response=await rpc('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.exceptionDetails)throw Error('browser-evaluation-failed');return response.result.value;};
  await rpc('Runtime.enable');await rpc('Network.enable');await rpc('Page.enable');
  await rpc('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
  await rpc('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:true});
  await rpc('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.ocrCheck={created:0,terminated:0,detached:0,canvases:[],streams:[]};
    const NativeWorker=window.Worker;
    window.Worker=class extends NativeWorker {
      constructor(...args){super(...args);window.ocrCheck.created++;this.closed=false;}
      terminate(){if(!this.closed){window.ocrCheck.terminated++;this.closed=true;}super.terminate();}
      postMessage(message,transfer){const buffer=message?.action==='recognize'?message.payload.image.buffer:null;super.postMessage(message,transfer);if(buffer?.byteLength===0)window.ocrCheck.detached++;}
    };
    if(navigator.mediaDevices?.getUserMedia){const gum=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...args)=>{const stream=await gum(...args);window.ocrCheck.streams.push(stream);return stream;};}
    const create=document.createElement.bind(document);
    document.createElement=function(name,...args){const element=create(name,...args);if(name==='canvas')window.ocrCheck.canvases.push(element);return element;};
  `});
  await rpc('Page.navigate',{url:'http://127.0.0.1:8098/'});
  for(let i=0;i<60;i++){if(await evaluate('document.body?.innerText?.includes("Testar OCR real com cartão sintético")'))break;await delay(200);}
  const click=label=>evaluate(`(()=>{const button=[...document.querySelectorAll('[role="button"]')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!button)throw Error('button missing');button.click();})()`);

  async function until(expression) {
    for(let i=0;i<240;i++){if(await evaluate(expression))return;await delay(250);}throw Error('condition-timeout');
  }
  assert.equal(requests.filter(r=>r.asset).length,0,'assets-must-be-lazy');
  await click('Testar OCR real com cartão sintético (sem câmera)');
  await until(`!!document.querySelector('input[aria-label="Sistólica"]') || document.body.innerText.includes('Tentativa encerrada.')`);
  assert.equal(await evaluate(`document.querySelector('input[aria-label="Sistólica"]')?.value`),'120','synthetic-systolic');
  assert.equal(await evaluate(`document.querySelector('input[aria-label="Diastólica"]')?.value`),'80','synthetic-diastolic');
  assert.equal(await evaluate(`document.querySelector('input[aria-label="Pulso"]')?.value`),'72','synthetic-pulse');
  assert.equal(await evaluate(`window.ocrCheck.created===window.ocrCheck.terminated`),true,'worker-terminated-before-review');
  assert.equal(await evaluate(`window.ocrCheck.detached`),1,'image-buffer-transferred');
  assert.equal(await evaluate(`window.ocrCheck.canvases.every(c=>c.width===0&&c.height===0)`),true,'canvas-cleared');
  await click('Confirmar revisão em memória');
  await until(`document.body.innerText.includes('Confirmação demonstrada somente em memória.')`);
  await click('Testar OCR real com cartão sintético (sem câmera)');
  await click('Cancelar captura');
  await until(`document.body.innerText.includes('Tentativa cancelada.')`);await delay(1000);
  assert.equal(await evaluate(`!!document.querySelector('input[aria-label="Sistólica"]')`),false,'cancelled-result-must-not-return');
  let cameraOutcome;
  if(virtualCamera) {
    await rpc('Browser.setPermission',{permission:{name:'camera'},setting:'granted',origin:'http://127.0.0.1:8098'});
    await click('Iniciar câmera Web');
    await until(`document.body.innerText.includes('Enquadre o display inteiro')`);
    assert.equal(await evaluate(`window.ocrCheck.streams.some(s=>s.getVideoTracks().some(t=>t.readyState==='live'))`),true);
    assert.equal(await evaluate(`window.ocrCheck.streams.every(s=>s.getAudioTracks().length===0)`),true);
    await click('Capturar e reconhecer');
    await until(`!!document.querySelector('input[aria-label="Sistólica"]') || document.body.innerText.includes('Tentativa encerrada.')`);
    assert.equal(await evaluate(`window.ocrCheck.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))`),true);
    assert.equal(await evaluate(`document.querySelector('video').srcObject===null`),true);
    assert.equal(await evaluate(`!!document.querySelector('input[aria-label="Sistólica"]')`),true,'virtual-frame-to-review');
    await click('Iniciar câmera Web');await until(`document.body.innerText.includes('Enquadre o display inteiro')`);
    await evaluate(`window.dispatchEvent(new Event('pagehide'))`);
    await until(`document.body.innerText.includes('Tentativa cancelada.')`);
    assert.equal(await evaluate(`window.ocrCheck.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))`),true);
    cameraOutcome='virtual-device-pipeline-passed-pagehide-event-simulated';
  } else {
    await rpc('Browser.setPermission',{permission:{name:'camera'},setting:'denied',origin:'http://127.0.0.1:8098'});
    await click('Iniciar câmera Web');
    await until(`document.body.innerText.includes('Tentativa encerrada.')`);
    cameraOutcome=await evaluate(`document.body.innerText.includes('Permissão de câmera negada')?'permission-denied':document.body.innerText.includes('Câmera indisponível')?'device-unavailable':'other'`);
    assert.notEqual(cameraOutcome,'other');
  }
  const storage=await evaluate(`(async()=>({indexedDb:(await indexedDB.databases()).length,caches:(await caches.keys()).length,serviceWorkers:(await navigator.serviceWorker.getRegistrations()).length,localStorage:localStorage.length,sessionStorage:sessionStorage.length}))()`);
  assert.deepEqual(storage,{indexedDb:0,caches:0,serviceWorkers:0,localStorage:0,sessionStorage:0});
  assert.equal(await evaluate(`window.ocrCheck.created===window.ocrCheck.terminated`),true);
  const external=requests.filter(r=>r.origin!=='http://127.0.0.1:8098'&&!['blob:','data:'].includes(r.protocol));
  const writes=requests.filter(r=>!['GET','HEAD'].includes(r.method));
  assert.deepEqual(external,[]);assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);assert.equal(workerInspectionFailures,0);
  process.stdout.write(JSON.stringify({syntheticRealOcr:true,workersSeen,cancelledWorkersBeforeAttach,workerInspectionFailures,workerLifecycle:await evaluate(`({created:window.ocrCheck.created,terminated:window.ocrCheck.terminated,detached:window.ocrCheck.detached})`),storage,externalRequests:external.length,writeRequests:writes.length,runtimeErrors:errors.length,cameraOutcome,physicalCamera:'not-tested',note:'Limited synthetic browser run; not universal privacy proof.'})+'\n');
} finally {socket?.close();}
