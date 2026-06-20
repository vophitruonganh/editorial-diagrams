import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { decode as toonDecode } from '@toon-format/toon';
import { optimizePng, resizePng } from './imageutil.mjs';
import { loadConfig } from './config.mjs';
import { renderByType } from './router.mjs';
import { loadThemeCss } from './themes/index.mjs';
import { renderHtml } from './render.mjs';
import { validateSpec } from './validate.mjs';
import { describeSpecSchema, describeForType } from './describe.mjs';
import { scaffoldSpec, scaffoldTypes } from './scaffold.mjs';
import { listExamples, getExample } from './examples.mjs';

const text = (t) => ({ type: 'text', text: t });
const errorResult = (msg) => ({ isError: true, content: [text(msg)] });

// return_image policy: 'auto' (default) = full-res file on disk + downscaled inline
// preview; 'full' = full-res inline png; 'none' = path only. Booleans map true→auto, false→none.
function returnMode(v) {
  if (v === false) return 'none';
  if (v === true || v === undefined) return 'auto';
  return ['auto', 'full', 'none', 'link'].includes(v) ? v : 'auto';
}

// preview downscale factor: cap the WIDTH (text legibility scales with width, so a
// tall diagram stays readable for verification) while cutting image tokens. The
// on-disk file is always full-res; only the inline preview is downscaled.
export function previewScaleFor(w, h, capWidth = 900) {
  return Math.max(0.3, Math.min(1, capWidth / w));
}

const DEFAULT_OUT_DIR = join(process.cwd(), 'diagrams-out');

// Accepts a spec object, a JSON string, or a TOON string (token-efficient input).
export function parseSpec(raw, isToon) {
  if (raw == null || typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return raw;
  if (isToon) return toonDecode(raw);
  try { return JSON.parse(raw); } catch { return toonDecode(raw); }
}

function loadSpec(args) {
  if (args.spec && args.spec_path) throw new Error('pass `spec` or `spec_path`, not both');
  if (args.spec) return parseSpec(args.spec);
  if (args.spec_path) {
    const p = resolve(args.spec_path);
    return parseSpec(readFileSync(p, 'utf8'), p.endsWith('.toon'));
  }
  throw new Error('one of `spec` or `spec_path` is required');
}

function outPathFor(args, cfg, spec, ext) {
  if (args.out_path) return resolve(args.out_path);
  const id = (spec && spec.id) || 'diagram';
  const dir = cfg.out_dir ? resolve(cfg.out_dir) : DEFAULT_OUT_DIR;
  return join(dir, `${id}.${ext}`);
}

export async function renderDiagram(args = {}) {
  let spec;
  try { spec = loadSpec(args); } catch (e) { return errorResult(e.message); }

  const v = validateSpec(spec);
  if (!v.valid) return errorResult(`Invalid spec — not rendered:\n• ${v.errors.join('\n• ')}`);

  // defaults: per-call arg > config file > built-in
  const cfg = loadConfig();
  const format = args.format ?? cfg.format ?? 'png';
  if (!['png', 'pdf', 'svg'].includes(format)) return errorResult(`unknown format "${format}" (png|pdf|svg)`);

  const css = loadThemeCss('editorial');
  const scale = args.scale ?? cfg.scale ?? 2;
  const width = args.width ?? cfg.width ?? 1320;
  const transparent = args.transparent ?? cfg.transparent ?? false;
  let rendered, html;
  try {
    html = await renderByType(spec, css);
    rendered = await renderHtml(html, { format, scale, width, transparent, css });
  } catch (e) {
    return errorResult(`render failed: ${e.message}`);
  }

  const outPath = outPathFor(args, cfg, spec, rendered.ext);
  mkdirSync(dirname(outPath), { recursive: true });
  // lossless-optimize PNG files (sharp: same pixels, smaller bytes); pdf/svg unchanged.
  const fileBuf = format === 'png' ? await optimizePng(rendered.buffer) : rendered.buffer;
  writeFileSync(outPath, fileBuf);

  const meta = `Rendered ${format.toUpperCase()} ${rendered.width}×${rendered.height} (${fileBuf.length} bytes) → ${outPath}`;
  const content = [text(meta)];
  const mode = returnMode(args.return_image ?? cfg.return_image);
  try {
    if (mode === 'link') {
      // resource link: client can show the file to the user; no pixels enter model context
      content.push({ type: 'resource_link', uri: pathToFileURL(outPath).href, name: basename(outPath), mimeType: rendered.mimeType });
    } else if (mode === 'full') {
      const png = format === 'png' ? fileBuf : (await renderHtml(html, { format: 'png', scale, width, transparent, css })).buffer;
      content.push({ type: 'image', data: png.toString('base64'), mimeType: 'image/png' });
    } else if (mode === 'auto') {
      const cap = args.preview_width ?? cfg.preview_width ?? 900;
      let prev = null;
      if (format === 'png') {
        const r = await resizePng(fileBuf, Math.min(cap, rendered.pxWidth || rendered.width)); // sharp Lanczos, 1 render total
        if (r) prev = r;
      }
      if (!prev) {                                                    // fallback: 2nd browser render
        const ps = previewScaleFor(rendered.width, rendered.height, cap);
        const r = await renderHtml(html, { format: 'png', scale: ps, width, transparent, css });
        prev = { buffer: r.buffer, width: r.pxWidth, height: r.pxHeight };
      }
      content[0] = text(`${meta} · inline preview ${prev.width}×${prev.height}px (file on disk is full-res)`);
      content.push({ type: 'image', data: prev.buffer.toString('base64'), mimeType: 'image/png' });
    }
    // 'none' → path/metadata only
  } catch (e) {
    content.push(text(`(inline preview skipped: ${e.message})`));
  }
  return { content };
}

export function validateSpecTool(args = {}) {
  let spec;
  try { spec = parseSpec(args.spec); }
  catch (e) { return { content: [text(JSON.stringify({ valid: false, errors: ['could not parse spec: ' + e.message] }, null, 2))] }; }
  const r = validateSpec(spec);
  return { content: [text(JSON.stringify(r, null, 2))] };
}

export function describeSchemaTool(args = {}) {
  const d = args.type ? describeForType(args.type) : describeSpecSchema(args.topic);
  return { content: [text(d.cheatsheet + '\n\n--- JSON Schema ---\n' + JSON.stringify(d.schema, null, 2))] };
}

// scaffold_spec: write a starter spec skeleton to disk (Claude edits deltas).
export function scaffoldSpecTool(args = {}) {
  let spec;
  try { spec = scaffoldSpec(args.type); } catch (e) { return errorResult(e.message); }
  const json = JSON.stringify(spec, null, 2);
  let note = '';
  if (args.out_path) {
    const out = resolve(args.out_path);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, json + '\n');
    note = `Scaffold written → ${out}\nEdit the placeholders, then render_diagram with spec_path.\n\n`;
  }
  return { content: [text(note + json)] };
}

export function listExamplesTool() {
  const rows = listExamples().map(e => `${e.type.padEnd(14)} ${e.id}${e.title ? '  — ' + e.title : ''}`).join('\n');
  return { content: [text('Available examples (get_example <id>):\n' + rows)] };
}

export function getExampleTool(args = {}) {
  let spec;
  try { spec = getExample(args.id); } catch (e) { return errorResult(e.message); }
  return { content: [text(JSON.stringify(spec, null, 2))] };
}

export { scaffoldTypes };
