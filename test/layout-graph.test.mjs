import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutGraph } from '../src/layout/graph.mjs';

const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
const edges = [{ from: 'A', to: 'B' }, { from: 'B', to: 'C' }];

test('layoutGraph positions nodes top-to-bottom with increasing y', () => {
  const g = layoutGraph(nodes, edges, { direction: 'TB' });
  assert.equal(g.nodes.length, 3);
  const y = Object.fromEntries(g.nodes.map(n => [n.id, n.y]));
  assert.ok(y.A < y.B && y.B < y.C, 'y increases A<B<C');
  assert.ok(g.width > 0 && g.height > 0);
});

test('layoutGraph returns edge waypoints', () => {
  const g = layoutGraph(nodes, edges);
  assert.equal(g.edges.length, 2);
  for (const e of g.edges) assert.ok(Array.isArray(e.points) && e.points.length >= 2);
});

test('layoutGraph honors sizeOf for node geometry', () => {
  const g = layoutGraph(nodes, edges, { sizeOf: n => ({ w: 300, h: 120 }) });
  for (const n of g.nodes) {
    assert.equal(n.w, 300); assert.equal(n.h, 120);
    assert.equal(n.left, n.x - 150); assert.equal(n.top, n.y - 60);
  }
});
