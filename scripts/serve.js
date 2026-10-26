'use strict';
// Static preview server for development. It is not an application backend and sends no cache headers
// that would let a browser keep a stale script.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), port = Number(process.env.PORT) || 4173;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
http.createServer((req, res) => {
  let p;
  try { p = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); } catch { res.writeHead(400).end(); return; }
  if (p !== root && !p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (p === root) p = path.join(p, 'index.html');
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    res.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log('Local: http://127.0.0.1:' + port));
