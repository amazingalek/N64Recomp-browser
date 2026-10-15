#!/usr/bin/env node
// Serves site/ (the games' page) at http://localhost:<port>/N64Recomp-browser/, as GitHub Pages would, and passes
// every other path on to https://amazingalek.github.io, so the games' pages are on the same origin and play in its
// frame as they would on Pages. coi_serviceworker.js comes from frontend/. Node 18 or newer.
//
//   node tools/serve_site.mjs [<port>]       (8742 by default)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.argv[2] || 8742);
const pages = 'https://amazingalek.github.io';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  try {
    if (path === '/' || path === '/N64Recomp-browser') {
      res.writeHead(302, { location: '/N64Recomp-browser/' }).end();
    } else if (path.startsWith('/N64Recomp-browser/')) {
      const name = path.slice('/N64Recomp-browser/'.length) || 'index.html';
      if (!/^[\w.-]+$/.test(name)) throw Object.assign(new Error(), { status: 404 });
      const file = name === 'coi_serviceworker.js' ? join(root, 'frontend', name) : join(root, 'site', name);
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
}).listen(port, () => console.log(`http://localhost:${port}/N64Recomp-browser/`));
