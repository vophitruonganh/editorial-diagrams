// Data-driven diagram generator — pure spec → editorial HTML string.
// Lifted from docs/system/diagrams/gen.mjs. Changes vs source:
//   - CSS is INLINED into <style> (no ../editorial.css link)
//   - fs/path imports + CLI runner removed
//   - build()/applyPreset()/parseCard() exported; renderSpec() added (clones)
//
// Block types (detected by key):
//   {cards:[...], label?, ctx?, cols?, conn?}      → labelled grid of cards
//   {flow:[card|{arrow}], label?, conn?}           → horizontal pipeline
//   {boundary:"label", blocks:[...], core?, conn?} → dashed container boundary
//   {steps:[{from,to?,proto?,detail?,done?}]}      → numbered Dynamic sequence
//   {conn:"label"}                                 → standalone vertical connector
//   {rels?, note?, refs?, relsTitle?}              → footer band
//   {caption:"..."}                                → bottom caption
// Card: "Name" or {h, stereo?, tech?, p?, kind?}   kind ∈ person|ext|ds|jewel|sec|muted

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const KINDS = ['ext', 'ds', 'jewel', 'sec', 'muted', 'person'];
// compact card DSL:  "[kind:][+]Name | [tech] | detail"   (+ = ‹component› stereotype)
export function parseCard(c) {
  if (typeof c !== 'string') return c;
  const parts = c.split('|').map(s => s.trim());
  let head = parts[0];
  const o = {};
  const km = head.match(/^([a-z]+):/);
  if (km && KINDS.includes(km[1])) { o.kind = km[1]; head = head.slice(km[0].length); }
  if (head.startsWith('+')) { o.stereo = 1; head = head.slice(1); }
  o.h = head.trim();
  for (const seg of parts.slice(1)) {
    if (!seg) continue;
    if (/^(\[.*\]|‹.*›)$/.test(seg) && !o.tech) o.tech = seg;   // tech / stereotype marker
    else o.p = o.p ? o.p + ' ' + seg : seg;
  }
  return o;
}
function card(c) {
  c = parseCard(c);
  const cls = ['card', c.kind].filter(Boolean).join(' ');
  const stereo = c.stereo ? `<span class="stereo">‹component›</span>` : '';
  const tech = c.tech ? `<span class="c4tech">${esc(c.tech)}</span>` : '';
  const p = c.p ? `<p>${esc(c.p)}</p>` : '';
  return `<div class="${cls}">${stereo}<h4>${esc(c.h)}</h4>${tech}${p}</div>`;
}
const conn = t => `<div class="conn"><span class="lbl">${esc(t)}</span><span class="vline"></span><span class="arrow"></span></div>`;
const hconn = t => `<div class="hconn"><span class="lbl">${esc(t)}</span><span class="line"><span class="hl"></span><span class="ha"></span></span></div>`;

function group(b) {
  let h = '';
  if (b.label) h += `\n  <div class="${b.ctx ? 'ctxlabel' : 'glabel'}">${esc(b.label)}</div>`;
  const cols = b.cols || b.cards.length;
  const center = b.center ? ' center' : '';
  const style = b.maxw ? ` style="max-width:${b.maxw}px"` : '';
  h += `\n  <div class="grid g${cols}${center}"${style}>${b.cards.map(card).join('')}</div>`;
  if (b.conn) h += '\n  ' + conn(b.conn);
  return h;
}
function flow(b) {
  let h = '';
  if (b.label) h += `\n  <div class="glabel">${esc(b.label)}</div>`;
  const items = b.flow.map(it => (it && it.arrow !== undefined) ? hconn(it.arrow) : card(it)).join('');
  h += `\n  <div class="flow">${items}</div>`;
  if (b.conn) h += '\n  ' + conn(b.conn);
  return h;
}
function steps(b) {
  const parts = b.steps.map((s, i) => {
    const done = s.done ? ' done' : '';
    const title = s.to
      ? `<span class="actor">${esc(s.from)}</span> → <span class="actor">${esc(s.to)}</span>${s.proto ? ` <span class="proto">${esc(s.proto)}</span>` : ''}`
      : esc(s.from);
    return `<div class="step${done}"><div class="n">${i + 1}</div><div class="b"><h4>${title}</h4>${s.detail ? `<p>${esc(s.detail)}</p>` : ''}</div></div>`;
  }).join('<div class="stepconn"><div class="a"></div></div>');
  return `\n  <div class="steps">${parts}</div>`;
}
function boundary(b) {
  const style = b.core ? ' style="border-color:#475569;background:#fbfcfd"' : '';
  const lblStyle = b.core ? ' style="background:#475569"' : '';
  const inner = b.blocks.map(renderBlock).join('');
  let h = `\n  <div class="boundary"${style}><span class="blabel"${lblStyle}>${esc(b.boundary)}</span>${inner}\n  </div>`;
  if (b.conn) h += '\n  ' + conn(b.conn);
  return h;
}
function footer(b) {
  let h = '\n  <div class="footer">';
  if (b.rels) h += `<div class="rels"><b>${b.relsTitle || 'Relationships (uses):'}</b><br>\n  • ${b.rels.join('<br>\n  • ')}</div>`;
  if (b.note) h += `<div class="m">${b.note}</div>`;
  if (b.refs) h += `<div class="refs"><b>Related views:</b> ${b.refs}</div>`;
  h += '</div>';
  return h;
}
function renderBlock(b) {
  if (b.caption !== undefined) return `\n  <div class="caption">${esc(b.caption)}</div>`;
  if (b.peernote) return `\n  <div class="peernote">${b.peernote}</div>`;
  if (b.rels || b.refs || b.note) return footer(b);
  if (b.boundary) return boundary(b);
  if (b.steps) return steps(b);
  if (b.flow) return flow(b);
  if (b.cards) return group(b);
  if (b.conn !== undefined) return conn(b.conn);
  return '';
}
export function build(spec, css) {
  let h = `<!doctype html><html><head><meta charset="utf-8"><style>\n${css}\n</style></head><body>\n<div class="diagram">`;
  h += `\n  <div class="eyebrow">${esc(spec.eyebrow)}</div>`;
  h += `\n  <div class="title">${esc(spec.title)}</div>`;
  if (spec.subtitle) h += `\n  <div class="subtitle">${spec.subtitle}</div>`;
  h += `\n  <div class="rule"></div>`;
  h += (spec.blocks || []).map(renderBlock).join('');
  if (spec.caption) h += `\n  <div class="caption">${esc(spec.caption)}</div>`;
  h += `\n</div>\n</body></html>\n`;
  return h;
}

