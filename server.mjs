// Local development server: serves dist/ like Vercel does and runs the same handlers as production.
// Content and uploads are stored in .data/ unless BLOB_READ_WRITE_TOKEN is set.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import { handle } from './lib/router.mjs';
import { localUploadPath } from './lib/store.mjs';

const root = path.resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf' };
const DYNAMIC = new Set(['/', '/menu']);

async function sendFile(res, file) {
  const data = await readFile(file);
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const clean = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;

    if (DYNAMIC.has(clean) || clean.startsWith('/api/')) {
      const hasBody = !['GET', 'HEAD'].includes(req.method);
      const request = new Request(new URL(req.url, `http://${req.headers.host}`), {
        method: req.method,
        headers: req.headers,
        body: hasBody ? Readable.toWeb(req) : undefined,
        duplex: hasBody ? 'half' : undefined
      });
      const response = await handle(request);
      const headers = {};
      response.headers.forEach((value, key) => { headers[key] = value; });
      const cookie = response.headers.getSetCookie?.();
      if (cookie?.length) headers['set-cookie'] = cookie;
      res.writeHead(response.status, headers);
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (clean.startsWith('/uploads/')) { await sendFile(res, localUploadPath(clean)); return; }

    const file = path.resolve(root, '.' + (path.extname(clean) ? clean : clean + '.html'));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    await sendFile(res, file);
  } catch { res.writeHead(404).end('Page not found'); }
});
server.listen(3000, '127.0.0.1', () => console.log('Old Crow Coffee Company is ready at http://localhost:3000  (admin: /admin, local password "changeme" unless ADMIN_PASSWORD is set)'));
