// Simple CORS-friendly proxy for local testing
// Usage: `node proxy-server.js` (requires Node 18+ for global fetch)
// Then call: http://localhost:8080/fetch?url=https://example.com/feed

const http = require('http');
const { URL } = require('url');

const PORT = process.env.PORT || 8080;

http.createServer(async (req, res) => {
  // Allow CORS for local testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const base = `http://${req.headers.host}`;
    const reqUrl = new URL(req.url, base);
    // Accept either /fetch?url=... or /fetch/<encoded-url>
    let target = reqUrl.searchParams.get('url');
    if (!target && reqUrl.pathname.startsWith('/fetch/')) {
      target = decodeURIComponent(reqUrl.pathname.replace('/fetch/', ''));
    }

    if (!target) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing url parameter. Use /fetch?url=<URL>');
      return;
    }

    const proxied = await fetch(target);
    const body = await proxied.arrayBuffer();

    const headers = { 'Content-Type': proxied.headers.get('content-type') || 'text/plain' };
    // Keep CORS header
    headers['Access-Control-Allow-Origin'] = '*';

    res.writeHead(proxied.status, headers);
    res.end(Buffer.from(body));
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Proxy fetch error: ' + err.message);
  }
}).listen(PORT, () => console.log(`Proxy server listening on http://localhost:${PORT}`));
