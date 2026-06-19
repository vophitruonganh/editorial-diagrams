// Editorial chrome: the header (eyebrow/title/subtitle/rule) + caption wrapper
// shared by every engine. Body HTML is injected between the rule and the caption.
// Byte-compatible with the original gen.build() output so flow-engine goldens hold.
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function renderChrome({ eyebrow, title, subtitle, caption }, bodyHTML, css, opts = {}) {
  const maxw = opts.maxw ? ` style="max-width:${opts.maxw}px"` : '';
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
