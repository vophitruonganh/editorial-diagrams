// UML activity / state node kinds: decision ◇ · fork/join ▬ · start ● · end ◉.
// All editorial-styled (rounded diamond matches card border; slate glyphs).
import { registerNode, posStyle, esc } from '../nodes.mjs';

const SLATE = '#475569';

// closed rounded polygon — diamond corners rounded to echo the card border-radius
function roundedPolygon(pts, r = 14) {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1, l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const ax = p1.x + (p0.x - p1.x) / l1 * rr, ay = p1.y + (p0.y - p1.y) / l1 * rr;
    const bx = p1.x + (p2.x - p1.x) / l2 * rr, by = p1.y + (p2.y - p1.y) / l2 * rr;
    d += (i === 0 ? `M ${ax.toFixed(1)},${ay.toFixed(1)}` : ` L ${ax.toFixed(1)},${ay.toFixed(1)}`);
    d += ` Q ${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`;
  }
  return d + ' Z';
}

registerNode('decision', (n, geom) => {
  const { w, h } = geom, pad = 4;
  const pts = [{ x: w / 2, y: pad }, { x: w - pad, y: h / 2 }, { x: w / 2, y: h - pad }, { x: pad, y: h / 2 }];
  const label = esc(n.label ?? n.card ?? '');
  return `<div style="${posStyle(geom)}">` +
    `<svg width="${w}" height="${h}" style="position:absolute;left:0;top:0"><path d="${roundedPolygon(pts, 14)}" fill="#fff" stroke="#DCE0E6" stroke-width="1.5" stroke-linejoin="round"/></svg>` +
    `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:700;color:#0f172a;font-size:14.5px;text-align:center;padding:0 8px">${label}</div></div>`;
}, () => ({ w: 150, h: 96 }));

registerNode('start', (n, geom) =>
  `<div style="${posStyle(geom)}border-radius:50%;background:${SLATE}"></div>`, () => ({ w: 26, h: 26 }));

registerNode('end', (n, geom) =>
  `<div style="${posStyle(geom)}border-radius:50%;border:2.5px solid ${SLATE};display:flex;align-items:center;justify-content:center"><div style="width:58%;height:58%;border-radius:50%;background:${SLATE}"></div></div>`,
  () => ({ w: 30, h: 30 }));

const bar = (n, geom) => `<div style="${posStyle(geom)}border-radius:3px;background:${SLATE}"></div>`;
registerNode('fork', bar, n => ({ w: n.span || 180, h: 12 }));
registerNode('join', bar, n => ({ w: n.span || 180, h: 12 }));
