import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encode } from '@toon-format/toon';
import { parseSpec, renderDiagram, validateSpecTool } from '../src/tools.mjs';
import { renderByType } from '../src/router.mjs';
import { renderHtml } from '../src/render.mjs';
import { optimizePng, resizePng, hasSharp } from '../src/imageutil.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';
import { closeBrowser } from '../src/browser.mjs';

const css = loadThemeCss();
const spec = { type: 'flowchart', title: 'T', nodes: [{ id: 'a', card: 'A' }, { id: 'b', card: 'B' }, { id: 'c', card: 'C' }], edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }] };
const out = join(tmpdir(), 'edm-h.png');
after(() => { closeBrowser(); if (existsSync(out)) rmSync(out); });

test('TOON: parseSpec decodes a TOON string round-trip + renders', async () => {
  const toon = encode(spec);
  assert.deepEqual(parseSpec(toon), spec);            // lossless
  assert.match(await renderByType(parseSpec(toon), css), /class="card"/);
});

test('TOON / JSON string both accepted; validate_spec parses strings', async () => {
  assert.equal(parseSpec(JSON.stringify(spec)).type, 'flowchart');
  const r = validateSpecTool({ spec: encode(spec) });
  assert.match(r.content[0].text, /"valid": ?true/);
});

test('return_image:link returns a resource_link (no inline image)', async () => {
  const res = await renderDiagram({ spec, format: 'png', out_path: out, return_image: 'link' });
  assert.ok(res.content.some(c => c.type === 'resource_link' && c.uri.startsWith('file://')));
  assert.ok(!res.content.some(c => c.type === 'image'));
  assert.ok(existsSync(out));
});

test('sharp optimizePng + resizePng (graceful if sharp missing)', async () => {
  const r = await renderHtml(await renderByType(spec, css), { format: 'png', scale: 2, css });
  const opt = await optimizePng(r.buffer);
  assert.deepEqual([...opt.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  const small = await resizePng(r.buffer, 300);
  if (await hasSharp()) { assert.ok(small && small.width <= 300); assert.deepEqual([...small.buffer.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]); }
  else assert.equal(small, null);
});

test('auto preview respects preview_width cap', async () => {
  const res = await renderDiagram({ spec, format: 'png', out_path: out, return_image: 'auto', preview_width: 500 });
  assert.ok(res.content.some(c => c.type === 'image'));
  const m = res.content[0].text.match(/preview (\d+)×/);
  assert.ok(m && Number(m[1]) <= 500, `preview width ${m && m[1]} should be ≤ 500`);
});
