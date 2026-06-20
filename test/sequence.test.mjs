import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderByType } from '../src/router.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';
import { renderHtml } from '../src/render.mjs';
import { closeBrowser } from '../src/browser.mjs';
import { validateSpec } from '../src/validate.mjs';

const css = loadThemeCss();
const spec = JSON.parse(readFileSync(new URL('./specs/sequence/login-mfa.json', import.meta.url)));

after(() => closeBrowser());

test('sequence renders actors, lifelines, messages, activation bars', async () => {
  const h = await renderByType(spec, css);
  assert.match(h, /<h4 style="margin:0">api-auth<\/h4>/); // actor header
  assert.match(h, /stroke-dasharray="3 4"/);              // lifeline
  assert.match(h, />POST \/login</);                       // message text
  assert.match(h, /<rect /);                               // activation bar
  assert.match(h, /url\(#seqf\)/);                         // sync arrowhead
});

test('sequence validation flags unknown actor', async () => {
  const bad = validateSpec({ type: 'sequence', title: 'x', actors: [{ id: 'a' }], messages: [{ from: 'a', to: 'z', text: 'hi' }] });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.some(e => /not a declared actor/.test(e)));
  assert.equal(validateSpec({ type: 'sequence', title: 'x', actors: [] }).valid, false);
});

test('sequence renders to a valid PNG', async () => {
  const { buffer } = await renderHtml(await renderByType(spec, css), { format: 'png', scale: 1 });
  assert.deepEqual([...buffer.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  assert.ok(buffer.length > 1000);
});
