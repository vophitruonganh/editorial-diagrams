// Editorial chrome: the header (eyebrow/title/subtitle/rule) + caption wrapper
// shared by every engine. Body HTML is injected between the rule and the caption.
// Byte-compatible with the original gen.build() output so flow-engine goldens hold.
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function renderChrome({ eyebrow, title, subtitle, caption }, bodyHTML, css, opts = {}) {
  // Engines pass an explicit content width. `.diagram` is locked to 1200px in the
  // stylesheet (flow-engine goldens depend on it), so an inline max-width can only
  // ever shrink it — content wider than 1200px would overflow the element box and get
  // clipped at screenshot time. An inline `width` overrides the stylesheet width and
  // lets the canvas grow to fit. Flow engine passes no maxw, so its 1200px is untouched.
  const maxw = opts.maxw ? ` style="width:${opts.maxw}px;max-width:none"` : '';
  let h = `<!doctype html><html><head><meta charset="utf-8"><style>\n${css}\n</style></head><body>\n<div class="diagram"${maxw}>`;
  h += `\n  <div class="eyebrow">${esc(eyebrow)}</div>`;
  h += `\n  <div class="title">${esc(title)}</div>`;
  if (subtitle) h += `\n  <div class="subtitle">${subtitle}</div>`;
  h += `\n  <div class="rule"></div>`;
  h += bodyHTML;
  if (caption) h += `\n  <div class="caption">${esc(caption)}</div>`;
  h += `\n</div>\n</body></html>\n`;
  return h;
}
