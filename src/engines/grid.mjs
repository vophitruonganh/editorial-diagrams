// Grid engine: matrix, quadrant, kanban, swimlane. Mostly editorial HTML/CSS;
// swimlane uses manual lane×column placement + SVG arrows.
import { renderChrome } from '../chrome.mjs';
import { parseCard } from '../gen.mjs';
import { edgePath, arrowMarkerDefs, edgeLabelChip, AMBER } from '../edges.mjs';

const f = n => Number(n).toFixed(1);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SANS = '-apple-system,Segoe UI,Roboto,sans-serif';

// static (flow-positioned) editorial card from the card DSL
function staticCard(dsl, extra = '') {
  const c = parseCard(dsl);
  const cls = ['card', c.kind].filter(Boolean).join(' ');
  const stereo = c.stereo ? `<span class="stereo">‹component›</span>` : '';
  const tech = c.tech ? `<span class="c4tech">${esc(c.tech)}</span>` : '';
  const p = c.p ? `<p>${esc(c.p)}</p>` : '';
  return `<div class="${cls}" style="margin:0 0 10px;${extra}">${stereo}<h4>${esc(c.h)}</h4>${tech}${p}</div>`;
}

// ── matrix ───────────────────────────────────────────────────────────────────
function matrix(spec, css) {
  const cols = spec.cols || [], rows = spec.rows || [];
  const th = `<th style="text-align:left;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:#64748b;font-weight:700;padding:9px 12px;border-bottom:1px solid #DCE0E6"></th>` +
    cols.map(c => `<th style="text-align:left;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:#64748b;font-weight:700;padding:9px 12px;border-bottom:1px solid #DCE0E6">${esc(c)}</th>`).join('');
  const trs = rows.map(r => {
    const cells = (r.cells || []).map(c => `<td style="padding:9px 12px;border-bottom:1px solid #eef1f5;font-size:13px;color:#334155">${c == null ? '' : esc(c)}</td>`).join('');
    return `<tr><td style="padding:9px 12px;border-bottom:1px solid #eef1f5;font-weight:600;color:#0f172a;font-size:13px">${esc(r.label)}</td>${cells}</tr>`;
  }).join('');
  const body = `\n  <div style="overflow-x:auto;margin-top:10px"><table style="border-collapse:collapse;width:100%;font-family:${SANS};border:1px solid #DCE0E6;border-radius:10px"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></div>`;
  return renderChrome(spec, body, css, { maxw: 980 });
}

// ── quadrant (2×2) ───────────────────────────────────────────────────────────
function quadrant(spec, css) {
  const S = 460, items = spec.items || [];
  const [xl, xr] = spec.xAxis || ['low', 'high'];
  const [yb, yt] = spec.yAxis || ['low', 'high'];
  const q = spec.quadrants || [];
  const pt = (x, y) => ({ px: 10 + x * (S - 20), py: 10 + (1 - y) * (S - 20) });
  let dots = '';
  for (const it of items) {
    const { px, py } = pt(it.x ?? 0.5, it.y ?? 0.5);
    dots += `<div style="position:absolute;left:${f(px)}px;top:${f(py)}px;transform:translate(-50%,-50%)"><div style="width:11px;height:11px;border-radius:50%;background:${AMBER};margin:0 auto"></div>` +
      `<div style="font-size:12px;font-weight:600;color:#0f172a;white-space:nowrap;margin-top:3px;transform:translateX(-50%);margin-left:50%">${esc(it.label)}</div></div>`;
  }
  const qlabel = (text, pos) => text ? `<div style="position:absolute;${pos};font-size:11.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em">${esc(text)}</div>` : '';
  const body = `\n  <div style="display:flex;justify-content:center;margin-top:10px"><div style="position:relative;width:${S}px;height:${S}px;font-family:${SANS}">` +
    `<div style="position:absolute;inset:0;border:1px solid #DCE0E6;border-radius:12px"></div>` +
    `<div style="position:absolute;left:50%;top:0;bottom:0;border-left:1px dashed #DCE0E6"></div>` +
    `<div style="position:absolute;top:50%;left:0;right:0;border-top:1px dashed #DCE0E6"></div>` +
    qlabel(q[0], 'left:12px;top:10px') + qlabel(q[1], 'right:12px;top:10px') + qlabel(q[2], 'left:12px;bottom:10px') + qlabel(q[3], 'right:12px;bottom:10px') +
    dots +
    `<div style="position:absolute;left:-6px;top:-26px;font-size:12px;font-weight:700;color:#475569">${esc(yt)} ↑</div>` +
    `<div style="position:absolute;left:-6px;bottom:-26px;font-size:12px;color:#94a3b8">${esc(yb)}</div>` +
    `<div style="position:absolute;right:-6px;bottom:-26px;font-size:12px;font-weight:700;color:#475569">${esc(xr)} →</div>` +
    `<div style="position:absolute;left:-6px;bottom:-26px;font-size:12px;color:#94a3b8"></div>` +
    `</div></div>`;
  return renderChrome(spec, body, css, { maxw: S + 120 });
}

