#!/usr/bin/env node
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { makePlan, execute, undoLast } from './service.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(directory, '..', 'public');
const port = Number(process.env.FILEFLOW_PORT || 3847);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

function send(response, status, data) { if (response.headersSent) return; response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(data)); }
async function body(request) { let data = ''; for await (const chunk of request) { data += chunk; if (data.length > 100_000) throw new Error('Requête trop grande.'); } return data ? JSON.parse(data) : {}; }
function publicPlan(plan) { return { folder: plan.folder, config: plan.config, summary: plan.summary, operations: plan.operations.map(operation => ({ type: operation.type, source: operation.source, destination: operation.destination })) }; }

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === 'POST' && request.url === '/api/preview') { const input = await body(request); return send(response, 200, publicPlan(await makePlan(input.folder, input.options))); }
    if (request.method === 'POST' && request.url === '/api/apply') { const input = await body(request); return send(response, 200, await execute(input.folder, input.options)); }
    if (request.method === 'POST' && request.url === '/api/undo') { const input = await body(request); return send(response, 200, await undoLast(path.resolve(input.folder.trim()))); }
    if (request.method !== 'GET') return send(response, 405, { error: 'Méthode non autorisée.' });
    const requested = request.url === '/' ? 'index.html' : request.url.slice(1); const file = path.resolve(publicDir, requested);
    if (!file.startsWith(publicDir)) return send(response, 403, { error: 'Accès refusé.' });
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); response.end(content);
  } catch (error) { send(response, error.code === 'ENOENT' ? 404 : 400, { error: error.message }); }
});
server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${port}`; console.log(`FileFlow est ouvert sur ${url} (Ctrl+C pour arrêter).`);
  if (process.env.FILEFLOW_NO_OPEN !== '1') { const command = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]]; spawn(command[0], command[1], { detached: true, stdio: 'ignore' }).unref(); }
});
