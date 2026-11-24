#!/usr/bin/env node
// dev-server.mjs — ビルドなし（素の HTML / importmap）の作品用の開発サーバー（dev-harness スキル）
//
// キャッシュを無効にして静的に配信し、POST /__shot で画像を shots/ に保存する。
// これまで作品ごとに書いていた serve.py の代わり。依存なし（Node だけ）。
//
//   node dev/dev-server.mjs [--root .] [--port 5173] [--shots shots]

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { saveShot } from './vite-plugin-dev-shot.js';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const root = path.resolve(arg('root', '.'));
const port = +arg('port', 5173);
const shots = path.resolve(root, arg('shots', 'shots'));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.txt': 'text/plain; charset=utf-8',
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/__shot') {
    if (req.method !== 'POST') { res.writeHead(405).end(); return; }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try { res.end(saveShot(shots, url.searchParams.get('name'), Buffer.concat(chunks).toString(), root)); }
      catch (e) { res.writeHead(500).end(String(e)); }
    });
    return;
  }
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`dev-server: http://127.0.0.1:${port}/  (shots → ${path.relative(process.cwd(), shots) || '.'})`));
