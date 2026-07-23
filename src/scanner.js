import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { categoryFromExtension, categoryFromSignature } from './mime.js';

export async function scan(folder, { recursive = false, ignoreHiddenFiles = true } = {}) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (ignoreHiddenFiles && entry.name.startsWith('.')) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) { if (recursive) await visit(fullPath); continue; }
      if (!entry.isFile()) continue;
      const info = await stat(fullPath);
      const signatureCategory = await categoryFromSignature(fullPath);
      files.push({ path: fullPath, name: entry.name, size: info.size, modified: info.mtime, category: signatureCategory || categoryFromExtension(entry.name) });
    }
  }
  await visit(folder); return files;
}
