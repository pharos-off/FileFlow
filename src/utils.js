import path from 'node:path';

export function formatDate(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function formatTime(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}
export function sanitizeName(value) {
  return value.replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').trim() || 'file';
}
export function pathInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}
