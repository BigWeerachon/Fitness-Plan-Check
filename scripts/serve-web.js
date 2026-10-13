// ใช้: node scripts/serve-web.js <โฟลเดอร์ export เว็บ> [พอร์ต]
// เสิร์ฟ dist ของเว็บพร้อม COOP/COEP (expo-sqlite บนเว็บต้องใช้ SharedArrayBuffer) + fallback ไป index.html
const http = require('http');
const fs = require('fs');
const path = require('path');
const exportDir = path.resolve(process.argv[2]);
const port = Number(process.argv[3] || 8089);
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

const isFile = (file) => fs.existsSync(file) && fs.statSync(file).isFile();

/** ไฟล์ภายในโฟลเดอร์ export เท่านั้น (กัน `..` ที่ถอดรหัสจาก %2e%2e) */
const isInsideExportDir = (file) => file === exportDir || file.startsWith(exportDir + path.sep);

/** คืนไฟล์ที่จะเสิร์ฟ: ไฟล์ตรง → `<path>.html` → index.html หรือ null ถ้า path หลุดนอกโฟลเดอร์ */
function resolveFile(urlPath) {
  const requested = path.resolve(exportDir, '.' + path.sep + urlPath);
  if (!isInsideExportDir(requested)) return null;
  if (isFile(requested)) return requested;
  const withHtml = path.resolve(exportDir, '.' + path.sep + urlPath.replace(/\/$/, '') + '.html');
  if (isInsideExportDir(withHtml) && isFile(withHtml)) return withHtml;
  return path.join(exportDir, 'index.html');
}

http
  .createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(req.url.split('?')[0]);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const file = resolveFile(urlPath);
    if (!file) {
      res.writeHead(403).end();
      return;
    }
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Content-Type', MIME_TYPES[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log('serving', exportDir, port));
