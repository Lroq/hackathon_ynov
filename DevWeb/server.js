const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const OLLAMA_PORT = 11434;
const OLLAMA_HOST = 'localhost';

const publicDir = path.join(__dirname, 'public');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // MARK: Check Ollama connection
  if (pathname === '/api/status' && req.method === 'GET') {
    const reqOllama = http.request({
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: '/api/tags',
      method: 'GET'
    }, (resOllama) => {
      let body = '';
      resOllama.on('data', chunk => { body += chunk; });
      resOllama.on('end', () => {
        try {
          const data = JSON.parse(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ connected: true, models: data.models || [] }));
        } catch (e) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ connected: false, models: [], error: 'Invalid JSON response from Ollama' }));
        }
      });
    });

    reqOllama.on('error', (err) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ connected: false, models: [], error: err.message }));
    });
    reqOllama.end();
    return;
  }

  // MARK: API: Proxy chat requests to Ollama
  if (pathname === '/api/chat' && req.method === 'POST') {
    const reqOllama = http.request({
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (resOllama) => {
      // Forward the status code and headers (including streaming headers if present)
      res.writeHead(resOllama.statusCode, resOllama.headers);
      resOllama.pipe(res);
    });

    reqOllama.on('error', (err) => {
      console.error('Ollama communication error:', err);
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Ollama is offline or unreachable' }));
    });

    req.pipe(reqOllama);
    return;
  }

  const safePathname = pathname === '/' ? 'index.html' : pathname.substring(1);
  const filePath = path.resolve(publicDir, safePathname);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  const extname = path.extname(filePath);
  let contentType = 'text/html';
  switch (extname) {
    case '.js':
      contentType = 'application/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
      contentType = 'image/jpeg';
      break;
    case '.svg':
      contentType = 'image/svg+xml';
      break;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Chat Server started!`);
  console.log(`Interface: http://localhost:${PORT}`);
});
