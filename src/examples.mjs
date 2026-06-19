// Expose the committed golden specs as starter examples (zero authoring cost).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, basename } from 'node:path';

const ROOT = fileURLToPath(new URL('../test/specs/', import.meta.url));

function walk(dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

export function listExamples() {
  return walk(ROOT).map(p => {
    let s = {};
    try { s = JSON.parse(readFileSync(p, 'utf8')); } catch { /* skip malformed */ }
    return { id: basename(p, '.json'), type: s.type || s.preset || 'flow', title: s.title || '', path: p };
  }).sort((a, b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id));
}

export function getExample(id) {
  const hit = listExamples().find(e => e.id === id);
  if (!hit) throw new Error(`no example "${id}" — try list_examples`);
  return JSON.parse(readFileSync(hit.path, 'utf8'));
}
