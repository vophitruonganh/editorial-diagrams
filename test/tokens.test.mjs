import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expandDefs } from '../src/defs.mjs';
import { previewScaleFor, renderDiagram } from '../src/tools.mjs';
import { renderByType } from '../src/router.mjs';
import { validateSpec } from '../src/validate.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';
import { closeBrowser } from '../src/browser.mjs';

const css = loadThemeCss();
const out = join(tmpdir(), 'edm-tokens.png');
after(() => { closeBrowser(); if (existsSync(out)) rmSync(out); });

test('expandDefs replaces $name in values and inside card DSL', () => {
  const s = expandDefs({ type: 'flowchart', title: 'T', defs: { go: '[Go · REST]' }, nodes: [{ id: 'a', card: 'API|$go|x' }], edges: [] });
  assert.ok(!('defs' in s));
  assert.match(s.nodes[0].card, /\[Go · REST\]/);
});

test('expandDefs leaves unknown $refs untouched and is a no-op without defs', () => {
  assert.equal(expandDefs({ title: 'T', defs: {}, x: '$unknown' }).x, '$unknown');
  const noDefs = { title: 'T', x: '$5 literal' };
  assert.equal(expandDefs(noDefs).x, '$5 literal');
});

test('previewScaleFor caps the WIDTH (keeps text legible; file stays full-res)', () => {
  assert.equal(previewScaleFor(600, 800, 900), 1);     // narrower than cap → no downscale (readable)
  assert.equal(previewScaleFor(1800, 500, 900), 0.5);  // wide → half by width
  assert.equal(previewScaleFor(5000, 500, 900), 0.3);  // clamp floor
});

test('defs spec validates AND renders expanded', () => {
  const spec = { type: 'flowchart', title: 'T', defs: { t: '[tech]' }, nodes: [{ id: 'a', card: 'A|$t' }, { id: 'b', card: 'B' }], edges: [{ from: 'a', to: 'b' }] };
  assert.equal(validateSpec(spec).valid, true);
  assert.match(renderByType(spec, css), /\[tech\]/);
});

test('render_diagram auto returns a preview while writing a full-res file', async () => {
  const spec = { type: 'flowchart', title: 'T', nodes: [{ id: 'a', card: 'A' }, { id: 'b', card: 'B' }], edges: [{ from: 'a', to: 'b' }] };
  const res = await renderDiagram({ spec, format: 'png', scale: 2, out_path: out, return_image: 'auto', preview_width: 600 });
  assert.ok(existsSync(out));
  assert.ok(res.content.some(c => c.type === 'image' && c.mimeType === 'image/png'));
  assert.match(res.content[0].text, /full-res/);
});
