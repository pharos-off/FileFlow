#!/usr/bin/env node
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { makePlan, executePlan, undoLast } from './service.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(directory, '..', 'public');
const port = Number(process.env.FILEFLOW_PORT || 3847);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const previewPlans = new Map();
const planLifetime = 15 * 60 * 1000;

function send(response, status, data) { if (response.headersSent) return; response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(data)); }
async function body(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 100_000) throw new Error('Requête trop grande.');
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}
function publicPlan(plan, planId) { return { planId, folder: plan.folder, config: plan.config, summary: plan.summary, operations: plan.operations.map(operation => ({ type: operation.type, source: operation.source, destination: operation.destination })) }; }

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (request.method === 'POST' && url.pathname === '/api/preview') {
      const input = await body(request);
      const now = Date.now();
      for (const [id, entry] of previewPlans) if (entry.createdAt + planLifetime < now) previewPlans.delete(id);
      while (previewPlans.size >= 20) previewPlans.delete(previewPlans.keys().next().value);
      const plan = await makePlan(input.folder, input.options);
      const planId = randomUUID();
      previewPlans.set(planId, { plan, createdAt: now });
      return send(response, 200, publicPlan(plan, planId));
    }
    if (request.method === 'POST' && url.pathname === '/api/apply') {
      const input = await body(request);
      if (typeof input.planId !== 'string') throw new Error('Aperçu manquant ou expiré. Relancez l’aperçu.');
      const entry = previewPlans.get(input.planId);
      previewPlans.delete(input.planId);
      if (!entry || entry.createdAt + planLifetime < Date.now()) throw new Error('Aperçu manquant ou expiré. Relancez l’aperçu.');
      return send(response, 200, await executePlan(entry.plan));
    }
    if (request.method === 'POST' && url.pathname === '/api/undo') {
      const input = await body(request);
      if (typeof input.folder !== 'string' || !input.folder.trim()) throw new Error('Indiquez un dossier à annuler.');
      return send(response, 200, await undoLast(path.resolve(input.folder.trim())));
    }
    if (request.method !== 'GET') return send(response, 405, { error: 'Méthode non autorisée.' });
    const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.resolve(publicDir, `.${requested}`);
    const relative = path.relative(publicDir, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return send(response, 403, { error: 'Accès refusé.' });
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); response.end(content);
  } catch (error) { send(response, error.code === 'ENOENT' ? 404 : 400, { error: error.message }); }
});
server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${port}`; console.log(`FileFlow est ouvert sur ${url} (Ctrl+C pour arrêter).`);
  if (process.env.FILEFLOW_NO_OPEN !== '1') {
    const command = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
    const browser = spawn(command[0], command[1], { detached: true, stdio: 'ignore' });
    browser.on('error', error => console.error(`Impossible d’ouvrir le navigateur automatiquement : ${error.message}`));
    browser.unref();
  }
});
