// ใช้: node scripts/serve-web.js <โฟลเดอร์ export เว็บ> [พอร์ต]
// เสิร์ฟ dist ของเว็บพร้อม COOP/COEP (expo-sqlite บนเว็บต้องใช้ SharedArrayBuffer) + fallback ไป index.html
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const port = Number(process.argv[3] || 8089);
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};
http
  .createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(root, p);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const html = path.join(root, p.replace(/\/$/, '') + '.html');
      file = fs.existsSync(html) ? html : path.join(root, 'index.html');
    }
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log('serving', root, port));
