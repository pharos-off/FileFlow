import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

const historyDir = folder => path.join(folder, 'history');
export async function saveHistory(folder, operations) {
  await mkdir(historyDir(folder), { recursive: true });
  const file = path.join(historyDir(folder), `${new Date().toISOString().replaceAll(':', '-')}.json`);
  await writeFile(file, JSON.stringify({ createdAt: new Date().toISOString(), operations }, null, 2)); return file;
}
export async function undoLast(folder) {
  const { readdir } = await import('node:fs/promises');
  const files = (await readdir(historyDir(folder))).filter(file => file.endsWith('.json')).sort();
  if (!files.length) throw new Error('Aucune opération à annuler.');
  const file = path.join(historyDir(folder), files.at(-1)); const history = JSON.parse(await readFile(file, 'utf8'));
  const reversible = history.operations.filter(operation => operation.type === 'move').reverse();
  for (const operation of reversible) { await mkdir(path.dirname(operation.source), { recursive: true }); await rename(operation.destination, operation.source); }
  return { file, count: reversible.length, skippedDeletes: history.operations.filter(operation => operation.type === 'delete').length };
}
