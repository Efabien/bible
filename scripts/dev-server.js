const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const SRC = path.join(__dirname, '..', 'src');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let url = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(SRC, url);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

// Get local network IP for phone testing
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const info of iface) {
      if (info.family === 'IPv4' && !info.internal) return info.address;
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`\n  Baiboly dev server running:\n`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Phone:   http://${ip}:${PORT}`);
  console.log(`\n  Open the Phone URL on your Android to test.\n`);
});
