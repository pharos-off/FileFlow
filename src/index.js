#!/usr/bin/env node
import path from 'node:path';
import { stat } from 'node:fs/promises';
import { loadConfig } from './config.js';
import { scan } from './scanner.js';
import { findDuplicates } from './duplicate.js';
import { buildPlan } from './organizer.js';
import { applyPlan } from './mover.js';
import { saveHistory, undoLast } from './history.js';
import { log } from './logger.js';

function usage() { console.log(`FileFlow — organise vos fichiers hors ligne\n\nUsage : fileflow <dossier> [options]\n\nOptions:\n  --apply              Exécute les changements (sinon aperçu)\n  --undo               Annule la dernière exécution\n  --recursive           Analyse les sous-dossiers\n  --by-date [year|month] Crée des sous-dossiers par date\n  --rename              Renomme en date_heure\n  --clean               Supprime .tmp, .bak, .old, .cache, .DS_Store, Thumbs.db\n  --config <fichier>   Utilise une configuration JSON\n  --help               Affiche cette aide`); }
function options(args) { const value = flag => { const index = args.indexOf(flag); return index === -1 ? undefined : args[index + 1]; }; return { apply: args.includes('--apply'), undo: args.includes('--undo'), recursive: args.includes('--recursive'), byDate: args.includes('--by-date'), dateGrouping: value('--by-date'), rename: args.includes('--rename'), clean: args.includes('--clean'), config: value('--config') }; }
function cleanCandidates(files) { return files.filter(file => /(^\.DS_Store$|^Thumbs\.db$|\.(tmp|bak|old|cache)$)/i.test(file.name)); }

async function main() {
  const args = process.argv.slice(2); if (!args.length || args.includes('--help')) return usage();
  const folderArg = args.find(arg => !arg.startsWith('--') && arg !== options(args).dateGrouping && arg !== options(args).config);
  if (!folderArg) return usage(); const folder = path.resolve(folderArg); const info = await stat(folder); if (!info.isDirectory()) throw new Error('Le chemin fourni doit être un dossier.');
  const flags = options(args); const config = await loadConfig(folder, flags.config);
  if (flags.byDate) { config.sortByDate = true; config.dateGrouping = flags.dateGrouping === 'month' ? 'month' : 'year'; } if (flags.rename) config.renameFiles = true; if (flags.clean) config.cleanTemporaryFiles = true;
  if (flags.undo) { const result = await undoLast(folder); console.log(`Annulation terminée : ${result.count} déplacement(s) restauré(s).${result.skippedDeletes ? ` ${result.skippedDeletes} suppression(s) ne peuvent pas être restaurées.` : ''}`); return; }
  const files = await scan(folder, { recursive: flags.recursive, ignoreHiddenFiles: config.ignoreHiddenFiles });
  const duplicates = config.detectDuplicates ? await findDuplicates(files) : []; let plan = await buildPlan(files, folder, config, duplicates);
  if (config.cleanTemporaryFiles) plan = [...plan, ...cleanCandidates(files).map(file => ({ type: 'delete', source: file.path, file }))];
  const counts = Object.groupBy(files, file => file.category); console.log(`\n${files.length} fichier(s) trouvé(s)`); for (const [category, list] of Object.entries(counts)) console.log(`  ${list.length} ${category}`); console.log(`\n${duplicates.reduce((total, group) => total + group.length - 1, 0)} doublon(s) — ${plan.filter(o => o.type === 'move').length} déplacement(s), ${plan.filter(o => o.type === 'delete').length} suppression(s) prévu(s).`);
  for (const operation of plan.slice(0, 20)) console.log(`  ${operation.type === 'delete' ? 'SUPPRIMER' : 'DÉPLACER'} ${path.basename(operation.source)}${operation.destination ? ` → ${path.relative(folder, operation.destination)}` : ''}`);
  if (plan.length > 20) console.log(`  … et ${plan.length - 20} autre(s).`);
  if (!flags.apply) { console.log('\nAucun fichier modifié. Relancez avec --apply pour confirmer.'); return; }
  const completed = await applyPlan(plan); if (config.createUndoHistory) await saveHistory(folder, completed); if (config.createLogs) await log(folder, `${completed.length} opération(s) effectuée(s).`); console.log(`\nTerminé : ${completed.length} opération(s). Utilisez --undo pour restaurer les déplacements.`);
}
main().catch(error => { console.error(`Erreur : ${error.message}`); process.exitCode = 1; });
