// API real getUserMedia com câmera VIRTUAL do Chromium. Não é teste de hardware.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const server = spawn(process.execPath, ['serve.mjs'], { cwd: fileURLToPath(new URL('../../demos/web-capture/', import.meta.url)), stdio: 'ignore' });
const browser = spawn('chromium', ['--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--disable-component-update',
  '--no-first-run','--remote-debugging-port=9235',`--user-data-dir=/tmp/aferi-task18-virtual-${process.pid}`,
  '--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','about:blank'], { stdio: 'ignore' });
try {
  process.env.AFERI_CDP_PORT = '9235';
  process.argv.push('--virtual-camera');
  await import('../../demos/web-capture/checks/browser-runtime.mjs');
} catch { process.stderr.write('TASK-18 virtual camera check failed\n'); process.exitCode=1; }
finally { server.kill(); browser.kill(); }
