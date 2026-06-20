// Sequence engine: lifelines (actor columns) + messages (time rows) + activation bars.
// Editorial-styled. message.kind ∈ sync(default)|async|return; activate/return drive bars.
import { renderChrome } from '../chrome.mjs';
import { AMBER } from '../edges.mjs';

const f = n => Number(n).toFixed(1);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SANS = '-apple-system,Segoe UI,Roboto,sans-serif';
const SLATE = '#475569';

export function renderSequence(spec, css) {
  const actors = spec.actors || [];
  const msgs = spec.messages || [];
  const X0 = 110, GAP = spec.gap || 200, AW = 150, AH = 48, TOP = 16;
  const headBottom = TOP + AH;
  const ROW = 60, firstY = headBottom + 54;
  const ai = Object.fromEntries(actors.map((a, i) => [a.id, i]));
  const x = id => X0 + ai[id] * GAP;
  const rowY = r => firstY + r * ROW;
  const W = X0 + (actors.length - 1) * GAP + AW / 2 + 50;
  const lifelineBottom = rowY(msgs.length) + 6;
  const H = lifelineBottom + 24;

  // activation bars: activate pushes on `to`; return/deactivate pops from `from`
  const bars = [], active = {};
  msgs.forEach((m, r) => {
    const y = rowY(r);
    if (m.activate) (active[m.to] ||= []).push(y);
    if (m.return || m.deactivate) { const s = active[m.from]; if (s && s.length) bars.push({ actor: m.from, y0: s.pop(), y1: y }); }
  });
  for (const a in active) for (const y0 of active[a]) bars.push({ actor: a, y0, y1: lifelineBottom });

  let svg = '';
  // lifelines
  for (const a of actors) svg += `<line x1="${f(x(a.id))}" y1="${headBottom}" x2="${f(x(a.id))}" y2="${f(lifelineBottom)}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3 4"/>`;
  // activation bars
  for (const b of bars) svg += `<rect x="${f(x(b.actor) - 5)}" y="${f(b.y0)}" width="10" height="${f(Math.max(8, b.y1 - b.y0))}" fill="#fff" stroke="${SLATE}" stroke-width="1.5" rx="2"/>`;
  // messages
  const markers = `<defs><marker id="seqf" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${AMBER}"/></marker>` +
    `<marker id="seqo" viewBox="0 0 12 12" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10" fill="none" stroke="${AMBER}" stroke-width="1.6"/></marker></defs>`;
  msgs.forEach((m, r) => {
    const y = rowY(r), xf = x(m.from), xt = x(m.to);
    const dashed = m.kind === 'return' ? ' stroke-dasharray="5 4"' : '';
    const marker = m.kind === 'async' || m.kind === 'return' ? 'seqo' : 'seqf';
    if (m.from === m.to) { // self message: loop to the right
      const w = 34;
      svg += `<path d="M ${f(xf + 5)},${f(y)} h ${w} v ${f(ROW * 0.5)} h ${-w}" fill="none" stroke="${AMBER}" stroke-width="2"${dashed} marker-end="url(#${marker})"/>`;
      svg += `<text x="${f(xf + w + 10)}" y="${f(y - 4)}" font-size="12.5" fill="#334155" font-family="${SANS}">${esc(m.text || '')}</text>`;
    } else {
      const dir = xt > xf ? -5 : 5; // stop a hair before the lifeline for the arrowhead
      svg += `<line x1="${f(xf)}" y1="${f(y)}" x2="${f(xt + dir)}" y2="${f(y)}" stroke="${AMBER}" stroke-width="2"${dashed} marker-end="url(#${marker})"/>`;
      const mid = (xf + xt) / 2;
      svg += `<text x="${f(mid)}" y="${f(y - 7)}" text-anchor="middle" font-size="12.5" font-weight="600" fill="#334155" font-family="${SANS}">${esc(m.text || '')}</text>`;
    }
  });
  // actor header cards (drawn last, on top)
  let heads = '';
  for (const a of actors) {
    heads += `<div class="card" style="position:absolute;left:${f(x(a.id) - AW / 2)}px;top:${TOP}px;width:${AW}px;height:${AH}px;box-sizing:border-box;margin:0;display:flex;align-items:center;justify-content:center;text-align:center"><h4 style="margin:0">${esc(a.label || a.id)}</h4></div>`;
  }
  const body = `\n  <div style="position:relative;width:${W}px;height:${H}px;margin:10px auto 0">` +
    `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0;pointer-events:none">${markers}${svg}</svg>${heads}</div>`;
  return renderChrome(spec, body, css, { maxw: W + 120 });
}
