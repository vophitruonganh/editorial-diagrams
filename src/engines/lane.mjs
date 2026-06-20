// Lane / time-axis engine: git-workflow, timeline, gantt, user-journey.
// No dagre — positions are lane-index + time math. Editorial palette throughout.
import { renderChrome } from '../chrome.mjs';
import { edgeEndGlyph, edgePath } from '../edges.mjs';

const f = n => Number(n).toFixed(1);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SANS = '-apple-system,Segoe UI,Roboto,sans-serif';
// editorial palette (matches themes/editorial.css :root) — restrained, no neon
const PAL = ['#2563EB', '#475569', '#4F46E5', '#2E8B6B', '#b45309', '#1F2B45'];

function svgWrap(inner, w, h) {
  return `\n  <div style="overflow-x:auto"><svg width="${w}" height="${h}" style="display:block;margin:8px auto 0;max-width:100%">${inner}</svg></div>`;
}

// ── git-workflow ─────────────────────────────────────────────────────────────
function gwLabelChip(p, text) {
  const w = String(text).length * 6.6 + 16;
  return `<g transform="translate(${f(p.x - w / 2)},${f(p.y - 11)})">` +
    `<rect width="${f(w)}" height="22" rx="5" fill="#ffffff" stroke="#e2e8f0"/>` +
    `<text x="${f(w / 2)}" y="15" text-anchor="middle" font-size="11.5" font-weight="600" fill="#475569" font-family="${SANS}">${esc(text)}</text></g>`;
}

// legend strip — explains the notation (line styles, dot, arrow) so the diagram is
// self-readable. marker ∈ solid | dashed | dot | arrow.
function gwLegend(items, x0, y) {
  const INK = '#475569';
  let s = '', cx = x0;
  for (const it of items) {
    let mw = 30;
    if (it.marker === 'dot') { s += `<circle cx="${f(cx + 7)}" cy="${f(y)}" r="6" fill="#fff" stroke="${INK}" stroke-width="2.5"/>`; mw = 16; }
    else if (it.marker === 'dashed') { s += `<line x1="${f(cx)}" y1="${f(y)}" x2="${f(cx + 30)}" y2="${f(y)}" stroke="${INK}" stroke-width="2" stroke-dasharray="6 5" stroke-linecap="round"/>`; mw = 34; }
    else if (it.marker === 'arrow') { s += `<line x1="${f(cx)}" y1="${f(y)}" x2="${f(cx + 22)}" y2="${f(y)}" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/><polygon points="${f(cx + 31)},${f(y)} ${f(cx + 22)},${f(y - 4.5)} ${f(cx + 22)},${f(y + 4.5)}" fill="${INK}"/>`; mw = 34; }
    else { s += `<line x1="${f(cx)}" y1="${f(y)}" x2="${f(cx + 30)}" y2="${f(y)}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`; mw = 34; }
    s += `<text x="${f(cx + mw + 7)}" y="${f(y + 4)}" font-size="12" fill="${INK}" font-family="${SANS}">${esc(it.text)}</text>`;
    cx += mw + 7 + String(it.text).length * 6.6 + 26;
  }
  return s;
}

