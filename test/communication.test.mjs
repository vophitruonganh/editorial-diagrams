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
const spec = JSON.parse(readFileSync(new URL('./specs/graph/communication-login.json', import.meta.url)));

after(() => closeBrowser());

test('communication: objects + numbered message labels + arrows', () => {
  const h = renderByType(spec, css);
  assert.match(h, />LoginController</);
  assert.match(h, />1: login\(creds\)</);
  assert.match(h, /url\(#arrow\)/);
});

test('communication scaffold validates + renders', () => {
  const s = scaffoldSpec('communication');
  assert.equal(validateSpec(s).valid, true, validateSpec(s).errors.join('; '));
  assert.match(renderByType(s, css), /class="diagram"/);
});

test('communication renders to a valid PNG', async () => {
  const { buffer } = await renderHtml(renderByType(spec, css), { format: 'png', scale: 1 });
  assert.deepEqual([...buffer.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
});
