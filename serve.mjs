// Serveur statique de développement. Rien de tout ceci ne part en production :
// le site final est un dossier de fichiers posés sur n'importe quel hébergement statique.
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {extname, join, normalize, resolve} from 'node:path';

const ROOT = resolve(process.argv[2] || '.');
const PORT = Number(process.argv[3] || 8123);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';

    // Empêche de remonter hors du dossier servi via ../
    const target = resolve(join(ROOT, normalize(rel)));
    if (!target.startsWith(ROOT)) {
      res.writeHead(403).end('Interdit');
      return;
    }

    const info = await stat(target);
    const file = info.isDirectory() ? join(target, 'index.html') : target;
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(body);
  } catch {
    res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'}).end('Introuvable');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`SunriseCast sur http://127.0.0.1:${PORT}/`);
});
