import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderChrome } from '../src/chrome.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';

const css = loadThemeCss();

test('chrome wraps body with editorial header + inlined css', () => {
  const html = renderChrome({ eyebrow: 'E', title: 'T', subtitle: 'S', caption: 'C' }, '<div id="b">x</div>', css);
  assert.match(html, /<style>/);
  assert.ok(!html.includes('editorial.css'), 'CSS must be inlined, not linked');
  assert.match(html, /class="eyebrow">E</);
  assert.match(html, /class="title">T</);
  assert.match(html, /class="diagram"/);
  assert.match(html, /id="b"/);
  assert.match(html, /class="caption">C</);
});

test('chrome maxw option sets an explicit width on the diagram', () => {
  // width (not max-width) so engine content wider than the stylesheet's 1200px
  // grows the canvas instead of overflowing and getting clipped at screenshot time.
  const html = renderChrome({ title: 'T' }, '', css, { maxw: 900 });
  assert.match(html, /class="diagram" style="width:900px;max-width:none"/);
});
