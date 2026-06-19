# Editorial Diagrams MCP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Node MCP plugin that renders editorial-style architecture diagrams (PNG/PDF/SVG) from a compact JSON spec, auto-callable from any Claude session.

**Architecture:** A stdio MCP server wraps a lifted, pure spec→HTML generator (`gen.mjs`, CSS inlined) and a Chromium renderer (`render.mjs` via `puppeteer-core`). Three tools — `render_diagram`, `validate_spec`, `describe_spec_schema` — plus a teaching Skill. Stateless: spec passed inline or by path; output written to disk and (for PNG) returned as inline image content.

**Tech Stack:** Node ≥18 (ESM), `@modelcontextprotocol/sdk`, `puppeteer-core` + `@puppeteer/browsers`, `zod`, `node:test`.

## Global Constraints

- **Runtime:** Node ≥18, ESM (`"type": "module"`). Every source file is `.mjs`. No `.sh` scripts in the runtime path (Windows compat).
- **Cross-OS:** Pure Node `path`/`os`/`fs` only. No hardcoded POSIX paths, no shelling out. macOS is tested first; Linux/Windows code paths exist from day one.
- **Statelessness:** No server-side spec state. Spec arrives inline (`spec`) or by file (`spec_path`). CSS is **inlined** into the HTML — never a `<link href="../editorial.css">`.
- **Default theme:** `editorial` (the author's `editorial.css`), copied verbatim. Custom themes are out of v1 scope.
- **Chromium:** Prefer a system Chrome/Edge executable; fall back to `@puppeteer/browsers` on-demand download. Never bundle Chromium at install (use `puppeteer-core`, not full `puppeteer`).
- **Formats:** `png` (default), `pdf`, `svg` (experimental, foreignObject). Inline image content is returned for `png` only; `pdf`/`svg` return path + metadata.
- **Determinism:** Identical input → identical output. No time/random in the render path. `applyPreset` must not mutate the caller's spec object (clone first).
- **Source files to copy verbatim** (from the sibling worktree; gitignored, may be transient — copy early in Task 2/8):
  - `editorial.css` → `src/themes/editorial.css`
  - `specs/*.json` (15 files) → `test/specs/`
  - Source dir: `/Users/arvo/SilverTiger/idp-launch/.claude/worktrees/wizardly-swirles-725b1f/docs/system/diagrams/`

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `src/.gitkeep`, `test/.gitkeep`
- Create: `test/scaffold.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: a runnable `node --test` harness; `package.json` with deps the later tasks import.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "editorial-diagrams-mcp",
  "version": "0.1.0",
  "description": "MCP server that renders editorial-style architecture diagrams from a compact JSON spec.",
  "type": "module",
  "bin": { "editorial-diagrams-mcp": "src/server.mjs" },
  "engines": { "node": ">=18" },
  "scripts": {
    "test": "node --test",
    "start": "node src/server.mjs"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@puppeteer/browsers": "^2.4.0",
    "puppeteer-core": "^23.0.0",
    "zod": "^3.23.0"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
test/golden/*.png
*.log
.DS_Store
diagrams-out/
```

- [ ] **Step 3: Create placeholder files**

Create empty `src/.gitkeep` and `test/.gitkeep`.

- [ ] **Step 4: Write the scaffold test** — `test/scaffold.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('package.json declares ESM and required deps', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  assert.equal(pkg.type, 'module');
  assert.ok(pkg.dependencies['@modelcontextprotocol/sdk']);
  assert.ok(pkg.dependencies['puppeteer-core']);
  assert.ok(pkg.dependencies['@puppeteer/browsers']);
});
```

- [ ] **Step 5: Install deps and run test**

Run: `npm install && node --test`
Expected: 1 test passes.

- [ ] **Step 6: Init git and commit**

```bash
git init
git add -A
git commit -m "chore: project scaffold (package.json, test harness)"
```

---

### Task 2: Lift the generator — `src/gen.mjs` (pure, CSS inlined)

**Files:**
- Create: `src/gen.mjs` (copy of source `gen.mjs`, then edited per steps below)
- Create: `src/themes/editorial.css` (copied verbatim from source)
- Create: `test/gen.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `build(spec, css): string` — full self-contained HTML with `<style>${css}</style>` inlined.
  - `applyPreset(spec): object` — expands a preset spec into `blocks[]` (mutates the passed object — callers must clone).
  - `parseCard(s): object` — card-DSL string → `{h, kind?, stereo?, tech?, p?}`.
  - `renderSpec(spec, css): string` — clones, applies preset, builds. The function the renderer/tools call.

- [ ] **Step 1: Copy source files**

```bash
SRC=/Users/arvo/SilverTiger/idp-launch/.claude/worktrees/wizardly-swirles-725b1f/docs/system/diagrams
mkdir -p src/themes
cp "$SRC/gen.mjs" src/gen.mjs
cp "$SRC/editorial.css" src/themes/editorial.css
```

- [ ] **Step 2: Edit `src/gen.mjs` — remove Node IO + CLI**

Delete the import block and path constants (original lines 19–25):

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const specsDir = path.join(here, 'specs');
const htmlDir = path.join(here, 'html');
```

Replace with: *(nothing — remove these lines entirely)*.

Delete the CLI loop at the end of the file (original lines 177–185):

```js
const only = process.argv[2];
const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.json') && (!only || f === only || f === only + '.json'));
if (!files.length) { console.log('no specs matched'); process.exit(0); }
for (const f of files) {
  const spec = applyPreset(JSON.parse(fs.readFileSync(path.join(specsDir, f), 'utf8')));
  const id = spec.id || f.replace(/\.json$/, '');
  fs.writeFileSync(path.join(htmlDir, id + '.html'), build(spec));
  console.log(`gen → html/${id}.html`);
}
```

Replace with: *(nothing — remove these lines entirely)*.

- [ ] **Step 3: Edit `build()` to take and inline CSS**

Find this line inside `build(spec)`:

```js
function build(spec) {
  let h = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../editorial.css"></head><body>\n<div class="diagram">`;
```

Replace with:

```js
function build(spec, css) {
  let h = `<!doctype html><html><head><meta charset="utf-8"><style>\n${css}\n</style></head><body>\n<div class="diagram">`;
```

- [ ] **Step 4: Add exports + a non-mutating convenience entry**

Change `function parseCard(c)` → `export function parseCard(c)`.
Change `function build(spec, css)` → `export function build(spec, css)`.
Change `function applyPreset(spec)` → `export function applyPreset(spec)`.

Append to the end of the file:

```js
// Non-mutating entry point used by the renderer and MCP tools.
// applyPreset mutates its argument, so clone first for determinism + caller safety.
export function renderSpec(spec, css) {
  return build(applyPreset(structuredClone(spec)), css);
}
```

- [ ] **Step 5: Create `src/themes/index.mjs`** (CSS loader)

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const editorialPath = fileURLToPath(new URL('./editorial.css', import.meta.url));

export function loadThemeCss(theme = 'editorial') {
  if (theme !== 'editorial') throw new Error(`unknown theme: ${theme} (only 'editorial' in v1)`);
  return readFileSync(editorialPath, 'utf8');
}
```

- [ ] **Step 6: Write the failing test** — `test/gen.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build, applyPreset, parseCard, renderSpec } from '../src/gen.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';

const css = loadThemeCss();
const arch = JSON.parse(readFileSync(new URL('./specs/40-arch-api.json', import.meta.url)));
const dyn = JSON.parse(readFileSync(new URL('./specs/30-dyn-login-mfa.json', import.meta.url)));

test('parseCard splits kind / stereotype / tech / detail', () => {
  const c = parseCard('ds:MongoDB | [datastore] | identity');
  assert.equal(c.kind, 'ds');
  assert.equal(c.h, 'MongoDB');
  assert.equal(c.tech, '[datastore]');
  assert.equal(c.p, 'identity');
  assert.equal(parseCard('+Account Service').stereo, 1);
});

test('build inlines CSS and emits the diagram shell', () => {
  const html = build({ eyebrow: 'E', title: 'T', blocks: [] }, css);
  assert.match(html, /<style>/);
  assert.ok(!html.includes('editorial.css'), 'must not link external CSS');
  assert.match(html, /class="diagram"/);
  assert.match(html, /class="title">T</);
});

test('renderSpec expands a c4-l3 preset (boundary + downstream)', () => {
  const html = renderSpec(arch, css);
  assert.match(html, /class="boundary"/);
  assert.match(html, /api-&lt;service&gt;|api-/);
  assert.match(html, /class="card/);
});

test('renderSpec expands a dynamic preset into numbered steps', () => {
  const html = renderSpec(dyn, css);
  assert.match(html, /class="steps"/);
  assert.match(html, /class="step/);
});

test('renderSpec does not mutate the caller spec', () => {
  const before = JSON.stringify(arch);
  renderSpec(arch, css);
  assert.equal(JSON.stringify(arch), before, 'spec must be cloned, not mutated');
});

test('build is deterministic for identical input', () => {
  assert.equal(renderSpec(dyn, css), renderSpec(dyn, css));
});
```

- [ ] **Step 7: Copy the golden specs the tests read**

```bash
SRC=/Users/arvo/SilverTiger/idp-launch/.claude/worktrees/wizardly-swirles-725b1f/docs/system/diagrams
mkdir -p test/specs
cp "$SRC"/specs/*.json test/specs/
```

- [ ] **Step 8: Run tests**

Run: `node --test test/gen.test.mjs`
Expected: all gen tests PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(gen): lift generator to pure module with inlined CSS"
```

---

### Task 3: Browser resolver — `src/browser.mjs`

**Files:**
- Create: `src/browser.mjs`
- Create: `test/browser.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `detectSystemChrome(platform, exists): string | null` — pure; maps OS → first existing Chrome/Edge path. `platform` is `process.platform`, `exists` is a `(path)=>boolean` predicate (injected for testability).
  - `resolveExecutablePath(): Promise<string>` — env `PUPPETEER_EXECUTABLE_PATH` → `detectSystemChrome` → `@puppeteer/browsers` download. Throws a clear error if all fail.
  - `getBrowser(): Promise<Browser>` — cached singleton puppeteer-core Browser.
  - `closeBrowser(): Promise<void>`.

- [ ] **Step 1: Write the failing test** — `test/browser.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectSystemChrome } from '../src/browser.mjs';

test('detectSystemChrome finds macOS Chrome when present', () => {
  const mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const p = detectSystemChrome('darwin', (x) => x === mac);
  assert.equal(p, mac);
});

test('detectSystemChrome finds Linux chromium when present', () => {
  const p = detectSystemChrome('linux', (x) => x === '/usr/bin/chromium');
  assert.equal(p, '/usr/bin/chromium');
});

test('detectSystemChrome finds Windows Chrome when present', () => {
  const win = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const p = detectSystemChrome('win32', (x) => x === win);
  assert.equal(p, win);
});

test('detectSystemChrome returns null when nothing exists', () => {
  assert.equal(detectSystemChrome('darwin', () => false), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/browser.test.mjs`
Expected: FAIL — cannot import `detectSystemChrome`.

- [ ] **Step 3: Implement `src/browser.mjs`**

```js
import { existsSync } from 'node:fs';
import { launch as pcLaunch } from 'puppeteer-core';
import { install, computeExecutablePath, resolveBuildId, detectBrowserPlatform, Browser as PBrowser } from '@puppeteer/browsers';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CANDIDATES = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
};

// Pure, testable: first candidate path that `exists` reports true for, else null.
export function detectSystemChrome(platform, exists = existsSync) {
  for (const p of (CANDIDATES[platform] || [])) if (exists(p)) return p;
  return null;
}

const cacheDir = join(homedir(), '.cache', 'editorial-diagrams-mcp', 'browsers');

async function downloadChromium() {
  const platform = detectBrowserPlatform();
  const buildId = await resolveBuildId(PBrowser.CHROME, platform, 'stable');
  await install({ browser: PBrowser.CHROME, buildId, cacheDir });
  return computeExecutablePath({ browser: PBrowser.CHROME, buildId, cacheDir });
}

export async function resolveExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const sys = detectSystemChrome(process.platform);
  if (sys) return sys;
  return downloadChromium();
}

let _browser = null;
export async function getBrowser() {
  if (_browser && _browser.connected) return _browser;
  const executablePath = await resolveExecutablePath();
  _browser = await pcLaunch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  return _browser;
}

export async function closeBrowser() {
  if (_browser) { await _browser.close(); _browser = null; }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/browser.test.mjs`
Expected: 4 tests PASS. (`getBrowser` is exercised in Task 4.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(browser): cross-OS Chrome resolver with download fallback"
```

---

### Task 4: Renderer — `src/render.mjs`

**Files:**
- Create: `src/render.mjs`
- Create: `test/render.test.mjs`

**Interfaces:**
- Consumes: `getBrowser` from `src/browser.mjs`; `renderSpec`/`loadThemeCss` indirectly (tests pass HTML directly).
- Produces:
  - `renderHtml(html, opts): Promise<{ buffer: Buffer, mimeType: string, ext: string, width: number, height: number }>` where `opts = { format='png', scale=2, width=1320, transparent=false, css? }`. For `svg`, `css` (theme CSS) is required to inline inside the foreignObject.

- [ ] **Step 1: Write the failing test** — `test/render.test.mjs`

```js
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderSpec } from '../src/gen.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';
import { renderHtml } from '../src/render.mjs';
import { closeBrowser } from '../src/browser.mjs';

const css = loadThemeCss();
const spec = JSON.parse(readFileSync(new URL('./specs/40-arch-api.json', import.meta.url)));
const html = renderSpec(spec, css);

after(() => closeBrowser());

test('renders PNG with a valid signature', async () => {
  const { buffer, mimeType, width, height } = await renderHtml(html, { format: 'png', scale: 1 });
  assert.equal(mimeType, 'image/png');
  assert.deepEqual([...buffer.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]); // \x89PNG
  assert.ok(width > 0 && height > 0);
});

test('renders PDF with a %PDF header', async () => {
  const { buffer, mimeType } = await renderHtml(html, { format: 'pdf' });
  assert.equal(mimeType, 'application/pdf');
  assert.equal(buffer.subarray(0, 5).toString('latin1'), '%PDF-');
});

test('renders SVG containing a foreignObject', async () => {
  const { buffer, mimeType } = await renderHtml(html, { format: 'svg', css });
  assert.equal(mimeType, 'image/svg+xml');
  const s = buffer.toString('utf8');
  assert.match(s, /<svg[\s>]/);
  assert.match(s, /<foreignObject/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/render.test.mjs`
Expected: FAIL — cannot import `renderHtml`.

- [ ] **Step 3: Implement `src/render.mjs`**

```js
import { getBrowser } from './browser.mjs';

async function withPage(html, fn) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1320, height: 1200, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    return await fn(page);
  } finally {
    await page.close();
  }
}

export async function renderHtml(html, opts = {}) {
  const { format = 'png', scale = 2, width = 1320, transparent = false, css = '' } = opts;

  if (format === 'pdf') {
    return withPage(html, async (page) => {
      const el = await page.$('.diagram');
      const box = await el.boundingBox();
      const buffer = await page.pdf({
        printBackground: true,
        width: `${Math.ceil(box.width)}px`,
        height: `${Math.ceil(box.height)}px`,
        pageRanges: '1',
      });
      return { buffer, mimeType: 'application/pdf', ext: 'pdf', width: Math.ceil(box.width), height: Math.ceil(box.height) };
    });
  }

  if (format === 'svg') {
    return withPage(html, async (page) => {
      const { outerHTML, w, h } = await page.evaluate(() => {
        const el = document.querySelector('.diagram');
        const r = el.getBoundingClientRect();
        return { outerHTML: el.outerHTML, w: Math.ceil(r.width), h: Math.ceil(r.height) };
      });
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
        `<foreignObject width="${w}" height="${h}">` +
        `<div xmlns="http://www.w3.org/1999/xhtml"><style>${css}</style>${outerHTML}</div>` +
        `</foreignObject></svg>`;
      return { buffer: Buffer.from(svg, 'utf8'), mimeType: 'image/svg+xml', ext: 'svg', width: w, height: h };
    });
  }

  // png (default)
  return withPage(html, async (page) => {
    await page.setViewport({ width, height: 1200, deviceScaleFactor: Math.max(1, Math.min(3, scale)) });
    await page.setContent(html, { waitUntil: 'load' });
    const el = await page.$('.diagram');
    const box = await el.boundingBox();
    const buffer = await el.screenshot({ type: 'png', omitBackground: transparent });
    return { buffer, mimeType: 'image/png', ext: 'png', width: Math.ceil(box.width), height: Math.ceil(box.height) };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/render.test.mjs`
Expected: 3 tests PASS. (Requires a resolvable Chrome; on a machine with Chrome installed this runs without download.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(render): HTML->PNG/PDF/SVG via puppeteer-core"
```

---

### Task 5: Spec schema + `validate_spec` — `src/validate.mjs`

**Files:**
- Create: `src/schema/spec.schema.json`
- Create: `src/validate.mjs`
- Create: `test/validate.test.mjs`

**Interfaces:**
- Consumes: `parseCard` from `src/gen.mjs`.
- Produces: `validateSpec(spec): { valid: boolean, errors: string[] }` — structural + DSL checks. Errors are human-readable and point at the offending field.

- [ ] **Step 1: Create `src/schema/spec.schema.json`** (minimal, hand-checked subset)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Editorial diagram spec",
  "type": "object",
  "required": ["title"],
  "properties": {
    "preset": { "enum": ["c4-l3", "c4-l2", "dynamic"] },
    "id": { "type": "string" },
    "eyebrow": { "type": "string" },
    "title": { "type": "string" },
    "subtitle": { "type": "string" },
    "caption": { "type": "string" },
    "blocks": { "type": "array" },
    "callers": { "type": "array" },
    "layers": { "type": "array" },
    "downstream": {},
    "steps": { "type": "array" },
    "rels": { "type": "array" },
    "refs": { "type": "string" }
  }
}
```

- [ ] **Step 2: Write the failing test** — `test/validate.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateSpec } from '../src/validate.mjs';

const arch = JSON.parse(readFileSync(new URL('./specs/40-arch-api.json', import.meta.url)));

test('a real golden spec is valid', () => {
  const r = validateSpec(arch);
  assert.equal(r.valid, true, r.errors.join('; '));
});

test('missing title is rejected', () => {
  const r = validateSpec({ preset: 'c4-l3' });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => /title/.test(e)));
});

test('unknown preset is rejected with a clear message', () => {
  const r = validateSpec({ title: 'X', preset: 'c4-l9' });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => /preset/.test(e)));
});

