import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const defaults = {
  sortByDate: false, dateGrouping: 'year', detectDuplicates: true,
  duplicateAction: 'duplicates', renameFiles: false, renamePattern: '{date}_{time}',
  cleanTemporaryFiles: false, createLogs: true, createUndoHistory: true,
  ignoreHiddenFiles: true
};

const booleanOptions = [
  'sortByDate', 'detectDuplicates', 'renameFiles', 'cleanTemporaryFiles',
  'createLogs', 'createUndoHistory', 'ignoreHiddenFiles'
];

export function validateConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('La configuration doit être un objet JSON.');
  }
  for (const key of booleanOptions) {
    if (typeof config[key] !== 'boolean') throw new Error(`Option de configuration invalide : ${key} doit être un booléen.`);
  }
  if (!['year', 'month'].includes(config.dateGrouping)) {
    throw new Error('dateGrouping doit valoir "year" ou "month".');
  }
  if (!['duplicates', 'delete', 'ignore'].includes(config.duplicateAction)) {
    throw new Error('duplicateAction doit valoir "duplicates", "delete" ou "ignore".');
  }
  if (typeof config.renamePattern !== 'string' || !config.renamePattern.trim()) {
    throw new Error('renamePattern doit être une chaîne non vide.');
  }
  return config;
}

export async function loadConfig(folder, configPath) {
  const candidate = configPath || path.join(folder, 'config.json');
  try {
    const parsed = JSON.parse(await readFile(candidate, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('La configuration doit être un objet JSON.');
    }
    return validateConfig({ ...defaults, ...parsed });
  } catch (error) {
    if (error.code === 'ENOENT' && !configPath) return { ...defaults };
    throw new Error(`Configuration invalide (${candidate}) : ${error.message}`);
  }
}
