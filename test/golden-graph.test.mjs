import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderByType } from '../src/router.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';
import { renderHtml } from '../src/render.mjs';
import { closeBrowser } from '../src/browser.mjs';

const css = loadThemeCss();
const spec = JSON.parse(readFileSync(new URL('./specs/graph/flowchart-login.json', import.meta.url)));

after(() => closeBrowser());

test('flowchart golden renders to a valid non-empty PNG', async () => {
  const html = await renderByType(spec, css);
  const { buffer, width, height } = await renderHtml(html, { format: 'png', scale: 1 });
  assert.deepEqual([...buffer.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  assert.ok(buffer.length > 1000, 'PNG not empty');
  assert.ok(width > 0 && height > 0);
});
