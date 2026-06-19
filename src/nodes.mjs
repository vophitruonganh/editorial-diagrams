// Editorial node renderers — each returns absolutely-positioned HTML for a node
// placed at geometry {w,h,left,top}. Reuses the card DSL + editorial.css so nodes
// look identical to flow-engine cards. New node kinds (diamond, entity-table,
// class-box, fork/join, start/end, commit-dot) are added here in later phases.
import { parseCard } from './gen.mjs';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const posStyle = ({ w, h, left, top }, extra = '') =>
  `position:absolute;left:${Math.round(left)}px;top:${Math.round(top)}px;width:${w}px;height:${h}px;box-sizing:border-box;margin:0;${extra}`;

// Editorial card node (the default). `dsl` uses the card DSL: "[kind:][+]Name | [tech] | detail".
export function cardNode(dsl, geom) {
  const c = parseCard(dsl);
  const cls = ['card', c.kind].filter(Boolean).join(' ');
  const stereo = c.stereo ? `<span class="stereo">‹component›</span>` : '';
  const tech = c.tech ? `<span class="c4tech">${esc(c.tech)}</span>` : '';
  const p = c.p ? `<p>${esc(c.p)}</p>` : '';
  const style = posStyle(geom, 'display:flex;flex-direction:column;justify-content:center');
  return `<div class="${cls}" style="${style}">${stereo}<h4>${esc(c.h)}</h4>${tech}${p}</div>`;
}

// Extensible node-kind dispatch. Later phases register diamond/entity-table/etc.
const RENDERERS = { card: (n, geom) => cardNode(n.card ?? n.label ?? '', geom) };
export function registerNode(kind, fn) { RENDERERS[kind] = fn; }
export function renderNode(node, geom) { return (RENDERERS[node.kind] || RENDERERS.card)(node, geom); }
export function hasNodeKind(kind) { return Boolean(RENDERERS[kind]); }

export { esc, posStyle };
