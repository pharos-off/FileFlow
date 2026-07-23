import { access, mkdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';

export async function applyPlan(operations) {
  const completed = [];
  for (const operation of operations) {
    if (operation.type === 'delete') { await unlink(operation.source); completed.push(operation); continue; }
    try { await access(operation.destination); throw new Error(`Destination déjà existante : ${operation.destination}`); } catch (error) { if (!error?.code || error.code !== 'ENOENT') throw error; }
    await mkdir(path.dirname(operation.destination), { recursive: true });
    await rename(operation.source, operation.destination); completed.push(operation);
  }
  return completed;
}
