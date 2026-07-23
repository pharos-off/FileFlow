import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

export function hashFile(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(file).on('error', reject).on('data', chunk => hash.update(chunk)).on('end', () => resolve(hash.digest('hex')));
  });
}
export async function findDuplicates(files) {
  const groups = new Map();
  for (const file of files) {
    const key = `${file.size}:${await hashFile(file.path)}`;
    const group = groups.get(key) || []; group.push(file); groups.set(key, group);
  }
  return [...groups.values()].filter(group => group.length > 1);
}
