// O worker de terceiros nunca envia seus logs/exceções brutos ao coletor/console.
// Falhas continuam produzindo um código seguro e feedback na UI.
for (const method of ['log', 'info', 'debug', 'warn', 'error', 'trace', 'table', 'dir']) {
  self.console[method] = () => undefined;
}
self.addEventListener('error', event => {
  event.preventDefault(); self.postMessage({ kind: 'engine-failed' });
});
self.addEventListener('unhandledrejection', event => {
  event.preventDefault(); self.postMessage({ kind: 'engine-failed' });
});
self.importScripts('./worker.min.js');
