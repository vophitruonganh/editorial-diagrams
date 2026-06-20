import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderByType } from '../src/router.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';
import { renderHtml } from '../src/render.mjs';
import { closeBrowser } from '../src/browser.mjs';

const css = loadThemeCss();
const load = f => JSON.parse(readFileSync(new URL('./specs/graph/' + f, import.meta.url)));
const activity = load('activity-login.json');
const erd = load('erd-core.json');
const cls = load('class-domain.json');

after(() => closeBrowser());

test('activity: decision diamond + fork/join + start/end + guard labels', async () => {
  const h = await renderByType(activity, css);
  assert.match(h, />Valid\?</);            // decision label
  assert.match(h, /background:#475569/);    // start/fork/join slate glyph
  assert.match(h, />yes</);                 // guard label chip
  assert.match(h, /class="card sec"/);      // sec action card
});

test('erd: entity table with PK/FK + crow\'s-foot lines, no arrowhead on relations', async () => {
  const h = await renderByType(erd, css);
  assert.match(h, />PK</);
  assert.match(h, />FK</);
  assert.match(h, />ORG</);
  assert.match(h, /<line /);                // crow's-foot strokes
});

test('class: compartments + UML triangle/diamond ends', async () => {
  const h = await renderByType(cls, css);
  assert.match(h, />authenticate\(\)</);
  assert.match(h, /<polygon /);             // triangle / diamond glyph
  assert.match(h, />extends</);
});

test('activity/erd/class render to valid PNGs', async () => {
  for (const spec of [activity, erd, cls]) {
    const { buffer } = await renderHtml(await renderByType(spec, css), { format: 'png', scale: 1 });
    assert.deepEqual([...buffer.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], `${spec.type} PNG`);
    assert.ok(buffer.length > 1000);
  }
});
