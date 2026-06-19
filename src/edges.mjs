// Editorial edge primitives — SVG path geometry + glyphs, hand-drawn so every
// connector matches the editorial palette (amber #b45309). Endpoint glyphs beyond
// the arrowhead (crow's-foot, UML triangle/diamond, tick) are added here in later phases.
const f = n => Number(n).toFixed(1);
export const AMBER = '#b45309';

// straight polyline through points
function straight(points) {
  return 'M ' + points.map(p => `${f(p.x)},${f(p.y)}`).join(' L ');
}

// rounded corners at each waypoint (clean orthogonal look)
function orthogonal(points, r) {
  let d = `M ${f(points[0].x)},${f(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1], p1 = points[i], p2 = points[i + 1];
    const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1, l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
    const rr = Math.min(r, l1 / 2, l2 / 2);
    d += ` L ${f(p1.x + (p0.x - p1.x) / l1 * rr)},${f(p1.y + (p0.y - p1.y) / l1 * rr)}`;
    d += ` Q ${f(p1.x)},${f(p1.y)} ${f(p1.x + (p2.x - p1.x) / l2 * rr)},${f(p1.y + (p2.y - p1.y) / l2 * rr)}`;
  }
  const last = points[points.length - 1];
  return d + ` L ${f(last.x)},${f(last.y)}`;
}

// Catmull-Rom spline → smooth curve through points
function smooth(points) {
  let d = `M ${f(points[0].x)},${f(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || p2;
    d += ` C ${f(p1.x + (p2.x - p0.x) / 6)},${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)},${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)},${f(p2.y)}`;
  }
  return d;
}

// edgePath(points, {style, r}) → SVG path `d`. style ∈ orthogonal(default)|rounded|straight
export function edgePath(points, { style = 'orthogonal', r = 12 } = {}) {
  if (!points || points.length < 2) return '';
  if (points.length === 2) return `M ${f(points[0].x)},${f(points[0].y)} L ${f(points[1].x)},${f(points[1].y)}`;
  if (style === 'straight') return straight(points);
  if (style === 'rounded' || style === 'smooth') return smooth(points);
  return orthogonal(points, r);
}

export function arrowMarkerDefs(id = 'arrow', color = AMBER) {
  return `<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
    `<path d="M0,0 L10,5 L0,10 z" fill="${color}"/></marker></defs>`;
}

// ── edge-end glyphs ──────────────────────────────────────────────────────────
// Each glyph is drawn at boundary point P with D = unit vector pointing INTO the node.
const perpOf = D => ({ x: -D.y, y: D.x });
const END_GLYPHS = {};
export function registerEdgeEnd(kind, fn) { END_GLYPHS[kind] = fn; }
export function edgeEndGlyph(kind, P, D, color = AMBER) {
  const fn = END_GLYPHS[kind];
  return fn ? fn(P, D, color) : '';
}

// filled arrowhead pointing into the node
registerEdgeEnd('arrow', (P, D, c) => {
  const pr = perpOf(D), b = { x: P.x - D.x * 9, y: P.y - D.y * 9 };
  return `<polygon points="${f(P.x)},${f(P.y)} ${f(b.x + pr.x * 4.5)},${f(b.y + pr.y * 4.5)} ${f(b.x - pr.x * 4.5)},${f(b.y - pr.y * 4.5)}" fill="${c}"/>`;
});

// ERD crow's-foot cardinality (one ─┤ · many ─< · optional zero ○)
function crow(P, D, c, kind) {
  const perp = perpOf(D);
  const sw = `stroke="${c}" stroke-width="2" stroke-linecap="round" fill="none"`;
  const at = (dd, pp = 0) => ({ x: P.x - D.x * dd + perp.x * pp, y: P.y - D.y * dd + perp.y * pp });
  let s = '';
  const many = kind.includes('many'), zero = kind.includes('zero');
  if (many) { const apex = at(13); for (const sgn of [8, -8, 0]) s += `<line x1="${f(apex.x)}" y1="${f(apex.y)}" x2="${f(P.x + perp.x * sgn)}" y2="${f(P.y + perp.y * sgn)}" ${sw}/>`; }
  else { const cc = at(10); s += `<line x1="${f(cc.x + perp.x * 8)}" y1="${f(cc.y + perp.y * 8)}" x2="${f(cc.x - perp.x * 8)}" y2="${f(cc.y - perp.y * 8)}" ${sw}/>`; }
  if (zero) { const o = at(many ? 22 : 20); s += `<circle cx="${f(o.x)}" cy="${f(o.y)}" r="5" fill="#fff" stroke="${c}" stroke-width="2"/>`; }
  return s;
}
for (const k of ['one', 'many', 'zero-one', 'zero-many']) registerEdgeEnd('crow-' + k, (P, D, c) => crow(P, D, c, k));

// UML inheritance: hollow triangle, apex at the parent
registerEdgeEnd('triangle', (P, D, c) => {
  const pr = perpOf(D), b = { x: P.x - D.x * 13, y: P.y - D.y * 13 };
  return `<polygon points="${f(P.x)},${f(P.y)} ${f(b.x + pr.x * 7)},${f(b.y + pr.y * 7)} ${f(b.x - pr.x * 7)},${f(b.y - pr.y * 7)}" fill="#fff" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`;
});

// UML aggregation (hollow) / composition (filled): diamond on the whole/owner side
function diamond(P, D, c, fill) {
  const pr = perpOf(D), mid = { x: P.x - D.x * 8, y: P.y - D.y * 8 }, far = { x: P.x - D.x * 16, y: P.y - D.y * 16 };
  return `<polygon points="${f(P.x)},${f(P.y)} ${f(mid.x + pr.x * 6)},${f(mid.y + pr.y * 6)} ${f(far.x)},${f(far.y)} ${f(mid.x - pr.x * 6)},${f(mid.y - pr.y * 6)}" fill="${fill}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`;
}
registerEdgeEnd('diamond', (P, D, c) => diamond(P, D, c, '#fff'));
registerEdgeEnd('diamond-filled', (P, D, c) => diamond(P, D, c, c));

export function edgeLabelChip(point, text) {
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const w = String(text).length * 6.5 + 14;
  return `<g transform="translate(${f(point.x - w / 2)},${f(point.y - 10)})">` +
    `<rect width="${f(w)}" height="20" rx="5" fill="#fffbeb" stroke="#fde68a"/>` +
    `<text x="${f(w / 2)}" y="14" text-anchor="middle" font-size="12" font-weight="600" fill="${AMBER}" font-family="-apple-system,Segoe UI,Roboto,sans-serif">${esc(text)}</text></g>`;
}
