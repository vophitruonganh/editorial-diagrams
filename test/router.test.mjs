import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderByType } from '../src/router.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';
import { validateSpec } from '../src/validate.mjs';

const css = loadThemeCss();
const flow = JSON.parse(readFileSync(new URL('./specs/40-arch-api.json', import.meta.url)));

test('renderByType routes flowchart to the graph engine', () => {
  const html = renderByType({ type: 'flowchart', title: 'F', nodes: [{ id: 'a', card: 'A' }, { id: 'b', card: 'B' }], edges: [{ from: 'a', to: 'b' }] }, css);
  assert.match(html, /url\(#arrow\)/);
  assert.match(html, /class="card"/);
});

test('renderByType still routes preset/C4 specs to the flow engine', () => {
  const html = renderByType(flow, css);
  assert.match(html, /class="boundary"/); // flow-only block
});

test('validateSpec validates graph specs by nodes/edges', () => {
  assert.equal(validateSpec({ type: 'flowchart', title: 'F', nodes: [{ id: 'a' }] }).valid, true);
  const bad = validateSpec({ type: 'flowchart', title: 'F', nodes: [{ id: 'a' }], edges: [{ from: 'a', to: 'z' }] });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.some(e => /not a declared node/.test(e)));
  assert.equal(validateSpec({ type: 'flowchart', title: 'F', nodes: [] }).valid, false);
});
