import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardNode } from '../src/nodes.mjs';

test('cardNode renders a positioned editorial card with kind/stereo/tech/detail', () => {
  const html = cardNode('sec:+Token | [jwt] | signs tokens', { w: 200, h: 80, left: 10, top: 20 });
  assert.match(html, /class="card sec"/);
  assert.match(html, /position:absolute/);
  assert.match(html, /left:10px/);
  assert.match(html, /top:20px/);
  assert.match(html, /width:200px/);
  assert.match(html, /<span class="stereo">/);
  assert.match(html, /class="c4tech">\[jwt\]</);
  assert.match(html, /<h4>Token<\/h4>/);
  assert.match(html, /<p>signs tokens<\/p>/);
});

test('cardNode plain card has no kind class', () => {
  const html = cardNode('Receive request|[HTTPS] /login', { w: 200, h: 80, left: 0, top: 0 });
  assert.match(html, /class="card"/);
  assert.match(html, /<h4>Receive request<\/h4>/);
});
