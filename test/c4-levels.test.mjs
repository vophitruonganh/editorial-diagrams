import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderByType } from '../src/router.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';
import { renderHtml } from '../src/render.mjs';
import { closeBrowser } from '../src/browser.mjs';
import { validateSpec } from '../src/validate.mjs';
import { scaffoldSpec } from '../src/scaffold.mjs';

const css = loadThemeCss();
const l1 = JSON.parse(readFileSync(new URL('./specs/c4/l1-context.json', import.meta.url)));
const l4 = JSON.parse(readFileSync(new URL('./specs/c4/l4-code.json', import.meta.url)));

after(() => closeBrowser());

test('C4 L1 (System Context): persons + system + externals + rels', () => {
  const h = renderByType(l1, css);
  assert.match(h, /People · actors/);
  assert.match(h, /Identity Platform/);
  assert.match(h, /External systems/);
  assert.match(h, /class="footer"/); // rels band
});

test('C4 L4 (Code) renders class boxes + composition diamond', () => {
  const h = renderByType(l4, css);
  assert.match(h, />LoginController</);
  assert.match(h, />login\(req\)</);
  assert.match(h, /<polygon /); // diamond glyph
});

test('all four C4 levels validate AND render', () => {
  for (const lvl of ['c4-l1', 'c4-l2', 'c4-l3', 'c4-l4']) {
    const spec = scaffoldSpec(lvl);
    assert.equal(validateSpec(spec).valid, true, `${lvl} invalid: ${validateSpec(spec).errors.join('; ')}`);
    assert.match(renderByType(spec, css), /class="diagram"/, `${lvl} render`);
  }
});

test('c4-l1 by type alone (no preset field) still expands via router', () => {
  const { preset, ...noPreset } = l1; // drop preset, keep type
  const h = renderByType(noPreset, css);
  assert.match(h, /External systems/);
});

test('C4 L1 + L4 render to valid PNGs', async () => {
  for (const spec of [l1, l4]) {
    const { buffer } = await renderHtml(renderByType(spec, css), { format: 'png', scale: 1 });
    assert.deepEqual([...buffer.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], `${spec.id} PNG`);
  }
});
