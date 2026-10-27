import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const directory = resolve(process.argv[2] ?? 'dist');
const port = Number(process.argv[3] ?? 8095);
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json' };
createServer(async (request, response) => {
  // Servidor de teste somente leitura, sem endpoint de upload/persistência.
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:");
  response.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), on-device-speech-recognition=(self)');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405); response.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    let file = resolve(directory, '.' + pathname);
    if (file !== directory && !file.startsWith(directory + sep)) { response.writeHead(403); response.end(); return; }
    if (pathname === '/') file = resolve(directory, 'index.html');
    const metadata = await stat(file);
    if (!metadata.isFile()) throw new Error('not-a-file');
    response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
    response.setHeader('Cache-Control', file.endsWith('.html') ? 'no-store' : 'public, max-age=3600');
    response.end(request.method === 'HEAD' ? undefined : await readFile(file));
  } catch { response.writeHead(404); response.end(); }
}).listen(port, '127.0.0.1', () => process.stdout.write(`PoCs locais: http://localhost:${port}\n`));
