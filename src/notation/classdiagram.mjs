// UML class node: editorial card with up to 3 compartments (name · attributes · methods).
// Pairs with triangle (inheritance) / diamond (aggregation·composition) edge glyphs.
import { registerNode, posStyle, esc } from '../nodes.mjs';

const HEAD = 36, ROW = 22, PADV = 12;

function classSize(n) {
  const a = (n.attributes || []).length, m = (n.methods || []).length;
  const sections = (a ? a * ROW + PADV : 0) + (m ? m * ROW + PADV : 0);
  return { w: n.w || 210, h: HEAD + sections + (a || m ? 0 : 6) };
}

const rowList = (items, mono) => (items || []).map(it =>
  `<div style="font-size:12px;color:#334155;height:${ROW}px;line-height:${ROW}px;${mono ? 'font-family:SFMono-Regular,Consolas,monospace;' : ''}overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it)}</div>`
).join('');

registerNode('class', (n, geom) => {
  const a = n.attributes || [], m = n.methods || [];
  const attrs = a.length ? `<div style="padding:6px 13px;border-top:1px solid #DCE0E6">${rowList(a)}</div>` : '';
  const meths = m.length ? `<div style="padding:6px 13px;border-top:1px solid #DCE0E6">${rowList(m, true)}</div>` : '';
  return `<div class="card" style="${posStyle(geom)}padding:0;overflow:hidden">` +
    `<div style="font-weight:700;color:#0f172a;font-size:14px;text-align:center;padding:8px 13px;background:#f8fafc">${esc(n.name || n.id)}</div>` +
    `${attrs}${meths}</div>`;
}, classSize);
