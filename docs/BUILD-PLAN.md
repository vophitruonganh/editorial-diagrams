# Editorial Diagrams MCP — Build Plan (multi-engine)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use `- [ ]` checkboxes. This plan covers multiple subsystems — **Phase A is detailed below; Phases B–F each get their own detailed plan when reached** (per the writing-plans scope-check: decompose multi-subsystem work, plan the first sub-project in full).

**Goal:** Extend the editorial diagram MCP from the C4/architecture family to *every structural diagram type* (flowchart, activity, state, ERD, class, git-workflow, sequence, gantt, timeline, trees, graphs…) — all rendered in the author's editorial style, validated by 5 working prototypes.

**Architecture:** One MCP, **four render engines** sharing editorial chrome + node/edge primitives. A `type` field on the spec routes to the right engine. Nodes are real editorial cards; edges + notation are hand-drawn SVG we fully control (so 100% on-brand, no third-party engine visuals).

**Tech Stack:** Node ≥18 ESM · puppeteer-core (render) · `@dagrejs/dagre` (graph layout) · `node:test`. No new heavy deps beyond dagre.

## Build status — ALL PHASES COMPLETE (2026-06-20)
Phases 0/A/B/C/D/E/F built inline, TDD, **70 tests pass**, **31 diagram types** live across 5 engines (flow · graph · lane · sequence · grid), PNG/PDF/SVG all verified. 6 MCP tools (render_diagram · validate_spec · describe_spec_schema · scaffold_spec · list_examples · get_example). Each notation-heavy type visually verified through the production path.
- **Deferred (only items not built):** `communication` diagram (a sequence variant — do next, reuses the sequence engine), plus the below-threshold exclusions (Venn, Sankey).
- Follow-ups: node auto-measuring for tighter graph layouts; `alt`/`opt`/`loop` frames for sequence; expand `@stores`/`@core` partials.

