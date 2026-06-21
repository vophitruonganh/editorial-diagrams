import { test } from 'node:test';
import assert from 'node:assert/strict';
import { edgePath, arrowMarkerDefs, edgeLabelChip } from '../src/edges.mjs';

const pts = [{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 40, y: 50 }];

test('orthogonal edge path rounds corners (has Q)', () => {
  const d = edgePath(pts, { style: 'orthogonal' });
  assert.match(d, /^M 0\.0,0\.0/);
  assert.match(d, /Q /);
});

test('straight edge path is polyline (no Q/C)', () => {
  const d = edgePath(pts, { style: 'straight' });
  assert.ok(!/[QC] /.test(d));
  assert.match(d, /L /);
});

test('rounded edge path is a spline (has C)', () => {
  const d = edgePath(pts, { style: 'rounded' });
  assert.match(d, /C /);
});

test('two-point edge is a simple line', () => {
  assert.equal(edgePath([{ x: 1, y: 2 }, { x: 3, y: 4 }]), 'M 1.0,2.0 L 3.0,4.0');
});

test('arrowMarkerDefs defines an arrow marker', () => {
  assert.match(arrowMarkerDefs(), /<marker id="arrow"/);
  assert.match(arrowMarkerDefs(), /#b45309/);
});

test('edgeLabelChip renders the label text', () => {
  const g = edgeLabelChip({ x: 100, y: 60 }, 'yes');
  assert.match(g, />yes</);
  assert.match(g, /<foreignObject/);   // wraps in a foreignObject so long labels can break onto lines
});