test('dynamic preset requires steps', () => {
  const r = validateSpec({ title: 'X', preset: 'dynamic' });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => /steps/.test(e)));
});

test('a step missing "from" is rejected', () => {
  const r = validateSpec({ title: 'X', preset: 'dynamic', steps: [{ to: 'B' }] });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => /from/.test(e)));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test test/validate.test.mjs`
Expected: FAIL — cannot import `validateSpec`.

- [ ] **Step 4: Implement `src/validate.mjs`**

```js
const PRESETS = ['c4-l3', 'c4-l2', 'dynamic'];

export function validateSpec(spec) {
  const errors = [];
  if (spec == null || typeof spec !== 'object' || Array.isArray(spec)) {
    return { valid: false, errors: ['spec must be a JSON object'] };
  }
  if (typeof spec.title !== 'string' || !spec.title.trim()) {
    errors.push('`title` is required and must be a non-empty string');
  }
  if (spec.preset !== undefined && !PRESETS.includes(spec.preset)) {
    errors.push(`\`preset\` must be one of ${PRESETS.join(', ')} (got "${spec.preset}")`);
  }
  if (spec.preset === 'dynamic') {
    if (!Array.isArray(spec.steps) || spec.steps.length === 0) {
      errors.push('`dynamic` preset requires a non-empty `steps` array');
    } else {
      spec.steps.forEach((s, i) => {
        if (!s || typeof s.from !== 'string' || !s.from.trim()) {
          errors.push(`steps[${i}] is missing a \`from\` actor`);
        }
      });
    }
  }
  if ((spec.preset === 'c4-l3' || spec.preset === 'c4-l2') && !spec.boundary && !spec.blocks) {
    errors.push('`c4-l3`/`c4-l2` preset expects a `boundary` (or pre-expanded `blocks`)');
  }
  if (spec.blocks !== undefined && !Array.isArray(spec.blocks)) {
    errors.push('`blocks` must be an array when present');
  }
  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test test/validate.test.mjs`
Expected: 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(validate): structural + DSL validation for specs"
```

---

### Task 6: `describe_spec_schema` — `src/describe.mjs`

**Files:**
- Create: `src/describe.mjs`
- Create: `test/describe.test.mjs`

**Interfaces:**
- Consumes: `src/schema/spec.schema.json`.
- Produces: `describeSpecSchema(topic): { schema, cheatsheet, blockTypes, cardDSL, presets, partials }`. `topic` is optional; when given (`'cards'|'blocks'|'presets'`), the cheatsheet narrows to that section.

- [ ] **Step 1: Write the failing test** — `test/describe.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeSpecSchema } from '../src/describe.mjs';

test('returns schema + DSL reference', () => {
  const d = describeSpecSchema();
  assert.ok(d.schema && d.schema.properties.title);
  assert.match(d.cardDSL, /kind:/);
  assert.ok(Array.isArray(d.blockTypes) && d.blockTypes.length >= 5);
  assert.ok(d.presets.includes('c4-l3'));
});

test('topic narrows the cheatsheet', () => {
  const d = describeSpecSchema('cards');
  assert.match(d.cheatsheet, /card/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/describe.test.mjs`
Expected: FAIL — cannot import `describeSpecSchema`.

- [ ] **Step 3: Implement `src/describe.mjs`**

```js
import { readFileSync } from 'node:fs';

const schema = JSON.parse(readFileSync(new URL('./schema/spec.schema.json', import.meta.url)));

const blockTypes = [
  '{cards:[...], label?, ctx?, cols?, conn?} — labelled grid of cards',
  '{flow:[card|{arrow}], label?, conn?} — horizontal pipeline',
  '{boundary:"label", blocks:[...], core?, conn?} — dashed container boundary',
  '{steps:[{from,to?,proto?,detail?,done?}]} — numbered Dynamic sequence',
  '{conn:"label"} — standalone vertical connector',
  '{rels?, note?, refs?, relsTitle?} — footer band',
  '{caption:"..."} — bottom caption',
];

const cardDSL =
  'Card DSL: "[kind:][+]Name | [tech] | detail"\n' +
  '  kind ∈ person|ext|ds|jewel|sec|muted   (prefix, e.g. "ds:MongoDB")\n' +
  '  +Name  → ‹component› stereotype\n' +
  '  [tech] or ‹marker› segment → technology tag; remaining segments → detail line\n' +
  'Examples: "+Account Service | users · credentials" · "ds:MongoDB | [datastore] | identity"';

const presets = ['c4-l3', 'c4-l2', 'dynamic'];

const partials =
  '@stores → MongoDB/KeyDB/Kafka datastore row · @core → shared Core boundary (idp-specific helpers)';

const sections = {
  cards: cardDSL,
  blocks: blockTypes.join('\n'),
  presets: `presets: ${presets.join(', ')}\npartials: ${partials}`,
};

export function describeSpecSchema(topic) {
  const cheatsheet = topic && sections[topic]
    ? sections[topic]
    : [cardDSL, '', 'Blocks:', blockTypes.join('\n'), '', `Presets: ${presets.join(', ')}`, `Partials: ${partials}`].join('\n');
  return { schema, cheatsheet, blockTypes, cardDSL, presets, partials };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/describe.test.mjs`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(describe): schema + DSL cheat-sheet tool"
```

---

### Task 7: Tool layer — `src/tools.mjs`

**Files:**
- Create: `src/tools.mjs`
- Create: `test/tools.test.mjs`

**Interfaces:**
- Consumes: `renderSpec`, `loadThemeCss`, `renderHtml`, `validateSpec`, `describeSpecSchema`.
- Produces (each returns an MCP-shaped `{ content: [...], isError? }`):
  - `renderDiagram(args): Promise<result>` — `args = { spec?, spec_path?, format?, scale?, width?, out_path?, return_image?, transparent? }`. Loads spec (inline or file), validates, renders, writes file. PNG → inline image content + text metadata; PDF/SVG → text metadata only.
  - `validateSpecTool(args)` — `{ spec }` → text content `{valid, errors}`.
  - `describeSchemaTool(args)` — `{ topic? }` → text content of the cheatsheet + schema JSON.

- [ ] **Step 1: Write the failing test** — `test/tools.test.mjs`

```js
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderDiagram, validateSpecTool, describeSchemaTool } from '../src/tools.mjs';
import { closeBrowser } from '../src/browser.mjs';

