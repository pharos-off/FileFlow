import path from 'node:path';
import { stat } from 'node:fs/promises';
import { loadConfig, validateConfig } from './config.js';
import { scan } from './scanner.js';
import { findDuplicates } from './duplicate.js';
import { buildPlan, isTemporaryFile } from './organizer.js';
import { applyPlan } from './mover.js';
import { saveHistory, undoLast } from './history.js';
import { log } from './logger.js';

const summarize = files => files.reduce((categories, file) => {
  categories[file.category] = (categories[file.category] || 0) + 1;
  return categories;
}, {});

export async function makePlan(folderInput, overrides = {}) {
  if (!folderInput || typeof folderInput !== 'string') throw new Error('Indiquez un dossier à organiser.');
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) throw new Error('Les options doivent être un objet.');
  if (overrides.recursive !== undefined && typeof overrides.recursive !== 'boolean') throw new Error('recursive doit être un booléen.');
  if (overrides.configPath !== undefined && typeof overrides.configPath !== 'string') throw new Error('configPath doit être une chaîne de caractères.');
  const folder = path.resolve(folderInput.trim()); const info = await stat(folder);
  if (!info.isDirectory()) throw new Error('Le chemin fourni doit être un dossier.');
  const config = validateConfig({ ...await loadConfig(folder, overrides.configPath), ...overrides });
  delete config.configPath;
  const files = await scan(folder, config);
  const duplicateGroups = config.detectDuplicates ? await findDuplicates(files) : [];
  let operations = await buildPlan(files, folder, config, duplicateGroups);
  if (config.cleanTemporaryFiles) operations = [...operations, ...files.filter(isTemporaryFile).map(file => ({ type: 'delete', source: file.path, file }))];
  return { folder, config, files, duplicateGroups, operations, summary: { total: files.length, categories: summarize(files), duplicates: duplicateGroups.reduce((total, group) => total + group.length - 1, 0), moves: operations.filter(operation => operation.type === 'move').length, deletes: operations.filter(operation => operation.type === 'delete').length } };
}

export async function executePlan(plan) {
  const completed = await applyPlan(plan.operations);
  if (plan.config.createUndoHistory) await saveHistory(plan.folder, completed);
  if (plan.config.createLogs) await log(plan.folder, `${completed.length} opération(s) effectuée(s) depuis l’interface.`);
  return { count: completed.length, summary: plan.summary };
}

export async function execute(folder, overrides) {
  return executePlan(await makePlan(folder, overrides));
}

export { undoLast };
