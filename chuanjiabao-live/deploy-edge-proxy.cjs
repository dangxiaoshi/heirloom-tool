#!/usr/bin/env node
const http = require('http');

const PORT = Number(process.env.PORT || 80);
const MONEY_TARGET = process.env.MONEY_TARGET || 'http://127.0.0.1:3000';
const HEIRLOOM_TARGET = process.env.HEIRLOOM_TARGET || 'http://127.0.0.1:3001';

const HEIRLOOM_APIS = new Set([
  '/api/health',
  '/api/export',
  '/api/transcribe',
  '/api/interview-start',
  '/api/interview-turn',
  '/api/interview-next',
  '/api/generate',
  '/api/contact',
]);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const isHeirloomPage = url.pathname === '/heirloom' || url.pathname.startsWith('/heirloom/');
  const isHeirloomApi = HEIRLOOM_APIS.has(url.pathname);

  if (url.pathname === '/heirloom') {
    res.writeHead(302, { Location: '/heirloom/card.html' });
    res.end();
    return;
  }

  const targetBase = isHeirloomPage || isHeirloomApi ? HEIRLOOM_TARGET : MONEY_TARGET;
  const target = new URL(targetBase);
  const path = isHeirloomPage
    ? url.pathname.replace(/^\/heirloom/, '') || '/'
    : url.pathname;

  target.pathname = path;
  target.search = url.search;

  const headers = { ...req.headers, host: target.host };
  headers['x-forwarded-host'] = req.headers.host || '';
  headers['x-forwarded-proto'] = 'http';

  const proxyReq = http.request(target, {
    method: req.method,
    headers,
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'bad_gateway', message: error.message }));
  });

  req.pipe(proxyReq);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`edge proxy listening on :${PORT}`);
});
