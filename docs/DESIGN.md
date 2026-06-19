# Editorial Diagrams MCP — Design Spec

**Date:** 2026-06-19
**Status:** Approved for planning (v1 scope locked)
**Topic:** Standalone MCP plugin that renders "editorial-style" architecture diagrams (PNG/PDF/SVG) from a compact JSON spec, so Claude can auto-call it from any session.

---

## 1. Purpose & intent

Wrap the existing spec-driven diagram generator (`gen.mjs` + `render.mjs` + `editorial.css`) as a **standalone, installable MCP plugin**. Two goals carried over from the original tool, both preserved here:

1. **Cut token cost** — Claude authors a *compact JSON spec* (block DSL + card DSL) instead of hand-writing HTML/CSS. The generator turns that into styled HTML by code.
2. **Enforce a consistent diagram style by code** — the editorial style (C4 vocabulary, spacing, connector rules) lives in `gen.mjs` + `editorial.css`, not in per-diagram prose.

The plugin is **not tied to any project**. It is a general-purpose diagram generator that ships the author's editorial style as the default, and (in a later tier) accepts custom styles.

### Source of truth

The existing tooling lives in a sibling worktree under `docs/system/diagrams/` (gitignored, branch `claude/wizardly-swirles-725b1f`). Relevant core files:

- `gen.mjs` — spec JSON → editorial HTML string (`build()` + `applyPreset()` + `parseCard()`). Block types, card DSL, presets (`c4-l3`/`c4-l2`/`dynamic`), partials (`@stores`/`@core`).
- `render.mjs` — HTML → PNG (@2×) via puppeteer/Chromium.
- `editorial.css` — the style + spacing standard.
- `specs/*.json` — 15 real diagrams, reused as golden tests.

The richer site-builder pieces (`build-site.mjs`, `gen-matrix.mjs`, `nav.mjs`, `serve.mjs`, `audit.mjs`, `confluence-html/`, `png-pro/`) are **out of scope** — the MCP wraps only the three core pieces.

---

## 2. Key technical decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| **Language / runtime** | **Node + puppeteer** | The generator is already JS — reuse `gen.mjs` verbatim (no style drift, golden parity). The bottleneck is Chromium layout, which is identical across languages; Node is the only runtime that reuses the generator *and* drives the browser in one process. Go/Python would require rewriting the generator for zero speed/quality gain. |
| **Render engine** | **Chromium via puppeteer** (browser screenshot for raster; `page.pdf()` for PDF) | Diagrams are HTML+CSS (grid/flex). Only a real browser lays them out faithfully. Any "faster" engine (Satori, D2, native) means abandoning `editorial.css` — rejected. |
| **Output model** | `render_diagram` **always writes a file to disk AND returns inline image content** (`return_image` default `true`; set `false` for batch to save image tokens) | Serves all three needs at once: real image Claude can *see & self-correct*, real file on disk, and a stable path to embed in documents. |
| **Statelessness** | **Stateless** — spec passed inline (object) or by `spec_path`. CSS **inlined** into the HTML (no relative `../editorial.css` link), no `specs/`/`html/` directories. | Portable, deterministic, no hidden state. |
| **Packaging** | **Claude Code plugin** = MCP server + a **Skill** that teaches the DSL/style and when to call | Without the skill, Claude doesn't know the compact DSL → the token-saving benefit evaporates. |
| **Distribution** | **Local path first**; public-npm vs git-only channel decided later | Get it working locally; choose channel once stable. |
| **Chromium provisioning** | **Prefer system Chrome/Edge, fallback to `@puppeteer/browsers` auto-download** | Most dev machines have Chrome → skip the ~150 MB download; auto-download covers machines that don't. Per-OS aware. |
| **Cross-OS** | **macOS first**, with mechanism for Linux + Windows from day one | Pure Node `path`/`os`/`fs`, `.mjs` launcher (no `.sh`), OS-aware browser resolver, CI matrix wired (macOS active; Linux/Windows jobs ready to enable). |

---

## 3. v1 scope (Tier 1) — locked

**In:**

- `render_diagram` with full signature: `format` (png/pdf/svg), `scale`, `width`, `out_path`, `return_image`, and accepts `spec` (inline object) **or** `spec_path` (file).
- `validate_spec` — cheap text-only structural + DSL check.
- `describe_spec_schema` — returns JSON schema + DSL cheat-sheet.
- **Skill** teaching block DSL, card DSL, presets, partials, style rules, and when to invoke.
- Default **editorial** theme (CSS inlined).
- Good zero-config defaults (editorial theme, png, scale 2, width 1320).
- Actionable errors (which block/card failed + suggested fix).
- Self-contained HTML output (inlined CSS).

**Deferred to Tier 2:** custom themes (`theme_css`/`theme_path`), `get_example`/`list_examples`, `list_themes`, spec hash cache, batch render, preview-vs-final mode, style lint.

**Out of scope:** the site-builder pieces; SVG via non-browser engines.

