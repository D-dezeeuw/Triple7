#!/usr/bin/env node
/* Triple7 — tools/serve.js
 * Zero-dependency static server for local dev: `npm start` → http://localhost:7777
 * (The game is pure static files; this is just convenience — opening index.html
 * straight from disk works too.)
 */
'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var PORT = process.env.PORT || 7777;
var MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.md': 'text/plain'
};

http.createServer(function (req, res) {
  var url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  var file = path.normalize(path.join(ROOT, url));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, function (err, data) {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, function () {
  console.log('Triple7 dev server → http://localhost:' + PORT);
});