// ── reusable partials ────────────────────────────────────────────────────────
const PARTIALS = {
  stores: ['ds:MongoDB|[datastore]|main · log · queue', 'ds:KeyDB|[datastore · Redis]|cache', 'ds:Kafka|[event bus]|event_bus'],
  coreBoundary: conn => ({
    boundary: '‹shared system› Core — idp-sources/core', core: true, conn,
    blocks: [{ cols: 4, cards: ['mail-processor|[shared]|email', 'file-manager|[shared]|files / uploads', 'geoip-lookup|[shared]|geo-IP', 'backend-master-data|[shared · Thrift]|master data'] }]
  })
};
// ── presets: expand a compact spec into the canonical blocks[] ────────────────
export function applyPreset(spec) {
  if (!spec.preset) return spec;
  const blocks = [];
  if (spec.preset === 'c4-l3' || spec.preset === 'c4-l2') {
    if (spec.subtitle === undefined) spec.subtitle = 'box = <b>component</b> [technology] · arrow = <b>uses / calls</b>';
    if (spec.callers) {
      const lbl = spec.callersLabel !== undefined ? spec.callersLabel : 'Callers · other containers (context — each has its own L3)';
      const b = { cards: spec.callers, conn: spec.conn };
      if (lbl) { b.label = lbl; b.ctx = true; }
      if (spec.callersCols) b.cols = spec.callersCols;
      if (spec.callersCenter) b.center = true;
      if (spec.callersMaxw) b.maxw = spec.callersMaxw;
      blocks.push(b);
    }
    if (spec.boundary) {
      const inner = [];
      for (const l of (spec.layers || [])) {
        if (l.flow) inner.push({ flow: l.flow, label: l.l, conn: l.conn });
        else inner.push({ label: l.l, cols: l.c, center: l.center, maxw: l.maxw, cards: l.cards, conn: l.conn });
        if (l.note) inner.push({ peernote: l.note });
      }
      blocks.push({ boundary: spec.boundary, core: spec.core, conn: spec.boundaryConn, blocks: inner });
    }
    if (spec.downstreamConn) blocks.push({ conn: spec.downstreamConn });
    if (spec.downstream === '@core') blocks.push(PARTIALS.coreBoundary());
    else if (spec.downstream) {
      const cards = spec.downstream === '@stores' ? PARTIALS.stores : spec.downstream;
      const lbl = spec.downstreamLabel !== undefined ? spec.downstreamLabel : 'Datastores · shared infrastructure (context — not decomposed here)';
      const b = { cards }; if (lbl) { b.label = lbl; b.ctx = true; } if (spec.downstreamCols) b.cols = spec.downstreamCols;
      blocks.push(b);
    }
  }
  if (spec.preset === 'dynamic') {
    if (spec.subtitle === undefined) spec.subtitle = 'numbered steps = <b>execution order</b> · each step = <b>component → component</b> + protocol';
    if (spec.steps) blocks.push({ steps: spec.steps });
  }
  if (spec.rels || spec.refs || spec.note) blocks.push({ rels: spec.rels, refs: spec.refs, note: spec.note, relsTitle: spec.relsTitle });
  spec.blocks = blocks;          // caption is emitted once by build() from spec.caption
  return spec;
}

// Non-mutating entry point used by the renderer and MCP tools.
// applyPreset mutates its argument, so clone first for determinism + caller safety.
export function renderSpec(spec, css) {
  return build(applyPreset(structuredClone(spec)), css);
}