// ── kanban ───────────────────────────────────────────────────────────────────
function kanban(spec, css) {
  const cols = spec.columns || [];
  const colHTML = cols.map(col => {
    const cards = (col.cards || []).map(c => staticCard(c)).join('');
    return `<div style="flex:1 1 0;min-width:180px;background:#f8fafc;border:1px solid #DCE0E6;border-radius:12px;padding:12px">` +
      `<div style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#475569;margin-bottom:10px">${esc(col.title)}${col.cards ? ` <span style="color:#94a3b8">· ${col.cards.length}</span>` : ''}</div>${cards}</div>`;
  }).join('');
  const body = `\n  <div style="display:flex;gap:14px;align-items:flex-start;margin-top:10px">${colHTML}</div>`;
  return renderChrome(spec, body, css, { maxw: Math.max(700, cols.length * 230) });
}

// ── swimlane (lanes × ordered steps + arrows) ────────────────────────────────
function swimlane(spec, css) {
  const lanes = spec.lanes || [], steps = spec.steps || [], edges = spec.edges || [];
  const li = Object.fromEntries(lanes.map((l, i) => [l.id, i]));
  const LABELW = 130, COLW = spec.colWidth || 210, ROWH = 110, CARDW = 180, CARDH = 70, TOP = 20;
  const maxT = Math.max(0, ...steps.map(s => s.t));
  const W = LABELW + (maxT + 1) * COLW, H = TOP + lanes.length * ROWH;
  const stepById = Object.fromEntries(steps.map(s => [s.id, s]));
  const cx = s => LABELW + s.t * COLW + COLW / 2;
  const cy = s => TOP + li[s.lane] * ROWH + ROWH / 2;

  let bands = '', cards = '', svg = '';
  lanes.forEach((l, i) => {
    bands += `<div style="position:absolute;left:0;top:${TOP + i * ROWH}px;width:${W}px;height:${ROWH}px;background:${i % 2 ? '#fbfcfd' : '#fff'};border-top:1px solid #eef1f5"></div>` +
      `<div style="position:absolute;left:14px;top:${TOP + i * ROWH + ROWH / 2 - 11}px"><div style="background:#475569;color:#fff;font-size:11.5px;font-weight:700;border-radius:11px;padding:4px 12px">${esc(l.label || l.id)}</div></div>`;
  });
  for (const s of steps) {
    const c = parseCard(s.card ?? s.label ?? '');
    const cls = ['card', c.kind].filter(Boolean).join(' ');
    const tech = c.tech ? `<span class="c4tech">${esc(c.tech)}</span>` : '';
    const p = c.p ? `<p>${esc(c.p)}</p>` : '';
    cards += `<div class="${cls}" style="position:absolute;left:${cx(s) - CARDW / 2}px;top:${cy(s) - CARDH / 2}px;width:${CARDW}px;height:${CARDH}px;box-sizing:border-box;margin:0;display:flex;flex-direction:column;justify-content:center"><h4>${esc(c.h)}</h4>${tech}${p}</div>`;
  }
  let paths = '';
  for (const e of edges) {
    const a = stepById[e.from], b = stepById[e.to];
    if (!a || !b) continue;
    const p0 = { x: cx(a) + (cx(b) >= cx(a) ? CARDW / 2 : -CARDW / 2), y: cy(a) };
    const p1 = { x: cx(b) + (cx(b) >= cx(a) ? -CARDW / 2 : CARDW / 2), y: cy(b) };
    const mx = (p0.x + p1.x) / 2;
    const pts = [p0, { x: mx, y: p0.y }, { x: mx, y: p1.y }, p1];
    paths += `<path d="${edgePath(pts, { style: 'orthogonal' })}" fill="none" stroke="${AMBER}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow)"/>`;
    if (e.label) paths += edgeLabelChip({ x: mx, y: (p0.y + p1.y) / 2 }, e.label);
  }
  svg = `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0;pointer-events:none">${arrowMarkerDefs()}${paths}</svg>`;
  const body = `\n  <div style="position:relative;width:${W}px;height:${H}px;margin:10px auto 0">${bands}${svg}${cards}</div>`;
  return renderChrome(spec, body, css, { maxw: W + 160 });
}

const MODES = { matrix, quadrant, kanban, swimlane };
export function renderGrid(spec, css) {
  const fn = MODES[spec.type];
  if (!fn) throw new Error(`grid engine: unknown type "${spec.type}"`);
  return fn(spec, css);
}
