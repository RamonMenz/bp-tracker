// Servidor local de artefatos estáticos; não recebe ou salva dados da revisão.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.wasm': 'application/wasm', '.json': 'application/json' };
createServer(async (req, res) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; worker-src 'self'; script-src 'self' 'wasm-unsafe-eval'; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'");
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    const content = await readFile(file);
    res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
    res.writeHead(200).end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(404).end(); }
}).listen(8098, '127.0.0.1', () => {
  process.stdout.write('Captura Web em avaliação: http://localhost:8098 (Ctrl+C para encerrar)\n');
});
