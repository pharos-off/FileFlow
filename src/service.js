import path from 'node:path';
import { stat } from 'node:fs/promises';
import { loadConfig } from './config.js';
import { scan } from './scanner.js';
import { findDuplicates } from './duplicate.js';
import { buildPlan } from './organizer.js';
import { applyPlan } from './mover.js';
import { saveHistory, undoLast } from './history.js';
import { log } from './logger.js';

const temporary = /(^\.DS_Store$|^Thumbs\.db$|\.(tmp|bak|old|cache)$)/i;
const summarize = files => Object.fromEntries(Object.entries(Object.groupBy(files, file => file.category)).map(([category, list]) => [category, list.length]));

export async function makePlan(folderInput, overrides = {}) {
  if (!folderInput || typeof folderInput !== 'string') throw new Error('Indiquez un dossier à organiser.');
  const folder = path.resolve(folderInput.trim()); const info = await stat(folder);
  if (!info.isDirectory()) throw new Error('Le chemin fourni doit être un dossier.');
  const config = { ...await loadConfig(folder, overrides.configPath), ...overrides };
  delete config.configPath;
  const files = await scan(folder, config);
  const duplicateGroups = config.detectDuplicates ? await findDuplicates(files) : [];
  let operations = await buildPlan(files, folder, config, duplicateGroups);
  if (config.cleanTemporaryFiles) operations = [...operations, ...files.filter(file => temporary.test(file.name)).map(file => ({ type: 'delete', source: file.path, file }))];
  return { folder, config, files, duplicateGroups, operations, summary: { total: files.length, categories: summarize(files), duplicates: duplicateGroups.reduce((total, group) => total + group.length - 1, 0), moves: operations.filter(operation => operation.type === 'move').length, deletes: operations.filter(operation => operation.type === 'delete').length } };
}

export async function execute(folder, overrides) {
  const plan = await makePlan(folder, overrides); const completed = await applyPlan(plan.operations);
  if (plan.config.createUndoHistory) await saveHistory(plan.folder, completed);
  if (plan.config.createLogs) await log(plan.folder, `${completed.length} opération(s) effectuée(s) depuis l’interface.`);
  return { count: completed.length, summary: plan.summary };
}

export { undoLast };
