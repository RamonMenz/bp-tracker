// Servidor local de artefatos estáticos; não recebe ou salva dados da revisão.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
createServer(async (req, res) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'");
  res.setHeader('Permissions-Policy', 'microphone=(self), camera=(), on-device-speech-recognition=(self)');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    const content = await readFile(file);
    res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
    res.writeHead(200).end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(404).end(); }
}).listen(8100, '127.0.0.1', () => {
  process.stdout.write('Voz Web local em avaliação: http://localhost:8100 (Ctrl+C para encerrar)\n');
});
