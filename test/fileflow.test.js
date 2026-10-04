import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig } from '../src/config.js';
import { undoLast, saveHistory } from '../src/history.js';
import { buildPlan } from '../src/organizer.js';
import { scan } from '../src/scanner.js';
import { makePlan } from '../src/service.js';
import { applyPlan } from '../src/mover.js';

async function temporaryFolder() {
  return mkdtemp(path.join(os.tmpdir(), 'fileflow-test-'));
}

test('recursive scan ignores root configuration and FileFlow state folders only', async t => {
  const folder = await temporaryFolder();
  t.after(() => rm(folder, { recursive: true, force: true }));
  await mkdir(path.join(folder, 'history'));
  await mkdir(path.join(folder, 'logs'));
  await mkdir(path.join(folder, 'nested', 'history'), { recursive: true });
  await writeFile(path.join(folder, 'config.json'), '{}');
  await writeFile(path.join(folder, 'history', 'run.json'), '{}');
  await writeFile(path.join(folder, 'logs', 'latest.log'), 'log');
  await writeFile(path.join(folder, 'nested', 'history', 'user.txt'), 'keep');
  await writeFile(path.join(folder, 'photo.jpg'), 'image');

  const files = await scan(folder, { recursive: true });
  assert.deepEqual(files.map(file => path.relative(folder, file.path)).sort(), [
    path.join('nested', 'history', 'user.txt'),
    'photo.jpg'
  ].sort());
});

test('cleaning temporary files schedules deletion without also moving them', async t => {
  const folder = await temporaryFolder();
  t.after(() => rm(folder, { recursive: true, force: true }));
  await writeFile(path.join(folder, 'cache.tmp'), 'temporary');
  await writeFile(path.join(folder, 'notes.txt'), 'keep');

  const plan = await makePlan(folder, { cleanTemporaryFiles: true, detectDuplicates: false });
  assert.equal(plan.operations.filter(operation => operation.source.endsWith('cache.tmp')).length, 1);
  assert.equal(plan.operations.find(operation => operation.source.endsWith('cache.tmp')).type, 'delete');
  assert.equal(plan.operations.find(operation => operation.source.endsWith('notes.txt')).type, 'move');
});

test('invalid config values are reported instead of used silently', async t => {
  const folder = await temporaryFolder();
  t.after(() => rm(folder, { recursive: true, force: true }));
  await writeFile(path.join(folder, 'config.json'), JSON.stringify({ duplicateAction: 'overwrite' }));

  await assert.rejects(loadConfig(folder), /duplicateAction/);
  await writeFile(path.join(folder, 'config.json'), '[]');
  await assert.rejects(loadConfig(folder), /objet JSON/);
  await assert.rejects(loadConfig(folder, path.join(folder, 'missing.json')), /introuvable|no such file/i);
});

test('move destinations are preflighted before any source is changed', async t => {
  const folder = await temporaryFolder();
  t.after(() => rm(folder, { recursive: true, force: true }));
  const first = path.join(folder, 'first.txt');
  const second = path.join(folder, 'second.txt');
  const destination = path.join(folder, 'destination.txt');
  await writeFile(first, 'first');
  await writeFile(second, 'second');
  await writeFile(destination, 'already here');

  await assert.rejects(applyPlan([
    { type: 'move', source: first, destination: path.join(folder, 'moved.txt') },
    { type: 'move', source: second, destination }
  ]), /Destination déjà existante/);
  assert.equal(await readFile(first, 'utf8'), 'first');
  assert.equal(await readFile(second, 'utf8'), 'second');
});

test('files modified after planning cannot be moved using the stale plan', async t => {
  const folder = await temporaryFolder();
  t.after(() => rm(folder, { recursive: true, force: true }));
  const source = path.join(folder, 'notes.txt');
  await writeFile(source, 'before');
  const plan = await makePlan(folder, { detectDuplicates: false });
  await writeFile(source, 'changed after preview');

  await assert.rejects(applyPlan(plan.operations), /a changé depuis l’aperçu/);
  assert.equal(await readFile(source, 'utf8'), 'changed after preview');
});

test('undo restores moved files once and refuses to overwrite an occupied source', async t => {
  const folder = await temporaryFolder();
  t.after(() => rm(folder, { recursive: true, force: true }));
  const source = path.join(folder, 'original.txt');
  const destination = path.join(folder, 'organized.txt');
  await writeFile(destination, 'contents');
  await saveHistory(folder, [{ type: 'move', source, destination }]);

  const result = await undoLast(folder);
  assert.equal(result.count, 1);
  assert.equal(await readFile(source, 'utf8'), 'contents');
  await assert.rejects(undoLast(folder), /Aucune opération à annuler/);

  await writeFile(destination, 'second run');
  await saveHistory(folder, [{ type: 'move', source, destination }]);
  await assert.rejects(undoLast(folder), /chemin d’origine est déjà occupé/);
  assert.equal(await readFile(source, 'utf8'), 'contents');
});

test('undo rejects history entries that point outside the selected folder', async t => {
  const folder = await temporaryFolder();
  const outside = path.join(path.dirname(folder), `outside-${path.basename(folder)}.txt`);
  t.after(async () => {
    await rm(folder, { recursive: true, force: true });
    await rm(outside, { force: true });
  });
  await mkdir(path.join(folder, 'history'));
  await writeFile(outside, 'must stay');
  await writeFile(path.join(folder, 'history', 'run.json'), JSON.stringify({
    operations: [{ type: 'move', source: outside, destination: path.join(folder, 'other.txt') }]
  }));

  await assert.rejects(undoLast(folder), /sort du dossier sélectionné/);
  assert.equal(await readFile(outside, 'utf8'), 'must stay');
});

test('files already in their category folder are not scheduled to move', async t => {
  const folder = await temporaryFolder();
  t.after(() => rm(folder, { recursive: true, force: true }));
  const filePath = path.join(folder, 'Images', 'photo.jpg');
  const file = { path: filePath, name: 'photo.jpg', modified: new Date(), category: 'image' };

  assert.deepEqual(await buildPlan([file], folder, { renameFiles: false, sortByDate: false }), []);
});