function gitWorkflow(spec, css) {
  const lanes = spec.lanes || [];
  const li = Object.fromEntries(lanes.map((l, i) => [l.id, i]));
  const color = id => lanes[li[id]]?.color || PAL[li[id] % PAL.length];
  const commits = spec.commits || [], links = spec.links || [], bands = spec.bands || [];
  const STEP = spec.step || 122, LANE = spec.laneGap || 84, R = 13;
  const BOXW = 142, Y0 = 60;
  const boxX = 16;                       // lane label boxes = LEFT row-headers (read name → timeline)
  const X0 = boxX + BOXW + 34;           // the timeline starts just after the labels
  // Even columns: each DISTINCT time becomes one evenly-spaced column. Preserves
  // time order (left→right) but de-clusters events bunched at small t — the classic
  // gitgraph spacing, so nothing gets cramped where many things happen close in time.
  const times = [...new Set([...commits.map(c => c.t), ...links.flatMap(k => [k.from.t, k.to.t])])].sort((a, b) => a - b);
  const colOf = new Map(times.map((t, i) => [t, i]));
  const x = t => X0 + (colOf.has(t) ? colOf.get(t) : 0) * STEP;
  const y = b => Y0 + li[b] * LANE;
  const maxT = times.length ? times[times.length - 1] : 0;
  const maxCol = Math.max(0, times.length - 1);
  const W = X0 + maxCol * STEP + 84, H = Y0 + (lanes.length - 1) * LANE + 56 + 46;

  // 0) environment groups — NO background colour: just a section label + a faint
  //    divider line between groups (Production / Test / Develop).
  let bg = '';
  bands.forEach((bd, bi) => {
    const idxs = (bd.lanes || []).map(id => li[id]).filter(i => i != null);
    if (!idxs.length) return;
    const top = Y0 + Math.min(...idxs) * LANE - LANE / 2 + 2;
    if (bi > 0) bg += `<line x1="${f(X0 - 18)}" y1="${f(top)}" x2="${f(W - 16)}" y2="${f(top)}" stroke="#e8ecf1" stroke-width="1"/>`;
    if (bd.label) bg += `<text x="${f(X0 - 8)}" y="${f(top + 19)}" font-size="11.5" font-weight="700" fill="#94a3b8" letter-spacing="0.05em" font-family="${SANS}">${esc(bd.label)}</text>`;
  });

  // 1) branch lifelines — SOLID horizontal line over each branch's lifetime in TIME.
  //    Starts at the branch's first commit (= its split time, read left→right) and
  //    ends at its last commit; a branch still active at the final time (a persistent
  //    environment) extends to its lane box on the right.
  let s = '';
  for (const l of lanes) {
    const ts = commits.filter(c => c.branch === l.id).map(c => c.t);
    if (!ts.length) continue;
    const a = Math.min(...ts), b = Math.max(...ts);
    const sx = x(a);
    const ex = Math.abs(b - maxT) < 0.01 ? W - 28 : Math.max(x(b), sx + STEP * 0.5);
    s += `<line x1="${f(sx)}" y1="${f(y(l.id))}" x2="${f(ex)}" y2="${f(y(l.id))}" stroke="${color(l.id)}" stroke-width="3" stroke-linecap="round" opacity="0.92"/>`;
  }

  // 2) branch / merge connectors — smooth curves that LEAVE the source and ENTER
  //    the target horizontally (the canonical gitflow look). An arrowhead at the
  //    target marks direction; the curve meets the commit dots, so branch-points
  //    and merge-points are explicit. `branch` = create, `merge` = integrate.
  let heads = '';
  for (const k of links) {
    const sx = x(k.from.t), sy = y(k.from.branch), tx = x(k.to.t), ty = y(k.to.branch);
    const c = k.type === 'merge' ? color(k.from.branch) : color(k.to.branch);
    const dir = tx >= sx ? 1 : -1;
    const k1 = Math.max(STEP * 0.32, Math.min(Math.abs(tx - sx) * 0.5, STEP * 0.8)) * dir;
    const ex = tx - dir * (R + 7);
    s += `<path d="M ${f(sx + dir * R)},${f(sy)} C ${f(sx + k1)},${f(sy)} ${f(tx - k1)},${f(ty)} ${f(ex)},${f(ty)}" ` +
      `fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>`;
    heads += edgeEndGlyph('arrow', { x: tx - dir * R, y: ty }, { x: dir, y: 0 }, c);
    if (k.label) s += gwLabelChip({ x: (sx + tx) / 2, y: (sy + ty) / 2 }, k.label);
  }
  s += heads;

  // 3) commit dots — short labels (≤3 chars) sit inside; longer (versions) float above
  for (const c of commits) {
    const cx = x(c.t), cy = y(c.branch), col = color(c.branch);
    s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${R}" fill="#ffffff" stroke="${col}" stroke-width="3"/>`;
    if (c.label) {
      if (String(c.label).length <= 3) {
        s += `<text x="${f(cx)}" y="${f(cy + 4)}" text-anchor="middle" font-size="11" font-weight="700" fill="${col}" font-family="${SANS}">${esc(c.label)}</text>`;
      } else {
        const below = li[c.branch] === 0;
        const ly = below ? cy + R + 17 : cy - R - 9;
        s += `<text x="${f(cx)}" y="${f(ly)}" text-anchor="middle" font-size="12.5" font-weight="700" fill="#334155" ` +
          `font-family="${SANS}" paint-order="stroke" stroke="#ffffff" stroke-width="3.5" stroke-linejoin="round">${esc(c.label)}</text>`;
      }
    }
  }

  // 4) lane label boxes on the LEFT (row headers — read the branch name, then its timeline)
  for (const l of lanes) {
    const cy = y(l.id), col = color(l.id);
    s += `<g transform="translate(${f(boxX)},${f(cy - 14)})"><rect width="${BOXW}" height="28" rx="14" fill="${col}"/>` +
      `<text x="${f(BOXW / 2)}" y="19" text-anchor="middle" font-size="12.5" font-weight="700" fill="#ffffff" font-family="${SANS}">${esc(l.label || l.id)}</text></g>`;
  }

  // 5) legend — makes the notation self-explanatory (override via spec.legend)
  const legend = spec.legend || [
    { marker: 'dot', text: 'commit / phiên bản' },
    { marker: 'solid', text: 'nhánh · môi trường (theo thời gian)' },
    { marker: 'arrow', text: 'branch = tách nhánh · merge / MR = gộp code' },
    { marker: 'dashed', text: 'pull = đồng bộ image/config xuống env' },
  ];
  const legendY = H - 20;
  s += `<line x1="${f(X0 - 18)}" y1="${f(legendY - 24)}" x2="${f(W - 16)}" y2="${f(legendY - 24)}" stroke="#eef1f5" stroke-width="1"/>`;
  s += gwLegend(legend, X0 - 18, legendY);
  return renderChrome(spec, svgWrap(bg + s, W, H), css, { maxw: W + 40 });
}

