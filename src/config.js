import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const defaults = {
  sortByDate: false, dateGrouping: 'year', detectDuplicates: true,
  duplicateAction: 'duplicates', renameFiles: false, renamePattern: '{date}_{time}',
  cleanTemporaryFiles: false, createLogs: true, createUndoHistory: true,
  ignoreHiddenFiles: true
};

export async function loadConfig(folder, configPath) {
  const candidate = configPath || path.join(folder, 'config.json');
  try {
    return { ...defaults, ...JSON.parse(await readFile(candidate, 'utf8')) };
  } catch (error) {
    if (error.code === 'ENOENT') return { ...defaults };
    throw new Error(`Configuration invalide (${candidate}) : ${error.message}`);
  }
}
