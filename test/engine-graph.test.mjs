import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderGraph } from '../src/engines/graph.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';

const css = loadThemeCss();
const spec = {
  type: 'flowchart', eyebrow: 'Flowchart', title: 'Login flow', caption: 'demo',
  nodes: [
    { id: 'a', card: 'Receive request|[HTTPS] /login' },
    { id: 'b', card: 'Authenticate|password' },
    { id: 'c', card: 'sec:MFA required?|decision' },
    { id: 'd', card: 'Issue token|JWT' },
  ],
  edges: [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c', label: 'ok' },
    { from: 'c', to: 'd', label: 'yes' },
  ],
};

test('renderGraph emits cards, edges, arrowhead, labels, chrome', () => {
  const html = renderGraph(spec, css);
  assert.equal((html.match(/class="card/g) || []).length, 4);
  assert.match(html, /<svg/);
  assert.match(html, /<path /);
  assert.match(html, /url\(#arrow\)/);
  assert.match(html, /class="title">Login flow</);
  assert.match(html, />ok</); // edge label chip
});

test('renderGraph is deterministic', () => {
  assert.equal(renderGraph(spec, css), renderGraph(spec, css));
});
