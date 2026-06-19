// ERD entity node: an editorial card styled as a table (name header + field rows
// with PK/FK badges). Pairs with the crow's-foot edge glyphs in edges.mjs.
import { registerNode, posStyle, esc } from '../nodes.mjs';

const HEAD = 38, ROW = 24, PAD = 8;

// field accepts {name,type,key} | [name,type,key] | "name:type"
function normField(field) {
  if (Array.isArray(field)) return { name: field[0], type: field[1], key: field[2] };
  if (typeof field === 'string') { const [name, type] = field.split(':').map(s => s.trim()); return { name, type }; }
  return field || {};
}

function entitySize(n) {
  const rows = (n.fields || []).length;
  return { w: n.w || 220, h: HEAD + rows * ROW + PAD };
}

const badge = key =>
  key === 'pk' ? `<span style="font-size:9.5px;font-weight:700;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:4px;padding:0 4px;margin-right:6px">PK</span>`
  : key === 'fk' ? `<span style="font-size:9.5px;font-weight:700;color:#475569;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;padding:0 4px;margin-right:6px">FK</span>`
  : `<span style="display:inline-block;width:24px"></span>`;

registerNode('entity', (n, geom) => {
  const rows = (n.fields || []).map(normField).map(fl => {
    const nmStyle = fl.key ? 'font-weight:600;color:#0f172a' : 'color:#0f172a';
    return `<div style="display:flex;align-items:center;justify-content:space-between;font-size:12.5px;height:${ROW}px">` +
      `<span style="${nmStyle}">${badge(fl.key)}${esc(fl.name)}</span>` +
      `<span style="color:#94a3b8;font-family:SFMono-Regular,Consolas,monospace;font-size:11.5px">${esc(fl.type)}</span></div>`;
  }).join('');
  return `<div class="card" style="${posStyle(geom)}padding:0;overflow:hidden">` +
    `<div style="font-weight:700;color:#0f172a;font-size:14px;letter-spacing:.02em;padding:9px 13px;border-bottom:1px solid #DCE0E6;background:#f8fafc">${esc(n.name || n.id)}</div>` +
    `<div style="padding:5px 13px 6px">${rows}</div></div>`;
}, entitySize);
