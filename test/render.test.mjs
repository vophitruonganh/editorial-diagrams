import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderSpec } from '../src/gen.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';
import { renderHtml } from '../src/render.mjs';
import { closeBrowser } from '../src/browser.mjs';

const css = loadThemeCss();
const spec = JSON.parse(readFileSync(new URL('./specs/40-arch-api.json', import.meta.url)));
const html = renderSpec(spec, css);

after(() => closeBrowser());

test('renders PNG with a valid signature', async () => {
  const { buffer, mimeType, width, height } = await renderHtml(html, { format: 'png', scale: 1 });
  assert.equal(mimeType, 'image/png');
  assert.deepEqual([...buffer.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]); // \x89PNG
  assert.ok(width > 0 && height > 0);
});

test('renders PDF with a %PDF header', async () => {
  const { buffer, mimeType } = await renderHtml(html, { format: 'pdf' });
  assert.equal(mimeType, 'application/pdf');
  assert.equal(buffer.subarray(0, 5).toString('latin1'), '%PDF-');
});

test('renders SVG containing a foreignObject', async () => {
  const { buffer, mimeType } = await renderHtml(html, { format: 'svg', css });
  assert.equal(mimeType, 'image/svg+xml');
  const s = buffer.toString('utf8');
  assert.match(s, /<svg[\s>]/);
  assert.match(s, /<foreignObject/);
});