// ── timeline / roadmap ───────────────────────────────────────────────────────
function timeline(spec, css) {
  const ev = spec.events || [];
  const X0 = 90, STEP = spec.step || 200, AX = 170, CARDW = 170;
  const x = i => X0 + i * STEP;
  const W = x(Math.max(0, ev.length - 1)) + CARDW;
  const H = AX + 170;
  let s = `<line x1="${f(x(0) - 24)}" y1="${AX}" x2="${f(x(ev.length - 1) + 24)}" y2="${AX}" stroke="#475569" stroke-width="3" stroke-linecap="round"/>`;
  ev.forEach((e, i) => {
    const cx = x(i), above = i % 2 === 0;
    const cy = above ? AX - 96 : AX + 18;
    s += `<circle cx="${f(cx)}" cy="${AX}" r="7" fill="#fff" stroke="#b45309" stroke-width="3"/>`;
    s += `<line x1="${f(cx)}" y1="${above ? AX - 7 : AX + 7}" x2="${f(cx)}" y2="${above ? cy + 78 : cy}" stroke="#cbd5e1" stroke-width="1.5"/>`;
    const tag = e.at ? `<div style="font-size:11px;font-weight:700;color:#b45309;letter-spacing:.04em">${esc(e.at)}</div>` : '';
    s += `<foreignObject x="${f(cx - CARDW / 2)}" y="${f(cy)}" width="${CARDW}" height="78">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${SANS};border:1px solid #DCE0E6;border-radius:10px;background:#fff;padding:8px 11px">` +
      `${tag}<div style="font-size:13.5px;font-weight:700;color:#0f172a">${esc(e.title)}</div>` +
      `${e.detail ? `<div style="font-size:12px;color:#64748b;margin-top:2px">${esc(e.detail)}</div>` : ''}</div></foreignObject>`;
  });
  return renderChrome(spec, svgWrap(s, W, H), css, { maxw: W + 80 });
}