## Global Constraints
- **Style by code:** nodes = editorial `card()` + `editorial.css`; all notation (arrowheads, crow's-foot, diamonds, fork/join, lifelines, lane curves) hand-drawn SVG matching editorial tokens (`--border #DCE0E6`, radius 10, slate `#475569`, amber `#b45309`, indigo). Never a third-party engine's visuals.
- **Layout engines compute geometry only** (dagre = node x/y + edge waypoints; lane = column/time math). Visual is 100% ours.
- **Stateless, deterministic:** identical spec → identical output. No time/random in render path. Clone specs before mutating.
- **Cross-OS, ESM, `.mjs`,** pure Node path/os/fs. Chrome via existing `browser.mjs` (system-first + download fallback).
- **Editorial chrome** (eyebrow/title/subtitle/rule/caption) wraps every diagram regardless of engine.

## Prototype seeds (validated — `scratchpad/`, to be hardened into modules)
| Prototype | Proves | Seeds |
|---|---|---|
| `proto-flow.mjs` | dagre + card nodes + orthogonal rounded edges + labels | graph engine |
| `proto-activity.mjs` | decision ◇, fork/join bars, start/end glyphs | graph notation |
| `proto-erd.mjs` | entity-table card + crow's-foot + edge endpoint glyphs | graph notation |
| `proto-git.mjs` | lane/time renderer (no dagre) + branch/merge curves | lane engine |
| (existing) `gen.mjs` | C4 block/preset engine | flow engine (built) |

---

## Engine map → diagram types

| Engine | Status | Types |
|---|---|---|
| **flow** (`gen.mjs`) | ✅ built (Phase 0) | C4 L1–L3, dynamic, deployment, landscape, layered, DFD, pipeline |
| **graph** (dagre) | Phase A–B | flowchart, activity, state, erd, class, dependency/call/knowledge graph, mindmap, org-chart, decision-tree, network |
| **lane** (time-axis) | Phase C | git-workflow (trunk/GitFlow), timeline, gantt |
| **sequence** (lifeline) | Phase D | sequence, communication |
| niche/grid | Phase F | matrix (lift `gen-matrix`), quadrant, kanban, swimlane; sankey/venn (optional) |

## Tool surface (after build)
- `render_diagram({ type, spec | spec_path, format, scale, width, out_path, return_image, transparent })` — `type` routes to engine. (Existing C4 path stays; new types add routing.)
- `validate_spec({ type, spec })` · `describe_spec_schema({ type })` — per-type.
- **Tier 2:** `scaffold_spec({ type, ... })` (plugin writes a skeleton to disk → Claude edits deltas) · `list_examples` / `get_example` (expose the committed `test/specs/`) · `return_image` = `auto` (downscaled preview) | `full` | `none`.

---

## Shared module structure (created in Phase A, reused by all engines)

```
src/
  gen.mjs                 # flow engine (built) — refactor: extract chrome
  chrome.mjs             # NEW — editorial header/title/subtitle/rule/caption wrapper (lifted from gen.build)
  nodes.mjs              # NEW — editorial node renderers: card, diamond, forkBar, startEnd, entityTable, classBox, commitDot
  edges.mjs              # NEW — edge path (straight|orthogonal|rounded|curve) + glyphs (arrowhead, crowfoot, umlTriangle, tick)
  layout/graph.mjs       # NEW — dagre wrapper: (nodes,edges,opts) → positioned geometry
  layout/lane.mjs        # Phase C — lane/time geometry
  engines/
    graph.mjs            # NEW — graph spec → HTML (uses nodes/edges/layout/chrome)
    lane.mjs             # Phase C
    sequence.mjs         # Phase D
  router.mjs             # NEW — type → engine dispatch
schema/
  graph.schema.json      # NEW — graph spec
  ...                    # per engine
```

---

# PHASE A — Shared infra + graph engine core (flowchart end-to-end)

**Deliverable:** `render_diagram({type:"flowchart", spec})` works end-to-end through the MCP, producing an editorial flowchart (cards + orthogonal rounded amber edges + labels), with validation, schema description, golden test, and the shared `chrome/nodes/edges/layout` modules that Phases B–D build on.

**Graph spec format (Phase A subset):**
```json
{
  "type": "flowchart",
  "title": "Login flow", "eyebrow": "...", "subtitle": "...", "caption": "...",
  "direction": "TB",
  "nodes": [ { "id": "a", "card": "Receive request|[HTTPS] /auth/login" },
             { "id": "c", "card": "sec:MFA required?|decision" } ],
  "edges": [ { "from": "a", "to": "b" },
             { "from": "b", "to": "c", "label": "ok" } ]
}
```
- `card` uses the existing card DSL (`[kind:][+]Name | [tech] | detail`). `edge.style` (later) ∈ orthogonal|rounded|straight; Phase A default = orthogonal-rounded.

### Task A1: Extract `chrome.mjs` from `gen.mjs`
**Files:** Create `src/chrome.mjs`; Modify `src/gen.mjs`; Test `test/chrome.test.mjs`
**Interfaces:** Produces `renderChrome({eyebrow,title,subtitle,caption}, bodyHTML, css): string` → full self-contained HTML doc with editorial header/rule/body/caption + inlined CSS. `gen.build()` refactored to call it.

- [ ] **Step 1: Failing test** — `test/chrome.test.mjs`
```js
import { test } from 'node:test'; import assert from 'node:assert/strict';
import { renderChrome } from '../src/chrome.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';
test('chrome wraps body with editorial header + inlined css', () => {
  const html = renderChrome({ eyebrow: 'E', title: 'T', subtitle: 'S', caption: 'C' }, '<div id="b">x</div>', loadThemeCss());
  assert.match(html, /<style>/); assert.ok(!html.includes('editorial.css'));
  assert.match(html, /class="eyebrow">E</); assert.match(html, /class="title">T</);
  assert.match(html, /class="diagram"/); assert.match(html, /id="b"/); assert.match(html, /class="caption">C</);
});
```
- [ ] **Step 2:** Run `node --test test/chrome.test.mjs` → FAIL (no module).
- [ ] **Step 3:** Implement `src/chrome.mjs`:
```js
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
export function renderChrome({ eyebrow, title, subtitle, caption }, bodyHTML, css, opts = {}) {
  const maxw = opts.maxw ? ` style="max-width:${opts.maxw}px"` : '';
  let h = `<!doctype html><html><head><meta charset="utf-8"><style>\n${css}\n</style></head><body>\n<div class="diagram"${maxw}>`;
  if (eyebrow) h += `\n  <div class="eyebrow">${esc(eyebrow)}</div>`;
  h += `\n  <div class="title">${esc(title)}</div>`;
  if (subtitle) h += `\n  <div class="subtitle">${subtitle}</div>`;
  h += `\n  <div class="rule"></div>\n  ${bodyHTML}`;
  if (caption) h += `\n  <div class="caption">${esc(caption)}</div>`;
  return h + `\n</div>\n</body></html>\n`;
}
```
- [ ] **Step 4:** Refactor `gen.build(spec, css)` to assemble its blocks into `bodyHTML` then `return renderChrome(spec, bodyHTML, css)`. Run full suite `node --test` → all existing flow/golden tests still PASS (parity preserved).
- [ ] **Step 5:** Commit `feat(chrome): extract editorial chrome wrapper shared across engines`.

### Task A2: `nodes.mjs` — editorial card node (positioned)
**Files:** Create `src/nodes.mjs`; Test `test/nodes.test.mjs`
**Interfaces:** Produces `cardNode(dsl, {w,h,left,top}): string` (absolute-positioned editorial card, reuses `parseCard`). Returns `{ measure(dsl): {w,h} }` later; Phase A uses fixed sizes.

- [ ] **Step 1: Failing test** — assert `cardNode('sec:+Token|jwt', {w:200,h:80,left:10,top:20})` returns a `class="card sec"` div, absolute-positioned, with `<h4>Token</h4>` and the stereo/tech.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `cardNode` using `parseCard` from `gen.mjs` (same markup as `gen.card()` + inline `position:absolute;left;top;width;height;box-sizing:border-box`).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(nodes): positioned editorial card node`.

### Task A3: `edges.mjs` — paths + arrowhead
**Files:** Create `src/edges.mjs`; Test `test/edges.test.mjs`
**Interfaces:** Produces `edgePath(points, {style:'orthogonal'|'rounded'|'straight', r}): string` (SVG `d`); `arrowMarkerDefs(): string`; `edgeLabelChip(point, text): string`. (Hardened from `proto-flow` `smoothPath`/rounded-corner logic.)

- [ ] **Step 1: Failing test** — `edgePath([{x:0,y:0},{x:0,y:50},{x:40,y:50}], {style:'rounded'})` returns a path string starting `M 0,0` and containing `Q` (rounded corner); `arrowMarkerDefs()` contains `<marker id="arrow"`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement from the validated prototype rounded-corner + Catmull options.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(edges): editorial edge paths + arrowhead`.

### Task A4: `layout/graph.mjs` — dagre wrapper
**Files:** Create `src/layout/graph.mjs`; Test `test/layout-graph.test.mjs`
**Interfaces:** Produces `layoutGraph(nodes, edges, {direction,nodesep,ranksep,sizeOf}): { nodes:{id,x,y,w,h}[], edges:{from,to,points}[], width, height }`. `sizeOf(node)` returns `{w,h}` (Phase A: fixed default).

- [ ] **Step 1: Failing test** — 3-node chain A→B→C, TB; assert 3 positioned nodes with increasing `y`, 2 edges each with `points.length>=2`, and `width/height>0`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement dagre wrapper (`@dagrejs/dagre`), default node size 200×84.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(layout): dagre graph layout wrapper`.

### Task A5: `engines/graph.mjs` — flowchart renderer
**Files:** Create `src/engines/graph.mjs`; Test `test/engine-graph.test.mjs`
**Interfaces:** Consumes chrome/nodes/edges/layout. Produces `renderGraph(spec, css): string` (full HTML). Phase A handles `node.card` + `edge{from,to,label}`, orthogonal-rounded edges, arrowheads, label chips, inside a positioned canvas div, wrapped by chrome.

- [ ] **Step 1: Failing test** — render a 4-node flowchart spec; assert HTML contains `class="card"` ×4, an `<svg`, a `<path` (edge), `url(#arrow)`, and the chrome title.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `renderGraph` (port `proto-flow` into the module form, using A1–A4).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(engine): graph engine renders flowcharts`.

### Task A6: `router.mjs` + wire `type` into tools
**Files:** Create `src/router.mjs`; Modify `src/tools.mjs`, `src/validate.mjs`, `src/describe.mjs`, `src/server.mjs`; Test `test/router.test.mjs`, extend `test/tools.test.mjs`
**Interfaces:** `renderByType(spec, css): string` dispatches on `spec.type` (`c4-l3|c4-l2|dynamic|...` → flow `renderSpec`; `flowchart` → `renderGraph`). `validate_spec`/`describe_spec_schema`/`render_diagram` accept `type`.

- [ ] **Step 1: Failing test** — `renderByType({type:'flowchart',...})` returns flowchart HTML; `renderByType({preset:'c4-l3',...})`/`{type:'c4-l3'}` still returns flow HTML; `renderDiagram({spec:{type:'flowchart',...},format:'png'})` writes a PNG.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `router.mjs`; update `tools.renderDiagram` to call `renderByType`; `describe_spec_schema({type})` returns the graph schema for graph types; `validate_spec` branches by type (graph: nodes/edges present, ids unique, edge endpoints exist).
- [ ] **Step 4:** Run full suite → PASS (existing C4 untouched).
- [ ] **Step 5:** Commit `feat(router): type-routed rendering; flowchart via render_diagram`.

### Task A7: Golden smoke for flowchart
**Files:** Create `test/specs/graph/flowchart-login.json`; `test/golden-graph.test.mjs`
- [ ] **Step 1:** Add a real flowchart spec (the login-flow from the prototype).
- [ ] **Step 2:** Smoke test: render it to PNG, assert PNG signature + dims > 0.
- [ ] **Step 3:** Run → PASS.
- [ ] **Step 4:** Commit `test(graph): golden flowchart render`.

**Phase A exit:** flowchart shippable via MCP; shared `chrome/nodes/edges/layout/router` in place; all prior C4 tests green.

---

# PHASE B — Graph notation set (own detailed plan)
**Deliverable:** types `activity, state, erd, class, dependency, network, org-chart, decision-tree, mindmap` via the graph engine. Each adds node/edge *kinds*, not new engines.
- **B1 Activity/State:** `nodes.mjs` += `diamond` (rounded, editorial border), `forkBar`, `startEnd`; edge guard labels; self-loop edge for state. Seed: `proto-activity`.
- **B2 ERD:** `nodes.mjs` += `entityTable` (header + PK/FK field rows); `edges.mjs` += `crowfoot` (one/many/zero variants, tangent-oriented), no arrowhead. Seed: `proto-erd`.
- **B3 Class (UML):** `nodes.mjs` += `classBox` (name/attrs/methods compartments); `edges.mjs` += `umlTriangle` (inheritance), `diamond` end (aggregation/composition).
- **B4 Trees/graphs:** org-chart/decision-tree/mindmap = graph engine with tree ranks (dagre TB/LR); dependency/network = generic nodes+edges. Mostly config + small node variants.
- Each type: spec schema + `validate` branch + `describe` entry + golden spec + render test.
**Confidence:** 90–95% (all reuse Phase A primitives; proven by `proto-activity`/`proto-erd`).

# PHASE C — Lane/time engine (own detailed plan)
**Deliverable:** `git-workflow`, `timeline`, `gantt`, `user-journey`.
- **C1 `layout/lane.mjs`:** lane index + time→x mapping; per-lane baselines.
- **C2 `engines/lane.mjs`:** git-workflow (lanes=branches, dots=commits, branch/merge curves colored by branch) — seed `proto-git`; timeline (axis + milestone dots/cards).
- **C3 Gantt:** bars on a date scale + dependency connectors (date parsing, scale).
- Schemas + validate + describe + goldens.
**Confidence:** git-workflow ~90% (proven), timeline ~88%, gantt ~85%.

# PHASE D — Sequence engine (own detailed plan; spike first)
**Deliverable:** `sequence` (lifelines, messages, activation bars, alt/loop frames).
- **D0 Spike** lifeline grid + activation before committing scope (only unproven mechanism left).
- **D1 `engines/sequence.mjs`:** actors = header cards + vertical lifelines; messages = horizontal arrows at time rows (sync/async/return); activation bars; opt frames (alt/opt/loop) as labelled rectangles.
**Confidence:** ~83% (lane/time family proven by Phase C; activation/frames are the fiddly remainder → spike D0 first).

# PHASE E — Tier 2 token features (own detailed plan)
- **E1 `return_image` policy:** `auto` (default) → write full-res file + return a **downscaled PNG preview** (≤768px, even when on-disk format is pdf/svg) ; `full`; `none`. Re-render preview at low deviceScaleFactor.
- **E2 `scaffold_spec({type, ...minimal})`:** engine-side skeleton written to disk per type → Claude edits deltas (biggest authoring-token saver). Pure code, 0 model.
- **E3 `list_examples`/`get_example`:** expose committed `test/specs/**` as starter templates.
- **E4 Skill "standard":** update `SKILL.md` — enforce compact card DSL, minimal fields, fixed block order, partials; document `type` per family; spec-as-file + Edit-diff loop.
- **E5 Partials:** expand `@stores`/`@core` library.

# PHASE F — Niche / grid (own detailed plan)
- Matrix (lift `gen-matrix.mjs`), quadrant/2×2, kanban, swimlane/BPMN-lite (lane-constrained graph).

## EXCLUDED (below the 70% confidence bar — not in committed scope)
- **Venn diagram** (~65%) · **Sankey** (~50%) — out for now; revisit only if specifically needed.
- **Bar/line/pie charts, wireframes/mockups** — different domain (data-viz / UI), out of a structural-diagram tool.

---

## Risks / honest notes
- **Sequence activation/frames** and **Sankey layout** are the only genuinely-unproven mechanisms — D0 spike + treat Sankey as optional.
- **Per-type notation long tail** (self-loops, overlapping labels, dense graphs): budget polish time per type; goldens lock regressions.
- **Node auto-sizing:** Phase A uses fixed sizes; B should measure card content (render-measure pass in Chromium) for tight layouts — small follow-up.
- **Scope discipline:** keep it to *structural* diagrams; data charts (bar/line/pie) and mockups stay out.

## Suggested build order
A → B → C → E (token features, high daily value) → D (spike-gated) → F (optional). E can move earlier if token cost during authoring becomes the priority.
