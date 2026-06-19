// Routes a spec to its engine by `spec.type`. Default = flow engine (gen.renderSpec),
// which keeps every existing C4/preset spec working unchanged.
import { renderSpec } from './gen.mjs';
import { renderGraph } from './engines/graph.mjs';
import { GRAPH_TYPES } from './types.mjs';

const ENGINES = {};
for (const t of GRAPH_TYPES) ENGINES[t] = renderGraph;

// Later phases register their engines here (lane, sequence).
export function registerEngine(type, fn) { ENGINES[type] = fn; }

export function renderByType(spec, css) {
  const fn = spec && spec.type && ENGINES[spec.type];
  return fn ? fn(spec, css) : renderSpec(spec, css);
}
