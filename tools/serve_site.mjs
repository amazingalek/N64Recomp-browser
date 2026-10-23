#!/usr/bin/env node
// Serves site/ (the games' page) at http://localhost:<port>/n64hub/, as the hub's GitHub Pages would, and passes every
// other path on to https://amazingalek.github.io (a game's folder, /n64hub/<game>/, among them), so the games' pages
// are on the same origin and play in its frame as they would on Pages. coi_serviceworker.js comes from frontend/, and README.md, which the page reads its
// table from, is the checkout's. Node 18 or newer.
//
//   node tools/serve_site.mjs [<port>]       (8742 by default)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.argv[2] || 8742);
const pages = 'https://amazingalek.github.io';
const types = { '.md': 'text/markdown', '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' };

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  try {
    const name = path.startsWith('/n64hub/') && (path.slice('/n64hub/'.length) || 'index.html');
    if (path === '/' || path === '/n64hub') {
      res.writeHead(302, { location: '/n64hub/' }).end();
    } else if (name && /^(img\/)?[\w.-]+$/.test(name)) {
      const file = name === 'coi_serviceworker.js' ? join(root, 'frontend', name)
        : name === 'README.md' ? join(root, name) : join(root, 'site', name);
      const body = await readFile(file).catch(() => { throw Object.assign(new Error(), { status: 404 }); });
      res.writeHead(200, { 'content-type': types[extname(name)] || 'application/octet-stream', 'cache-control': 'no-cache' }).end(body);
    } else {
      const upstream = await fetch(pages + req.url, { headers: { 'accept-encoding': 'identity' } });
      const headers = {};
      for (const h of ['content-type', 'cache-control', 'etag', 'last-modified']) {
        if (upstream.headers.has(h)) headers[h] = upstream.headers.get(h);
      }
      res.writeHead(upstream.status, headers);
      for await (const chunk of upstream.body ?? []) res.write(chunk);
      res.end();
    }
  } catch (error) {
    if (!res.headersSent) res.writeHead(error.status || 502);
    res.end();
  }
}).listen(port, () => console.log(`http://localhost:${port}/n64hub/`));
