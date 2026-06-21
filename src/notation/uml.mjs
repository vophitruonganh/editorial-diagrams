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

// A diamond only USES its inscribed (centred) rectangle for text — a box of half the
// bbox in each axis exactly touches the four edges (w/2W + h/2H = 1). So to fit a text
// block we size the bbox to ~2× the block, and we constrain the text to that 50%×50%
// centred area so it can never spill outside the rhombus. Sizing is deliberately
// generous (wide char width, tall line height) so the estimate always over-covers.
function decisionSize(n) {
  const chars = String(n.label ?? n.card ?? '').trim().length || 1;
  const charW = 8.6, lineH = 20;
  const targetLines = Math.max(1, Math.round(Math.sqrt(chars / 3.2)));   // keep the text block squarish
  const perLine = Math.max(8, Math.ceil(chars / targetLines));
  const tw = Math.min(240, Math.max(92, perLine * charW));
  const lines = Math.max(1, Math.ceil(chars * charW / tw));
  const th = lines * lineH;
  return { w: Math.round(Math.max(150, tw * 2 + 30)), h: Math.round(Math.max(96, th * 2 + 30)) };
}

registerNode('decision', (n, geom) => {
  const { w, h } = geom, pad = 4;
  const pts = [{ x: w / 2, y: pad }, { x: w - pad, y: h / 2 }, { x: w / 2, y: h - pad }, { x: pad, y: h / 2 }];
  const label = esc(n.label ?? n.card ?? '');
  // text lives in the centred inscribed rectangle (50%×50%); overflow:hidden is a hard
  // backstop so text can never render outside the diamond even if the estimate is off.
  return `<div style="${posStyle(geom)}">` +
    `<svg width="${w}" height="${h}" style="position:absolute;left:0;top:0"><path d="${roundedPolygon(pts, 14)}" fill="#fff" stroke="#DCE0E6" stroke-width="1.5" stroke-linejoin="round"/></svg>` +
    `<div style="position:absolute;left:25%;top:25%;width:50%;height:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#0f172a;font-size:14px;line-height:1.2;text-align:center;word-break:break-word;overflow:hidden">${label}</div></div>`;
}, decisionSize);

registerNode('start', (n, geom) =>
  `<div style="${posStyle(geom)}border-radius:50%;background:${SLATE}"></div>`, () => ({ w: 26, h: 26 }));

registerNode('end', (n, geom) =>
  `<div style="${posStyle(geom)}border-radius:50%;border:2.5px solid ${SLATE};display:flex;align-items:center;justify-content:center"><div style="width:58%;height:58%;border-radius:50%;background:${SLATE}"></div></div>`,
  () => ({ w: 30, h: 30 }));

const bar = (n, geom) => `<div style="${posStyle(geom)}border-radius:3px;background:${SLATE}"></div>`;
registerNode('fork', bar, n => ({ w: n.span || 180, h: 12 }));
registerNode('join', bar, n => ({ w: n.span || 180, h: 12 }));
