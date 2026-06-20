// Plugin config: user-set defaults for render options, merged UNDER per-call args.
//
// Two sources, in priority:
//   1. Claude Code plugin UI — declared in plugin.json `userConfig`, exported to this
//      server process as CLAUDE_PLUGIN_OPTION_<KEY> env vars (this is what the
//      "manage plugin" configuration dialog edits).
//   2. A config file (for standalone / dev use, when not running via the plugin UI):
//      ./editorial-diagrams.config.json → ~/.config/editorial-diagrams/config.json →
//      $EDITORIAL_DIAGRAMS_CONFIG.
// If the UI env vars are present they win; otherwise the file is used.
// Keys: format, scale, width, transparent, preview_width, return_image, out_dir.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

let cached;
const OPTS = ['format', 'scale', 'width', 'transparent', 'preview_width', 'return_image', 'out_dir'];

function readJson(p) {
  try { return p && existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null; }
  catch { return null; }
}

function fileConfig() {
  const sources = [
    join(homedir(), '.config', 'editorial-diagrams', 'config.json'),
    join(process.cwd(), 'editorial-diagrams.config.json'),
    process.env.EDITORIAL_DIAGRAMS_CONFIG,
  ];
  let merged = {};
  for (const p of sources) {
    const c = readJson(p);
    if (c && typeof c === 'object' && !Array.isArray(c)) merged = { ...merged, ...c };
  }
  return merged;
}

function envConfig() {
  const e = process.env;
  const get = k => e['CLAUDE_PLUGIN_OPTION_' + k.toUpperCase()] ?? e['CLAUDE_PLUGIN_OPTION_' + k];
  const o = {};
  for (const k of OPTS) {
    const v = get(k);
    if (v === undefined || v === '') continue;
    if (k === 'transparent') o[k] = /^(1|true|yes|on)$/i.test(String(v));
    else if (k === 'scale' || k === 'preview_width' || k === 'width') o[k] = Number(v);
    else o[k] = v;
  }
  return o;
}

export function loadConfig() {
  if (cached) return cached;
  const ui = envConfig();
  cached = Object.keys(ui).length ? ui : fileConfig();
  return cached;
}

// for tests / live reload
export function resetConfigCache() { cached = undefined; }
