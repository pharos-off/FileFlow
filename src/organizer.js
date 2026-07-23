import path from 'node:path';
import { access } from 'node:fs/promises';
import { categoryLabel } from './mime.js';
import { formatDate, formatTime, sanitizeName } from './utils.js';

function dateFolder(date, grouping) {
  if (grouping === 'month') return new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(date).replace(/^./, c => c.toUpperCase());
  return String(date.getFullYear());
}
function renamed(file, config) {
  if (!config.renameFiles) return file.name;
  const ext = path.extname(file.name); const stem = config.renamePattern
    .replaceAll('{date}', formatDate(file.modified)).replaceAll('{time}', formatTime(file.modified))
    .replaceAll('{name}', path.basename(file.name, ext));
  return `${sanitizeName(stem)}${ext.toLowerCase()}`;
}
async function exists(file) { try { await access(file); return true; } catch { return false; } }
export async function buildPlan(files, folder, config, duplicateGroups = []) {
  const duplicatePaths = new Set(duplicateGroups.flatMap(group => group.slice(1).map(file => file.path)));
  const claimed = new Set(); const operations = [];
  for (const file of files) {
    const duplicate = duplicatePaths.has(file.path);
    if (duplicate && config.duplicateAction === 'ignore') continue;
    if (duplicate && config.duplicateAction === 'delete') { operations.push({ type: 'delete', source: file.path, file }); continue; }
    let destinationDir = duplicate ? path.join(folder, 'Duplicates') : path.join(folder, categoryLabel(file.category));
    if (!duplicate && config.sortByDate) destinationDir = path.join(destinationDir, dateFolder(file.modified, config.dateGrouping));
    let name = renamed(file, config); let destination = path.join(destinationDir, name); let index = 1;
    while (claimed.has(destination) || (path.resolve(destination) !== path.resolve(file.path) && await exists(destination))) {
      const ext = path.extname(name); destination = path.join(destinationDir, `${path.basename(name, ext)} (${index++})${ext}`);
    }
    claimed.add(destination);
    if (path.resolve(destination) !== path.resolve(file.path)) operations.push({ type: 'move', source: file.path, destination, file });
  }
  return operations;
}
