import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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
  return ['auto', 'full', 'none'].includes(v) ? v : 'auto';
}

const DEFAULT_OUT_DIR = join(process.cwd(), 'diagrams-out');

function loadSpec(args) {
  if (args.spec && args.spec_path) throw new Error('pass `spec` or `spec_path`, not both');
  if (args.spec) return args.spec;
  if (args.spec_path) return JSON.parse(readFileSync(resolve(args.spec_path), 'utf8'));
  throw new Error('one of `spec` or `spec_path` is required');
}

function outPathFor(args, spec, ext) {
  if (args.out_path) return resolve(args.out_path);
  const id = (spec && spec.id) || 'diagram';
  return join(DEFAULT_OUT_DIR, `${id}.${ext}`);
}

export async function renderDiagram(args = {}) {
  let spec;
  try { spec = loadSpec(args); } catch (e) { return errorResult(e.message); }

  const v = validateSpec(spec);
  if (!v.valid) return errorResult(`Invalid spec — not rendered:\n• ${v.errors.join('\n• ')}`);

  const format = args.format || 'png';
  if (!['png', 'pdf', 'svg'].includes(format)) return errorResult(`unknown format "${format}" (png|pdf|svg)`);

  const css = loadThemeCss('editorial');
  const scale = args.scale ?? 2, width = args.width ?? 1320, transparent = !!args.transparent;
  let rendered, html;
  try {
    html = renderByType(spec, css);
    rendered = await renderHtml(html, { format, scale, width, transparent, css });
  } catch (e) {
    return errorResult(`render failed: ${e.message}`);
  }

  const outPath = outPathFor(args, spec, rendered.ext);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, rendered.buffer);

  const meta = `Rendered ${format.toUpperCase()} ${rendered.width}×${rendered.height}px (${rendered.buffer.length} bytes) → ${outPath}`;
  const content = [text(meta)];
  const mode = returnMode(args.return_image);
  try {
    if (mode === 'full' && format === 'png') {
      content.push({ type: 'image', data: rendered.buffer.toString('base64'), mimeType: 'image/png' });
    } else if (mode === 'full') {
      const png = await renderHtml(html, { format: 'png', scale, width, transparent, css });
      content.push({ type: 'image', data: png.buffer.toString('base64'), mimeType: 'image/png' });
    } else if (mode === 'auto') {
      const preview = await renderHtml(html, { format: 'png', scale: 1, width, transparent, css });
      content[0] = text(`${meta} · inline = downscaled preview (${preview.width}×${preview.height}, ${preview.buffer.length} bytes)`);
      content.push({ type: 'image', data: preview.buffer.toString('base64'), mimeType: 'image/png' });
    }
    // 'none' → path/metadata only
  } catch (e) {
    content.push(text(`(inline preview skipped: ${e.message})`));
  }
  return { content };
}

export function validateSpecTool(args = {}) {
  const r = validateSpec(args.spec);
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
