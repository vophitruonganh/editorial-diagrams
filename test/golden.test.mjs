import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { renderSpec } from '../src/gen.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';
import { renderHtml } from '../src/render.mjs';
import { closeBrowser } from '../src/browser.mjs';

const css = loadThemeCss();
const dir = new URL('./specs/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

after(() => closeBrowser());

test(`renders all ${files.length} golden specs to non-empty PNGs`, async () => {
  assert.ok(files.length >= 15, `expected >=15 specs, found ${files.length}`);
  for (const f of files) {
    const spec = JSON.parse(readFileSync(new URL(f, dir)));
    const html = renderSpec(spec, css);
    const { buffer, width, height } = await renderHtml(html, { format: 'png', scale: 1 });
    assert.deepEqual([...buffer.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], `${f} is not a PNG`);
    assert.ok(buffer.length > 1000, `${f} PNG suspiciously small`);
    assert.ok(width > 0 && height > 0, `${f} has zero dimensions`);
  }
});