// ── gantt ────────────────────────────────────────────────────────────────────
function gantt(spec, css) {
  const tasks = spec.tasks || [];
  const starts = tasks.map(t => t.start), ends = tasks.map(t => t.end);
  const min = Math.min(0, ...starts), max = Math.max(1, ...ends), span = (max - min) || 1;
  const LABELW = 180, UNIT = spec.unit || 46, PLOT = span * UNIT, ROW = 40, TOP = 56;
  const x = v => LABELW + (v - min) / span * PLOT;
  const W = LABELW + PLOT + 40, H = TOP + tasks.length * ROW + 24;
  let s = '';
  for (let v = Math.ceil(min); v <= max; v++) {
    s += `<line x1="${f(x(v))}" y1="${TOP - 18}" x2="${f(x(v))}" y2="${f(TOP + tasks.length * ROW)}" stroke="#eef1f5" stroke-width="1"/>`;
    s += `<text x="${f(x(v))}" y="${TOP - 24}" text-anchor="middle" font-size="11" fill="#94a3b8" font-family="${SANS}">${v}</text>`;
  }
  tasks.forEach((t, i) => {
    const y = TOP + i * ROW, col = t.color || PAL[2];
    s += `<text x="${LABELW - 14}" y="${f(y + 24)}" text-anchor="end" font-size="13" font-weight="600" fill="#0f172a" font-family="${SANS}">${esc(t.name)}</text>`;
    const bx = x(t.start), bw = Math.max(6, x(t.end) - x(t.start));
    s += `<rect x="${f(bx)}" y="${f(y + 9)}" width="${f(bw)}" height="22" rx="6" fill="${col}" opacity="0.9"/>`;
  });
  return renderChrome(spec, svgWrap(s, W, H), css, { maxw: W + 80 });
}

// ── user-journey ─────────────────────────────────────────────────────────────
function userJourney(spec, css) {
  const stages = spec.stages || [];
  const X0 = 120, STEP = spec.step || 200, CARDW = 168, TOP = 56, LINE = 300;
  const x = i => X0 + i * STEP;
  const sentY = s => LINE - (Math.max(1, Math.min(5, s)) - 1) / 4 * 120; // 1..5 → low..high
  const W = x(Math.max(0, stages.length - 1)) + CARDW, H = LINE + 60;
  let s = '';
  // sentiment line
  const pts = stages.map((st, i) => `${f(x(i))},${f(sentY(st.sentiment ?? 3))}`);
  if (pts.length > 1) s += `<polyline points="${pts.join(' ')}" fill="none" stroke="#b45309" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  stages.forEach((st, i) => {
    const cx = x(i);
    s += `<foreignObject x="${f(cx - CARDW / 2)}" y="${TOP}" width="${CARDW}" height="84">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${SANS};border:1px solid #DCE0E6;border-radius:10px;background:#fff;padding:9px 12px">` +
      `<div style="font-size:13.5px;font-weight:700;color:#0f172a">${esc(st.name)}</div>` +
      `${st.detail ? `<div style="font-size:12px;color:#64748b;margin-top:2px">${esc(st.detail)}</div>` : ''}</div></foreignObject>`;
    s += `<circle cx="${f(cx)}" cy="${f(sentY(st.sentiment ?? 3))}" r="7" fill="#fff" stroke="#b45309" stroke-width="3"/>`;
  });
  return renderChrome(spec, svgWrap(s, W, H), css, { maxw: W + 80 });
}

const MODES = { 'git-workflow': gitWorkflow, timeline, gantt, 'user-journey': userJourney };
export function renderLane(spec, css) {
  const fn = MODES[spec.type];
  if (!fn) throw new Error(`lane engine: unknown type "${spec.type}"`);
  return fn(spec, css);
}