### Format notes

- **PNG** (default) — puppeteer `screenshot` of `.diagram`, `deviceScaleFactor` = `scale`. Transparent background supported.
- **PDF** — `page.pdf()`, true vector for print/zoom.
- **SVG** — **experimental**: `<svg><foreignObject>` wrapping the diagram HTML + inlined CSS. Scalable and faithful in browsers/Confluence-web; may render imperfectly in some editors (Illustrator, certain markdown renderers). PDF is the reliable vector path; SVG is best-effort.

---

## 4. Architecture

Standalone Node package, packaged as a Claude Code plugin.

```
editorial-diagrams-mcp/
  package.json              # type:module; deps: @modelcontextprotocol/sdk, puppeteer, @puppeteer/browsers
  src/
    server.mjs              # MCP stdio server; registers the 3 tools; logs to stderr
    gen.mjs                 # lifted from existing — spec → HTML string; CSS INLINED; build(spec, css)
    render.mjs              # HTML string → buffer; browser resolve + reuse; png/pdf/svg
    browser.mjs             # resolve Chrome: env override → system detect → @puppeteer/browsers download
    themes/editorial.css    # default theme (copied verbatim)
    schema/spec.schema.json # JSON Schema for validate_spec + describe_spec_schema
  plugin/
    .mcp.json               # registers: node <path>/src/server.mjs  (stdio)
    .claude-plugin/...      # plugin manifest / marketplace entry
    skills/editorial-diagrams/SKILL.md   # teaches DSL + style + when to call
  test/
    specs/                  # 15 golden specs (copied)
    golden/                 # baseline PNGs
    smoke.test.mjs          # render all specs; assert non-empty + dimensions; optional pixel-diff
    validate.test.mjs       # validate_spec unit tests
  README.md
```

### Component responsibilities (isolation)

- **`gen.mjs`** — pure: `(spec, css) → html`. Only change from source: inline `<style>` instead of `<link href="../editorial.css">`, and `build()`/`render path` take CSS as an argument. All block/preset/partial/card-DSL logic preserved byte-for-byte in behavior (verified by golden parity).
- **`browser.mjs`** — pure-ish: resolves a browser executable path across OSes; owns the download fallback. Single responsibility, testable in isolation.
- **`render.mjs`** — `(html, {format, scale, width, transparent}) → Buffer`. Launches/reuses one browser; raster via `screenshot`, PDF via `page.pdf()`, SVG via foreignObject wrap.
- **`server.mjs`** — MCP wiring only: tool schemas, arg validation, file write, image-content packaging, error mapping. No render logic.

### Data flow (render_diagram)

```
Claude → render_diagram(spec|spec_path, opts)
  → load spec (inline or read file)
  → validate (structural) ; on error → actionable message, no render
  → gen.mjs: build(spec, editorialCss) → self-contained HTML string
  → render.mjs: HTML → Buffer (format/scale/width)
  → write Buffer to out_path (or default output dir)
  → return { path, format, width, height, bytes } + optional image content
```

---

## 5. Token optimization (for complex, multi-component diagrams across iterations)

Token cost on iteration comes from: (1) re-sending the full spec each call, (2) returned image bytes, (3) errors. Levers, by impact:

1. **Spec-as-file + Edit-diff** *(primary; no server state)* — Claude writes the spec to a `.json` once, then `render_diagram({spec_path})`; subsequent iterations `Edit` a few lines (cheap diff) and re-render by path. The full spec enters context once. → `render_diagram` accepts both `spec` and `spec_path` (in v1).
2. **Validate-first** — iterate on cheap text `validate_spec` until structurally valid, then render once. Avoids paying image tokens for broken diagrams.
3. **Image-return control** — `return_image:false` for text-only tweaks; (Tier 2: default to a downscaled preview while writing full-res to disk).
4. **Decomposition per style rule** — the "one boundary per L3" rule pushes a large diagram into several focused specs (per-container L3 + one L2 overview). Smaller specs = cheaper iterations. The Skill advises decomposition past a component threshold.
5. *(Tier 2, optional)* **Stateful patch API** — for chat contexts without file edits: server holds last spec per `session_id`, accepts a patch instead of the full spec.

---

## 6. Testing & determinism

- **Golden smoke test** — render all 15 golden specs; assert non-empty output + expected dimensions; optional pixel-diff against baselines to lock the style against regressions.
- **validate_spec unit tests** — malformed card DSL, unknown preset, missing required header fields, etc.
- **Determinism** — identical input → byte-identical output (matches the repo's determinism standard); no time/random in the render path.
- **Cross-OS** — CI matrix: macOS active now; Linux + Windows jobs wired, enabled when ready.

---

## 7. Open items (non-blocking for v1)

- Distribution channel (public npm vs git-only) — decide after local-path stabilizes.
- Exact default output directory for `out_path` when caller omits it.
- Whether SVG (experimental) ships in v1 or slips to first patch, pending a quick foreignObject fidelity check.
