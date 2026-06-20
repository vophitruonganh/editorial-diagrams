// Routes a spec to its engine by `spec.type`. Default = flow engine (gen.renderSpec),
// which keeps every existing C4/preset spec working unchanged.
import { renderSpec } from './gen.mjs';
import { renderGraph } from './engines/graph.mjs';
import { renderLane } from './engines/lane.mjs';
import { renderGrid } from './engines/grid.mjs';
import { renderSequence } from './engines/sequence.mjs';
import { GRAPH_TYPES, LANE_TYPES, GRID_TYPES, SEQUENCE_TYPES, PRESET_TYPES } from './types.mjs';
import { expandDefs } from './defs.mjs';

const ENGINES = {};
for (const t of GRAPH_TYPES) ENGINES[t] = renderGraph;
for (const t of LANE_TYPES) ENGINES[t] = renderLane;
for (const t of GRID_TYPES) ENGINES[t] = renderGrid;
for (const t of SEQUENCE_TYPES) ENGINES[t] = renderSequence;

// Later phases register their engines here (lane, sequence).
export function registerEngine(type, fn) { ENGINES[type] = fn; }

export async function renderByType(rawSpec, css) {
  let spec = expandDefs(rawSpec);
  const fn = spec && spec.type && ENGINES[spec.type];
  if (fn) return await fn(spec, css); // graph engine is async (ELK); lane/grid/sequence resolve immediately
  // flow engine: let `type` alone drive a preset (c4-l1..l3, dynamic) when `preset` is unset
  if (spec && !spec.preset && PRESET_TYPES.includes(spec.type)) spec = { ...spec, preset: spec.type };
  return renderSpec(spec, css);
}
