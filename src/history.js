import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathInside } from './utils.js';

const historyDir = folder => path.join(folder, 'history');
async function exists(file) {
  try {
    await access(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function saveHistory(folder, operations) {
  await mkdir(historyDir(folder), { recursive: true });
  const createdAt = new Date().toISOString();
  const base = createdAt.replaceAll(':', '-').replace('.', '-');
  let index = 0;
  while (true) {
    const suffix = index ? `-${index}` : '';
    const file = path.join(historyDir(folder), `${base}${suffix}.json`);
    try {
      await writeFile(file, JSON.stringify({ createdAt, operations }, null, 2), { flag: 'wx' });
      return file;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      index++;
    }
  }
}

export async function undoLast(folder) {
  const { readdir } = await import('node:fs/promises');
  const files = (await readdir(historyDir(folder))).filter(file => file.endsWith('.json')).sort();
  if (!files.length) throw new Error('Aucune opération à annuler.');
  const file = path.join(historyDir(folder), files.at(-1)); const history = JSON.parse(await readFile(file, 'utf8'));
  if (!Array.isArray(history.operations)) throw new Error('Historique invalide : liste des opérations absente.');
  for (const operation of history.operations) {
    if (operation.type !== 'move' && operation.type !== 'delete') throw new Error('Historique invalide : type d’opération inconnu.');
    if (operation.type === 'move' && (
      typeof operation.source !== 'string' ||
      typeof operation.destination !== 'string' ||
      !pathInside(path.resolve(folder), path.resolve(operation.source)) ||
      !pathInside(path.resolve(folder), path.resolve(operation.destination))
    )) {
      throw new Error('Historique invalide : un déplacement sort du dossier sélectionné.');
    }
  }
  const reversible = history.operations.filter(operation => operation.type === 'move').reverse();
  for (const operation of reversible) {
    if (!await exists(operation.destination)) throw new Error(`Fichier déplacé introuvable : ${operation.destination}`);
    if (await exists(operation.source)) throw new Error(`Impossible de restaurer : le chemin d’origine est déjà occupé (${operation.source}).`);
  }
  const restored = [];
  try {
    for (const operation of reversible) {
      await mkdir(path.dirname(operation.source), { recursive: true });
      await rename(operation.destination, operation.source);
      restored.push(operation);
    }
    await rename(file, file.replace(/\.json$/i, '.undone'));
  } catch (error) {
    const rollbackErrors = [];
    for (const operation of restored.reverse()) {
      try {
        await mkdir(path.dirname(operation.destination), { recursive: true });
        await rename(operation.source, operation.destination);
      } catch (rollbackError) {
        rollbackErrors.push(`${operation.source} → ${operation.destination}: ${rollbackError.message}`);
      }
    }
    if (rollbackErrors.length) throw new Error(`Échec de l’annulation : ${error.message}. Échec de la restauration : ${rollbackErrors.join('; ')}`, { cause: error });
    throw error;
  }
  return { file, count: reversible.length, skippedDeletes: history.operations.filter(operation => operation.type === 'delete').length };
}
