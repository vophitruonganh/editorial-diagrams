// Graph layout via ELK (layered + Brandes-Köpf BALANCED placement) — produces
// centered, symmetric, professional layouts. Computes node positions + orthogonal
// edge waypoints ONLY; visual is drawn by the engine (editorial cards + SVG).
// Async (ELK's API is promise-based). `sizeOf(node)` lets callers pass measured sizes.
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();
const DIR = { TB: 'DOWN', BT: 'UP', LR: 'RIGHT', RL: 'LEFT' };

export async function layoutGraph(nodes, edges, opts = {}) {
  const { direction = 'TB', nodesep = 46, ranksep = 60, sizeOf } = opts;

  const size = {};
  const children = nodes.map(n => {
    const s = (sizeOf && sizeOf(n)) || { w: n.w || 200, h: n.h || 84 };
    size[n.id] = s;
    return { id: n.id, width: s.w, height: s.h };
  });

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': DIR[direction] || 'DOWN',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(ranksep),
      'elk.spacing.nodeNode': String(nodesep),
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    },
    children,
    edges: edges.map((e, i) => ({ id: 'e' + i, sources: [e.from], targets: [e.to] })),
  };

  const res = await elk.layout(graph);
  const pos = Object.fromEntries((res.children || []).map(c => [c.id, c]));
  const em = Object.fromEntries((res.edges || []).map(e => [e.id, e]));

  const outNodes = nodes.map(n => {
    const c = pos[n.id] || { x: 0, y: 0 }, s = size[n.id];
    return { ...n, x: c.x + s.w / 2, y: c.y + s.h / 2, w: s.w, h: s.h, left: c.x, top: c.y };
  });
  const outEdges = edges.map((e, i) => {
    const ge = em['e' + i], sec = ge && ge.sections && ge.sections[0];
    const points = sec
      ? [sec.startPoint, ...(sec.bendPoints || []), sec.endPoint]
      : [{ x: pos[e.from].x + size[e.from].w / 2, y: pos[e.from].y + size[e.from].h / 2 }, { x: pos[e.to].x + size[e.to].w / 2, y: pos[e.to].y + size[e.to].h / 2 }];
    return { ...e, points };
  });
  return { nodes: outNodes, edges: outEdges, width: Math.ceil(res.width), height: Math.ceil(res.height) };
}
