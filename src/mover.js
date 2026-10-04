import { access, mkdir, rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function applyPlan(operations) {
  const moves = operations.filter(operation => operation.type === 'move');
  const deletions = operations.filter(operation => operation.type === 'delete');
  for (const operation of [...moves, ...deletions]) {
    if (!await exists(operation.source)) throw new Error(`Fichier source introuvable : ${operation.source}`);
    if (operation.file) {
      const current = await stat(operation.source);
      if (current.size !== operation.file.size || current.mtime.getTime() !== operation.file.modified.getTime()) {
        throw new Error(`Le fichier a changé depuis l’aperçu : ${operation.source}`);
      }
    }
    if (operation.type === 'move' && await exists(operation.destination)) {
      throw new Error(`Destination déjà existante : ${operation.destination}`);
    }
  }

  const completed = [];
  try {
    for (const operation of moves) {
      await mkdir(path.dirname(operation.destination), { recursive: true });
      await rename(operation.source, operation.destination);
      completed.push(operation);
    }
    for (const operation of deletions) {
      await unlink(operation.source);
      completed.push(operation);
    }
    return completed;
  } catch (error) {
    const rollbackErrors = [];
    for (const operation of completed.filter(item => item.type === 'move').reverse()) {
      try {
        await mkdir(path.dirname(operation.source), { recursive: true });
        await rename(operation.destination, operation.source);
      } catch (rollbackError) {
        rollbackErrors.push(`${operation.destination} → ${operation.source}: ${rollbackError.message}`);
      }
    }
    const removed = completed.filter(item => item.type === 'delete').length;
    const details = [
      `Échec de l’opération : ${error.message}`,
      removed ? `${removed} suppression(s) ont déjà été effectuées et ne peuvent pas être restaurées.` : '',
      rollbackErrors.length ? `Échec de l’annulation automatique : ${rollbackErrors.join('; ')}` : ''
    ].filter(Boolean).join(' ');
    throw new Error(details, { cause: error });
  }
}