const arch = JSON.parse(readFileSync(new URL('./specs/40-arch-api.json', import.meta.url)));
const out = join(tmpdir(), 'edm-test-out.png');

after(() => { closeBrowser(); if (existsSync(out)) rmSync(out); });

test('renderDiagram writes a PNG file and returns inline image', async () => {
  const res = await renderDiagram({ spec: arch, format: 'png', scale: 1, out_path: out, return_image: true });
  assert.ok(!res.isError, JSON.stringify(res));
  assert.ok(existsSync(out), 'file written');
  assert.ok(res.content.some((c) => c.type === 'image' && c.mimeType === 'image/png'));
});

test('renderDiagram with return_image:false omits the image block', async () => {
  const res = await renderDiagram({ spec: arch, format: 'png', scale: 1, out_path: out, return_image: false });
  assert.ok(!res.content.some((c) => c.type === 'image'));
  assert.ok(res.content.some((c) => c.type === 'text' && /png/.test(c.text)));
});

test('renderDiagram rejects an invalid spec without rendering', async () => {
  const res = await renderDiagram({ spec: { preset: 'c4-l3' } });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /title/);
});

test('validateSpecTool reports validity', () => {
  const res = validateSpecTool({ spec: arch });
  assert.match(res.content[0].text, /"valid": ?true/);
});

