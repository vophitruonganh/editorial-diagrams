// Graph engine: spec {nodes,edges} → editorial HTML.
// Nodes laid out by ELK (balanced), drawn as editorial nodes; edges as editorial SVG.
// Covers flowchart now; activity/state/erd/class/trees/graphs add node+edge KINDS
// (registered in nodes.mjs / edges.mjs) without changing this engine.
import { renderChrome } from '../chrome.mjs';
import { renderNode, nodeSize } from '../nodes.mjs';
import { parseCard } from '../gen.mjs';
import { edgePath, arrowMarkerDefs, edgeLabelChip, edgeEndGlyph, AMBER } from '../edges.mjs';
import { layoutGraph } from '../layout/graph.mjs';
import '../notation/index.mjs'; // side-effect: register UML/ERD/class node + edge glyphs

const DEFAULT = { w: 214, h: 84 };

// Content-based size for a default card so text fits instead of being clipped/cramped
// in a fixed 214×84 box. Heuristic (no DOM at layout time): width from the longest
// line, height from wrapped-line counts. Clamped so cards stay tidy and uniform-ish.
function cardSize(n) {
  const c = parseCard(n.card ?? n.label ?? '');
  const title = c.h || '', tech = c.tech || '', detail = c.p || '';
  const PADX = 32, PADY = 28;
  const contentW = Math.max(title.length * 8.1, tech.length * 6.8, detail.length * 6.8, 110);
  const w = Math.round(Math.min(300, Math.max(180, contentW + PADX)));
  const innerW = w - PADX;
  const wrap = (txt, perPx) => txt ? Math.max(1, Math.ceil(txt.length / Math.max(4, Math.floor(innerW / perPx)))) : 0;
  const h = Math.round(Math.max(64, PADY + wrap(title, 8.1) * 19 + (tech ? 16 : 0) + wrap(detail, 6.8) * 18));
  return { w, h };
}

// per-node desired size: explicit w/h, else content-sized card, else a kind sizer
export function nodeSizeOf(n) {
  if (n.w && n.h) return { w: n.w, h: n.h };
  if (!n.kind || n.kind === 'card') return cardSize(n);
  return nodeSize(n, { ...DEFAULT });
}

const unit = (a, b) => { const v = { x: a.x - b.x, y: a.y - b.y }; const m = Math.hypot(v.x, v.y) || 1; return { x: v.x / m, y: v.y / m }; };

export async function renderGraph(spec, css, opts = {}) {
  const nodes = spec.nodes || [];
  const edges = spec.edges || [];
  const sizeOf = opts.sizeOf || nodeSizeOf;
  const laid = await layoutGraph(nodes, edges, {
    direction: spec.direction || 'TB',
    nodesep: spec.nodesep ?? 60,   // airier defaults (override per-spec if needed)
    ranksep: spec.ranksep ?? 96,
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
    if (e.label) labels += edgeLabelChip(e.labelPos || pts[Math.floor(pts.length / 2)], e.label);
  }
  const dim = `width="${laid.width}" height="${laid.height}" style="position:absolute;left:0;top:0;pointer-events:none"`;
  const edgeSvg = `<svg ${dim}>${arrowMarkerDefs()}${paths}${glyphs}</svg>`;
  const nodeHTML = laid.nodes.map(n => renderNode(n, { w: n.w, h: n.h, left: n.left, top: n.top })).join('');
  // labels go on a top layer so they're never hidden behind node cards
  const labelSvg = labels ? `<svg ${dim}>${labels}</svg>` : '';
  const body = `\n  <div style="position:relative;width:${laid.width}px;height:${laid.height}px;margin:12px auto 4px">${edgeSvg}${nodeHTML}${labelSvg}</div>`;
  return renderChrome(spec, body, css, { maxw: laid.width + 80 });
}
