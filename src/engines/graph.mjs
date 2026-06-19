// Graph engine: spec {nodes,edges} → editorial HTML.
// Nodes laid out by dagre, drawn as editorial nodes; edges drawn as editorial SVG.
// Covers flowchart now; activity/state/erd/class/trees/graphs add node+edge KINDS
// (registered in nodes.mjs / edges.mjs) without changing this engine.
import { renderChrome } from '../chrome.mjs';
import { renderNode } from '../nodes.mjs';
import { edgePath, arrowMarkerDefs, edgeLabelChip, AMBER } from '../edges.mjs';
import { layoutGraph } from '../layout/graph.mjs';

const DEFAULT = { w: 214, h: 84 };

// per-node desired size: explicit w/h, else a kind default (extended later), else card default
export function nodeSizeOf(n) {
  if (n.w && n.h) return { w: n.w, h: n.h };
  return { ...DEFAULT };
}

export function renderGraph(spec, css, opts = {}) {
  const nodes = spec.nodes || [];
  const edges = spec.edges || [];
  const sizeOf = opts.sizeOf || nodeSizeOf;
  const laid = layoutGraph(nodes, edges, {
    direction: spec.direction || 'TB',
    nodesep: spec.nodesep, ranksep: spec.ranksep,
    sizeOf,
  });

  let paths = '', labels = '';
  for (const e of laid.edges) {
    const noArrow = e.arrow === false;
    paths += `<path d="${edgePath(e.points, { style: e.style || 'orthogonal' })}" fill="none" stroke="${AMBER}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${noArrow ? '' : ' marker-end="url(#arrow)"'}/>`;
    if (e.label) {
      const mp = e.points[Math.floor(e.points.length / 2)];
      labels += edgeLabelChip(mp, e.label);
    }
  }
  const svg = `<svg width="${laid.width}" height="${laid.height}" style="position:absolute;left:0;top:0;pointer-events:none">${arrowMarkerDefs()}${paths}${labels}</svg>`;
  const nodeHTML = laid.nodes.map(n => renderNode(n, { w: n.w, h: n.h, left: n.left, top: n.top })).join('');
  const body = `\n  <div style="position:relative;width:${laid.width}px;height:${laid.height}px;margin:12px auto 4px">${svg}${nodeHTML}</div>`;
  return renderChrome(spec, body, css, { maxw: laid.width + 80 });
}
