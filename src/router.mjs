// Routes a spec to its engine by `spec.type`. Default = flow engine (gen.renderSpec),
// which keeps every existing C4/preset spec working unchanged.
import { renderSpec } from './gen.mjs';
import { renderGraph } from './engines/graph.mjs';
import { renderLane } from './engines/lane.mjs';
import { renderGrid } from './engines/grid.mjs';
import { GRAPH_TYPES, LANE_TYPES, GRID_TYPES } from './types.mjs';

const ENGINES = {};
for (const t of GRAPH_TYPES) ENGINES[t] = renderGraph;
for (const t of LANE_TYPES) ENGINES[t] = renderLane;
for (const t of GRID_TYPES) ENGINES[t] = renderGrid;

// Later phases register their engines here (lane, sequence).
export function registerEngine(type, fn) { ENGINES[type] = fn; }

export function renderByType(spec, css) {
  const fn = spec && spec.type && ENGINES[spec.type];
  return fn ? fn(spec, css) : renderSpec(spec, css);
}
