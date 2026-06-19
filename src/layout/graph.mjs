// Graph layout via dagre — computes node positions + edge waypoints ONLY.
// Visual is drawn by the engine (editorial cards + SVG), never by dagre.
// Generic: `sizeOf(node)` lets later phases pass measured sizes (entity tables,
// class boxes); multigraph supports parallel edges.
import dagre from '@dagrejs/dagre';

export function layoutGraph(nodes, edges, opts = {}) {
  const { direction = 'TB', nodesep = 46, ranksep = 60, marginx = 24, marginy = 16, sizeOf } = opts;
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({ rankdir: direction, nodesep, ranksep, marginx, marginy });
  g.setDefaultEdgeLabel(() => ({}));

  const size = {};
  for (const n of nodes) {
    const s = (sizeOf && sizeOf(n)) || { w: n.w || 200, h: n.h || 84 };
    size[n.id] = s;
    g.setNode(n.id, { width: s.w, height: s.h });
  }
  edges.forEach((e, i) => g.setEdge(e.from, e.to, {}, `e${i}`));
  dagre.layout(g);

  const outNodes = nodes.map(n => {
    const gn = g.node(n.id), s = size[n.id];
    return { ...n, x: gn.x, y: gn.y, w: s.w, h: s.h, left: gn.x - s.w / 2, top: gn.y - s.h / 2 };
  });
  const outEdges = edges.map((e, i) => ({ ...e, points: g.edge(e.from, e.to, `e${i}`).points }));
  const gr = g.graph();
  return { nodes: outNodes, edges: outEdges, width: Math.ceil(gr.width), height: Math.ceil(gr.height) };
}
