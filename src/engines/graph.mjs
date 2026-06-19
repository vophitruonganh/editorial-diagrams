// Graph engine: spec {nodes,edges} → editorial HTML.
// Nodes laid out by dagre, drawn as editorial nodes; edges drawn as editorial SVG.
// Covers flowchart now; activity/state/erd/class/trees/graphs add node+edge KINDS
// (registered in nodes.mjs / edges.mjs) without changing this engine.
import { renderChrome } from '../chrome.mjs';
import { renderNode, nodeSize } from '../nodes.mjs';
import { edgePath, arrowMarkerDefs, edgeLabelChip, edgeEndGlyph, AMBER } from '../edges.mjs';
import { layoutGraph } from '../layout/graph.mjs';
import '../notation/index.mjs'; // side-effect: register UML/ERD/class node + edge glyphs

const DEFAULT = { w: 214, h: 84 };

// per-node desired size: explicit w/h, else a kind sizer, else card default
export function nodeSizeOf(n) {
  return nodeSize(n, { ...DEFAULT });
}

const unit = (a, b) => { const v = { x: a.x - b.x, y: a.y - b.y }; const m = Math.hypot(v.x, v.y) || 1; return { x: v.x / m, y: v.y / m }; };

export function renderGraph(spec, css, opts = {}) {
  const nodes = spec.nodes || [];
  const edges = spec.edges || [];
  const sizeOf = opts.sizeOf || nodeSizeOf;
  const laid = layoutGraph(nodes, edges, {
    direction: spec.direction || 'TB',
    nodesep: spec.nodesep, ranksep: spec.ranksep,
    sizeOf,
  });

  let paths = '', glyphs = '', labels = '';
  for (const e of laid.edges) {
    const pts = e.points;
    const custom = e.endFrom || e.endTo;          // ERD/class edges decorate ends themselves
    const noArrow = e.arrow === false || custom;
    const stroke = e.color || AMBER;
    paths += `<path d="${edgePath(pts, { style: e.style || 'orthogonal' })}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${noArrow ? '' : ' marker-end="url(#arrow)"'}/>`;
    if (e.endFrom) glyphs += edgeEndGlyph(e.endFrom, pts[0], unit(pts[0], pts[1]), stroke);
    if (e.endTo) glyphs += edgeEndGlyph(e.endTo, pts[pts.length - 1], unit(pts[pts.length - 1], pts[pts.length - 2]), stroke);
    if (e.label) labels += edgeLabelChip(pts[Math.floor(pts.length / 2)], e.label);
  }
  const svg = `<svg width="${laid.width}" height="${laid.height}" style="position:absolute;left:0;top:0;pointer-events:none">${arrowMarkerDefs()}${paths}${glyphs}${labels}</svg>`;
  const nodeHTML = laid.nodes.map(n => renderNode(n, { w: n.w, h: n.h, left: n.left, top: n.top })).join('');
  const body = `\n  <div style="position:relative;width:${laid.width}px;height:${laid.height}px;margin:12px auto 4px">${svg}${nodeHTML}</div>`;
  return renderChrome(spec, body, css, { maxw: laid.width + 80 });
}
