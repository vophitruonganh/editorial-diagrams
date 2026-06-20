import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderByType } from '../src/router.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';
import { renderHtml } from '../src/render.mjs';
import { closeBrowser } from '../src/browser.mjs';
import { validateSpec } from '../src/validate.mjs';

const css = loadThemeCss();
const load = f => JSON.parse(readFileSync(new URL('./specs/grid/' + f, import.meta.url)));
const matrix = load('matrix-capability.json');
const quad = load('quadrant-effort.json');
const kanban = load('kanban-board.json');
const swim = load('swimlane-checkout.json');

after(() => closeBrowser());

test('matrix renders a table with headers + row labels', async () => {
  const h = await renderByType(matrix, css);
  assert.match(h, /<table/);
  assert.match(h, />Enterprise</);
  assert.match(h, />SSO</);
});

test('quadrant renders axes + item dots', async () => {
  const h = await renderByType(quad, css);
  assert.match(h, />MFA</);
  assert.match(h, /border-radius:50%/);
  assert.match(h, /quick wins/);
});

test('kanban renders columns + cards', async () => {
  const h = await renderByType(kanban, css);
  assert.match(h, /In progress/);
  assert.match(h, /class="card sec"/);
});

test('swimlane renders lanes + step cards + arrows', async () => {
  const h = await renderByType(swim, css);
  assert.match(h, />Payment</);
  assert.match(h, /url\(#arrow\)/);
  assert.match(h, /<h4>Charge card<\/h4>/);
});

test('grid validation catches missing arrays + bad swimlane lane', async () => {
  assert.equal(validateSpec({ type: 'matrix', title: 'x' }).valid, false);
  const bad = validateSpec({ type: 'swimlane', title: 'x', lanes: [{ id: 'a' }], steps: [{ id: 's', lane: 'nope', t: 0 }] });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.some(e => /not a declared lane/.test(e)));
});

test('all four grid types render to valid PNGs', async () => {
  for (const spec of [matrix, quad, kanban, swim]) {
    const { buffer } = await renderHtml(await renderByType(spec, css), { format: 'png', scale: 1 });
    assert.deepEqual([...buffer.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], `${spec.type} PNG`);
    assert.ok(buffer.length > 1000);
  }
});
