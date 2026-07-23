import { open } from 'node:fs/promises';
import path from 'node:path';

const extensionCategories = {
  image: ['jpg','jpeg','png','gif','webp','svg','bmp','tif','tiff','heic','raw','cr2','nef'],
  video: ['mp4','mkv','avi','mov','wmv','webm','m4v','flv'],
  music: ['mp3','wav','flac','aac','ogg','m4a','wma'],
  document: ['doc','docx','xls','xlsx','ppt','pptx','txt','odt','ods','odp','rtf','csv'],
  archive: ['zip','rar','7z','tar','gz','bz2','xz','tgz'],
  program: ['exe','msi','app','dmg','deb','rpm','apk','iso'],
  font: ['ttf','otf','woff','woff2','eot'],
  code: ['js','mjs','cjs','ts','tsx','jsx','py','java','cs','cpp','c','h','hpp','rs','go','php','html','htm','css','scss','json','xml','yml','yaml','sql','sh','ps1'],
  model3d: ['obj','fbx','stl','blend','gltf','glb','dae','3ds'],
  pdf: ['pdf'], ebook: ['epub','mobi','azw','azw3']
};
const labels = { image: 'Images', video: 'Videos', music: 'Music', document: 'Documents', archive: 'Archives', program: 'Programs', font: 'Fonts', code: 'Code', model3d: '3D Models', pdf: 'PDF', ebook: 'E-books', other: 'Other' };

export function categoryFromExtension(file) {
  const extension = path.extname(file).slice(1).toLowerCase();
  return Object.entries(extensionCategories).find(([, values]) => values.includes(extension))?.[0] || 'other';
}
export function categoryLabel(category) { return labels[category] || labels.other; }

export async function categoryFromSignature(file) {
  let handle;
  try {
    handle = await open(file, 'r'); const buffer = Buffer.alloc(16); await handle.read(buffer, 0, 16, 0);
    const hex = buffer.toString('hex'); const text = buffer.toString('utf8');
    if (hex.startsWith('ffd8ff') || hex.startsWith('89504e470d0a1a0a') || hex.startsWith('47494638') || hex.startsWith('52494646') || text.startsWith('<svg')) return 'image';
    if (hex.startsWith('25504446')) return 'pdf';
    if (hex.startsWith('504b0304')) return 'archive';
    if (hex.startsWith('377abcaf271c') || hex.startsWith('526172211a07')) return 'archive';
    if (hex.startsWith('1f8b08') || hex.startsWith('425a68')) return 'archive';
    if (hex.startsWith('000000') && buffer.subarray(4, 8).toString() === 'ftyp') return 'video';
    if (text.startsWith('ID3') || hex.startsWith('fff')) return 'music';
  } catch { return null; } finally { await handle?.close(); }
  return null;
}
