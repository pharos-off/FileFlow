import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export async function log(folder, message) {
  const directory = path.join(folder, 'logs'); await mkdir(directory, { recursive: true });
  await appendFile(path.join(directory, 'latest.log'), `[${new Date().toISOString()}] ${message}\n`);
}
