import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const editorialPath = fileURLToPath(new URL('./editorial.css', import.meta.url));

export function loadThemeCss(theme = 'editorial') {
  if (theme !== 'editorial') throw new Error(`unknown theme: ${theme} (only 'editorial' in v1)`);
  return readFileSync(editorialPath, 'utf8');
}
