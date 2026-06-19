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

test('chrome maxw option sets max-width on the diagram', () => {
  const html = renderChrome({ title: 'T' }, '', css, { maxw: 900 });
  assert.match(html, /class="diagram" style="max-width:900px"/);
});
