import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { renderByType } from './router.mjs';
import { loadThemeCss } from './themes/index.mjs';
import { renderHtml } from './render.mjs';
import { validateSpec } from './validate.mjs';
import { describeSpecSchema, describeForType } from './describe.mjs';

const text = (t) => ({ type: 'text', text: t });
const errorResult = (msg) => ({ isError: true, content: [text(msg)] });

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
  let rendered;
  try {
    const html = renderByType(spec, css);
    rendered = await renderHtml(html, {
      format,
      scale: args.scale ?? 2,
      width: args.width ?? 1320,
      transparent: !!args.transparent,
      css,
    });
  } catch (e) {
    return errorResult(`render failed: ${e.message}`);
  }

  const outPath = outPathFor(args, spec, rendered.ext);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, rendered.buffer);

  const meta = `Rendered ${format.toUpperCase()} ${rendered.width}×${rendered.height}px (${rendered.buffer.length} bytes) → ${outPath}`;
  const content = [text(meta)];
  const wantImage = args.return_image !== false;
  if (wantImage && format === 'png') {
    content.push({ type: 'image', data: rendered.buffer.toString('base64'), mimeType: 'image/png' });
  } else if (wantImage && format !== 'png') {
    content.push(text(`(inline image is only returned for PNG; ${format} written to disk above)`));
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