test('describeSchemaTool returns the cheatsheet', () => {
  const res = describeSchemaTool({});
  assert.match(res.content[0].text, /Card DSL/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/tools.test.mjs`
Expected: FAIL — cannot import from `src/tools.mjs`.

- [ ] **Step 3: Implement `src/tools.mjs`**

```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { renderSpec } from './gen.mjs';
import { loadThemeCss } from './themes/index.mjs';
import { renderHtml } from './render.mjs';
import { validateSpec } from './validate.mjs';
import { describeSpecSchema } from './describe.mjs';

const text = (t) => ({ type: 'text', text: t });
const errorResult = (msg) => ({ isError: true, content: [text(msg)] });

const DEFAULT_OUT_DIR = join(process.cwd(), 'diagrams-out');

function loadSpec(args) {
  if (args.spec && args.spec_path) throw new Error('pass `spec` or `spec_path`, not both');
  if (args.spec) return args.spec;
  if (args.spec_path) return JSON.parse(readFileSync(resolve(args.spec_path), 'utf8'));
  throw new Error('one of `spec` or `spec_path` is required');
}

function outPathFor(args, ext) {
  if (args.out_path) return resolve(args.out_path);
  const id = (args.spec && args.spec.id) || 'diagram';
  return join(DEFAULT_OUT_DIR, `${id}.${ext}`);
}

export async function renderDiagram(args = {}) {
  let spec;
  try { spec = loadSpec(args); } catch (e) { return errorResult(e.message); }

  const v = validateSpec(spec);
  if (!v.valid) return errorResult(`Invalid spec — not rendered:\n• ${v.errors.join('\n• ')}`);

  const format = args.format || 'png';
  if (!['png', 'pdf', 'svg'].includes(format)) return errorResult(`unknown format "${format}" (png|pdf|svg)`);

  const css = loadThemeCss('editorial');
  let rendered;
  try {
    const html = renderSpec(spec, css);
    rendered = await renderHtml(html, {
      format,
      scale: args.scale ?? 2,
      width: args.width ?? 1320,
      transparent: !!args.transparent,
      css,
    });
  } catch (e) {
    return errorResult(`render failed: ${e.message}`);
  }

  const outPath = outPathFor(args, rendered.ext);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, rendered.buffer);

  const meta = `Rendered ${format.toUpperCase()} ${rendered.width}×${rendered.height}px (${rendered.buffer.length} bytes) → ${outPath}`;
  const content = [text(meta)];
  const wantImage = args.return_image !== false;
  if (wantImage && format === 'png') {
    content.push({ type: 'image', data: rendered.buffer.toString('base64'), mimeType: 'image/png' });
  } else if (wantImage && format !== 'png') {
    content.push(text(`(inline image is only returned for PNG; ${format} written to disk above)`));
  }
  return { content };
}

export function validateSpecTool(args = {}) {
  const r = validateSpec(args.spec);
  return { content: [text(JSON.stringify(r, null, 2))] };
}

export function describeSchemaTool(args = {}) {
  const d = describeSpecSchema(args.topic);
  return { content: [text(d.cheatsheet + '\n\n--- JSON Schema ---\n' + JSON.stringify(d.schema, null, 2))] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/tools.test.mjs`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(tools): render_diagram/validate_spec/describe_spec_schema impls"
```

---

### Task 8: MCP server wiring — `src/server.mjs`

**Files:**
- Create: `src/server.mjs`
- Create: `test/server.test.mjs`

**Interfaces:**
- Consumes: `renderDiagram`, `validateSpecTool`, `describeSchemaTool` from `src/tools.mjs`; `@modelcontextprotocol/sdk`; `zod`.
- Produces: an executable stdio MCP server registering the three tools. `src/server.mjs` is the plugin entrypoint (`bin`).

- [ ] **Step 1: Write the failing test** — `test/server.test.mjs` (verifies registration wiring without a full transport round-trip)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../src/server.mjs';

test('buildServer registers the three tools', () => {
  const names = [];
  const fakeServer = { registerTool: (n) => names.push(n) };
  buildServer(fakeServer);
  assert.deepEqual(names.sort(), ['describe_spec_schema', 'render_diagram', 'validate_spec']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/server.test.mjs`
Expected: FAIL — cannot import `buildServer`.

- [ ] **Step 3: Implement `src/server.mjs`**

```js
#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { renderDiagram, validateSpecTool, describeSchemaTool } from './tools.mjs';

const specSchema = z.record(z.any());

// Registers tools on any object exposing registerTool(name, def, handler).
// Exported so tests can assert wiring without a live transport.
export function buildServer(server) {
  server.registerTool(
    'render_diagram',
    {
      title: 'Render editorial diagram',
      description:
        'Render an editorial-style architecture diagram from a compact JSON spec. ' +
        'Writes the file to disk and (for PNG) returns the image inline. ' +
        'Pass `spec` inline or `spec_path` to a .json file. Call describe_spec_schema for the DSL.',
      inputSchema: {
        spec: specSchema.optional(),
        spec_path: z.string().optional(),
        format: z.enum(['png', 'pdf', 'svg']).optional(),
        scale: z.number().min(1).max(3).optional(),
        width: z.number().min(320).max(4000).optional(),
        out_path: z.string().optional(),
        transparent: z.boolean().optional(),
        return_image: z.boolean().optional(),
      },
    },
    (args) => renderDiagram(args),
  );

  server.registerTool(
    'validate_spec',
    {
      title: 'Validate diagram spec',
      description: 'Cheap structural + DSL validation of a diagram spec. Use before render_diagram to avoid wasted renders.',
      inputSchema: { spec: specSchema },
    },
    (args) => validateSpecTool(args),
  );

  server.registerTool(
    'describe_spec_schema',
    {
      title: 'Describe diagram spec schema',
      description: 'Return the JSON schema + DSL cheat-sheet (block types, card DSL, presets, partials).',
      inputSchema: { topic: z.enum(['cards', 'blocks', 'presets']).optional() },
    },
    (args) => describeSchemaTool(args),
  );

  return server;
}

async function main() {
  const server = new McpServer({ name: 'editorial-diagrams', version: '0.1.0' });
  buildServer(server);
  await server.connect(new StdioServerTransport());
}

// Run only when invoked directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/server.test.mjs`
Expected: 1 test PASS.

- [ ] **Step 5: Full suite + manual stdio smoke**

Run: `node --test`
Expected: all tests PASS.

Manual smoke (optional, confirms the process starts and lists tools):
```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node src/server.mjs
```
Expected: a JSON-RPC response listing `render_diagram`, `validate_spec`, `describe_spec_schema`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(server): stdio MCP server wiring three tools"
```

---

### Task 9: Plugin packaging + teaching Skill

**Files:**
- Create: `.mcp.json`
- Create: `.claude-plugin/plugin.json`
- Create: `skills/editorial-diagrams/SKILL.md`
- Create: `README.md`

**Interfaces:**
- Consumes: `src/server.mjs` entrypoint.
- Produces: a locally-installable Claude Code plugin (MCP server + skill).

- [ ] **Step 1: Create `.mcp.json`** (server registration; absolute path filled at install)

```json
{
  "mcpServers": {
    "editorial-diagrams": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/src/server.mjs"]
    }
  }
}
```

- [ ] **Step 2: Create `.claude-plugin/plugin.json`**

```json
{
  "name": "editorial-diagrams",
  "version": "0.1.0",
  "description": "Render editorial-style architecture diagrams (PNG/PDF/SVG) from a compact JSON spec via MCP.",
  "mcpServers": ".mcp.json"
}
```

- [ ] **Step 3: Create `skills/editorial-diagrams/SKILL.md`**

```markdown
---
name: editorial-diagrams
description: Use when the user asks to create, render, or update an architecture/C4/flow diagram as an image (PNG/PDF/SVG). Authors a compact JSON spec and renders it via the editorial-diagrams MCP tools.
---

# Editorial Diagrams

Render editorial-style architecture diagrams from a compact JSON spec via the
`editorial-diagrams` MCP server. The spec is far terser than hand-written HTML —
that is the point (token savings + consistent style by code).

## When to use
- The user wants an architecture diagram, C4 view (L1–L3), runtime/Dynamic flow,
  matrix, or pipeline rendered as an image.

## Workflow (token-efficient)
1. Call `describe_spec_schema` once if unsure of the DSL.
2. **Write the spec to a `.json` file** (e.g. `my-diagram.json`). For iterations,
   `Edit` a few lines of that file rather than re-sending the whole spec.
3. Call `validate_spec` (cheap) until `valid: true`.
4. Call `render_diagram` with `spec_path: "my-diagram.json"` (or inline `spec`).
   - `format`: `png` (default) · `pdf` (true vector) · `svg` (experimental).
   - `scale` 1–3, `width`, `out_path`, `transparent`, `return_image`.
   - PNG returns an inline image you can inspect and self-correct from.
5. To embed in a document, reference the written file path.

## Spec shape
- Header: `id`, `eyebrow`, `title`, `subtitle?`, `caption?`.
- `preset`: `c4-l3` | `c4-l2` | `dynamic` (expands into canonical blocks), or
  hand-author `blocks: [...]`.
- Card DSL: `"[kind:][+]Name | [tech] | detail"`, kind ∈ person|ext|ds|jewel|sec|muted.
- Block types: cards grid · flow · boundary · steps · conn · footer (rels/refs/note) · caption.

## Style rules (keep diagrams legible)
- One boundary per L3 view. If a diagram has many components, **split it** into
  several focused specs (per-container L3 + one L2 overview) rather than one
  mega-diagram — cheaper to iterate and easier to read.
- Diagram language = document language.
```

- [ ] **Step 4: Create `README.md`**

```markdown
# editorial-diagrams-mcp

MCP server that renders editorial-style architecture diagrams (PNG/PDF/SVG) from
a compact JSON spec. Reuses the spec-driven generator + `editorial.css`.

## Install (local path)
1. `npm install` in this directory.
2. Add as a Claude Code plugin from this local path, or register the MCP server
   manually:
   ```json
   { "mcpServers": { "editorial-diagrams": { "command": "node", "args": ["/abs/path/src/server.mjs"] } } }
   ```

## Tools
- `render_diagram` — spec → file on disk (+ inline PNG). `spec` or `spec_path`;
  `format`/`scale`/`width`/`out_path`/`transparent`/`return_image`.
- `validate_spec` — cheap structural + DSL check.
- `describe_spec_schema` — schema + DSL cheat-sheet.

## Chromium
Prefers a system Chrome/Edge; otherwise downloads Chromium on first run to
`~/.cache/editorial-diagrams-mcp/`. Override with `PUPPETEER_EXECUTABLE_PATH`.

## Test
`node --test` (render tests need a resolvable Chrome).
```

- [ ] **Step 5: Verify the plugin entry path resolves**

Run: `node src/server.mjs < /dev/null` (then Ctrl-C) — confirms the entrypoint starts without error on this OS.
Expected: process starts, waits on stdin, no import/throw.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(plugin): .mcp.json, plugin manifest, teaching skill, README"
```

---

### Task 10: Golden smoke across all specs + CI matrix

**Files:**
- Create: `test/golden.test.mjs`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: every spec in `test/specs/`; `renderSpec`, `renderHtml`.
- Produces: a smoke test asserting all 15 specs render to non-empty PNGs; a CI workflow (macOS active, Linux/Windows wired).

- [ ] **Step 1: Write the smoke test** — `test/golden.test.mjs`

```js
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { renderSpec } from '../src/gen.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';
import { renderHtml } from '../src/render.mjs';
import { closeBrowser } from '../src/browser.mjs';

const css = loadThemeCss();
const dir = new URL('./specs/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

after(() => closeBrowser());

test(`renders all ${files.length} golden specs to non-empty PNGs`, async () => {
  assert.ok(files.length >= 15, `expected >=15 specs, found ${files.length}`);
  for (const f of files) {
    const spec = JSON.parse(readFileSync(new URL(f, dir)));
    const html = renderSpec(spec, css);
    const { buffer, width, height } = await renderHtml(html, { format: 'png', scale: 1 });
    assert.deepEqual([...buffer.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], `${f} is not a PNG`);
    assert.ok(buffer.length > 1000, `${f} PNG suspiciously small`);
    assert.ok(width > 0 && height > 0, `${f} has zero dimensions`);
  }
});
```

- [ ] **Step 2: Run the smoke test**

Run: `node --test test/golden.test.mjs`
Expected: PASS — all specs render.

- [ ] **Step 3: Create `.github/workflows/ci.yml`**

```yaml
name: ci
on: [push, pull_request]
jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        os: [macos-latest]   # linux/windows wired below — enable when ready
        # os: [macos-latest, ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install
      - run: node --test
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(golden): smoke render all specs; wire CI matrix (macOS active)"
```

---

## Self-Review

**Spec coverage:**
- render_diagram (png/pdf/svg, scale/width/out_path/return_image, spec/spec_path) → Tasks 4, 7, 8 ✓
- validate_spec → Tasks 5, 7, 8 ✓
- describe_spec_schema → Tasks 6, 7, 8 ✓
- Skill teaching DSL → Task 9 ✓
- Default editorial theme, CSS inlined → Task 2 ✓
- Stateless (spec inline/path, no spec dirs) → Tasks 2, 7 ✓
- Node + puppeteer-core, system-Chrome-first + download fallback → Task 3 ✓
- Cross-OS (pure Node, .mjs, OS-aware resolver, CI matrix) → Tasks 3, 10 ✓
- Determinism (clone in renderSpec) → Task 2 (test) ✓
- Golden smoke over 15 specs → Task 10 ✓
- Actionable errors (which field) → Tasks 5, 7 ✓
- Local-path install + plugin packaging → Task 9 ✓
- Open items (out_path default, SVG-in-v1) → resolved: `diagrams-out/<id>.<ext>` default (Task 7); SVG included as experimental (Tasks 4, 7).

**Placeholder scan:** none — every code/test step contains complete code; copy steps name exact source paths.

**Type consistency:** `renderSpec(spec, css)`, `renderHtml(html, opts)→{buffer,mimeType,ext,width,height}`, `validateSpec(spec)→{valid,errors}`, `describeSpecSchema(topic)→{schema,cheatsheet,...}`, tool fns →`{content,isError?}`, `buildServer(server)` — names used consistently across Tasks 2–10.

**Note for executor:** the source worktree (`wizardly-swirles-725b1f`) is gitignored and may be transient — run the `cp` steps in Tasks 2 & (specs) early; if the path is gone, locate `editorial.css` + `specs/*.json` in whichever worktree currently holds `docs/system/diagrams/`.
