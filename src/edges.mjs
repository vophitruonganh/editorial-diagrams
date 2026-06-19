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

export function edgeLabelChip(point, text) {
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const w = String(text).length * 6.5 + 14;
  return `<g transform="translate(${f(point.x - w / 2)},${f(point.y - 10)})">` +
    `<rect width="${f(w)}" height="20" rx="5" fill="#fffbeb" stroke="#fde68a"/>` +
    `<text x="${f(w / 2)}" y="14" text-anchor="middle" font-size="12" font-weight="600" fill="${AMBER}" font-family="-apple-system,Segoe UI,Roboto,sans-serif">${esc(text)}</text></g>`;
}
