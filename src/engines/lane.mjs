// Lane / time-axis engine: git-workflow, timeline, gantt, user-journey.
// No dagre — positions are lane-index + time math. Editorial palette throughout.
import { renderChrome } from '../chrome.mjs';

const f = n => Number(n).toFixed(1);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SANS = '-apple-system,Segoe UI,Roboto,sans-serif';
const PAL = ['#1F2B45', '#4F46E5', '#b45309', '#0f766e', '#be123c', '#7c3aed'];

function svgWrap(inner, w, h) {
  return `\n  <div style="overflow-x:auto"><svg width="${w}" height="${h}" style="display:block;margin:8px auto 0;max-width:100%">${inner}</svg></div>`;
}

// ── git-workflow ─────────────────────────────────────────────────────────────
function gitWorkflow(spec, css) {
  const lanes = spec.lanes || [];
  const li = Object.fromEntries(lanes.map((l, i) => [l.id, i]));
  const color = id => lanes[li[id]]?.color || PAL[li[id] % PAL.length];
  const commits = spec.commits || [], links = spec.links || [];
  const X0 = 150, STEP = spec.step || 96, Y0 = 56, LANE = spec.laneGap || 92, R = 7;
  const x = t => X0 + t * STEP, y = b => Y0 + li[b] * LANE;
  const maxT = Math.max(0, ...commits.map(c => c.t), ...links.flatMap(k => [k.from.t, k.to.t]));
  const W = x(maxT) + 70, H = Y0 + (lanes.length - 1) * LANE + 70;

  let s = '';
  for (const l of lanes) {
    const ts = commits.filter(c => c.branch === l.id).map(c => c.t);
    if (!ts.length) continue;
    s += `<line x1="${f(x(Math.min(...ts)))}" y1="${f(y(l.id))}" x2="${f(x(Math.max(...ts)))}" y2="${f(y(l.id))}" stroke="${color(l.id)}" stroke-width="3" stroke-linecap="round" opacity="0.85"/>`;
  }
  for (const k of links) {
    const sx = x(k.from.t), sy = y(k.from.branch), tx = x(k.to.t), ty = y(k.to.branch);
    const dx = (tx - sx) * 0.5 || STEP * 0.5;
    const c = k.type === 'merge' ? color(k.from.branch) : color(k.to.branch);
    s += `<path d="M ${f(sx)},${f(sy)} C ${f(sx + dx)},${f(sy)} ${f(tx - dx)},${f(ty)} ${f(tx)},${f(ty)}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity="0.9"/>`;
  }
  for (const c of commits) {
    const cx = x(c.t), cy = y(c.branch), col = color(c.branch);
    s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${R}" fill="#fff" stroke="${col}" stroke-width="3"/>`;
    if (c.label) s += `<text x="${f(cx)}" y="${f(cy - 16)}" text-anchor="middle" font-size="12" font-weight="600" fill="#334155" font-family="${SANS}">${esc(c.label)}</text>`;
  }
  for (const l of lanes) {
    s += `<g transform="translate(18,${f(y(l.id) - 11)})"><rect width="104" height="22" rx="11" fill="${color(l.id)}"/>` +
      `<text x="52" y="15" text-anchor="middle" font-size="11.5" font-weight="700" fill="#fff" font-family="${SANS}">${esc(l.label || l.id)}</text></g>`;
  }
  return renderChrome(spec, svgWrap(s, W, H), css, { maxw: W + 80 });
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
