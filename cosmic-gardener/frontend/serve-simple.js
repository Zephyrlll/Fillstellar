// Simple HTTP server for development without Vite
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // CORS headers for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  let filePath = '.' + url.parse(req.url).pathname;
  
  // Default to index.html
  if (filePath === './') {
    filePath = './index.html';
  }
  
  // Handle TypeScript imports by serving JS files
  if (filePath.endsWith('.ts')) {
    filePath = filePath.replace('.ts', '.js');
  }
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeType = MIME_TYPES[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Try without extension for TypeScript modules
        const jsPath = filePath + '.js';
        fs.readFile(jsPath, (jsError, jsContent) => {
          if (jsError) {
            res.writeHead(404);
            res.end(`File not found: ${req.url}`);
          } else {
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            res.end(jsContent, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at:`);
  console.log(`   Local:    http://localhost:${PORT}/`);
  console.log(`   Network:  http://0.0.0.0:${PORT}/`);
  console.log('');
  console.log('📱 For mobile access, use your PC\'s IP address');
  console.log('   Example: http://192.168.1.100:8000/');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});