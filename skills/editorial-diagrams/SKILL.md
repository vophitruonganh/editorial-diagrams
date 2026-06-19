---
name: editorial-diagrams
description: Use when the user asks to create, render, or update any architecture / C4 / flow / UML / ERD / sequence / git-workflow / gantt / timeline diagram as an image (PNG/PDF/SVG). Authors a compact JSON spec and renders it in the editorial style via the editorial-diagrams MCP tools.
---

# Editorial Diagrams

Render editorial-style diagrams from a compact JSON spec via the `editorial-diagrams`
MCP server. The spec is far terser than hand-written HTML/SVG — that is the point
(token savings + one consistent style enforced by code). The MCP runs no model; it is
pure code, so it costs no tokens itself — only the spec you write and the image returned do.

## When to use
The user wants any **structural** diagram rendered: architecture/C4, flowchart, activity,
state, ERD, class, dependency/call/knowledge graph, mind-map, org-chart, decision-tree,
network, git-workflow, timeline, gantt, user-journey. (Not data charts — bar/line/pie — or UI mockups.)

## Token-efficient workflow (follow this order)
1. **Start from a skeleton, don't author from scratch:**
   - `scaffold_spec({ type, out_path: "d.json" })` — writes a ready skeleton to disk, OR
   - `list_examples` → `get_example({ id })` — copy a real example.
2. **Edit the file** (`d.json`) — change only the placeholders. On later iterations, `Edit`
   a few lines rather than re-sending the whole spec.
3. **`validate_spec({ spec })`** (cheap, text) until `valid: true`.
4. **`render_diagram({ spec_path: "d.json", format, scale, return_image })`**.
   - `format`: `png` (default) · `pdf` (true vector) · `svg` (experimental).
   - `return_image`: `auto` (default — full-res file on disk + a small inline preview you
     can inspect) · `full` (full-res inline) · `none` (path only — use for batch).
   - Inspect the preview, fix the file, re-render.
5. To embed in a document, reference the written file path.

## Type → spec shape (call `describe_spec_schema({ type })` for the full schema)
- **Flow / C4** (`c4-l1..l3`, `dynamic`, `deployment`, `landscape`, `layered`, `dfd`,
  `pipeline`): preset + `boundary`/`layers`/`downstream` or hand-authored `blocks`.
- **Graph** (`flowchart`, `activity`, `state`, `erd`, `class`, `dependency`, `call-graph`,
  `network`, `mindmap`, `org-chart`, `decision-tree`, `knowledge-graph`, `data-lineage`):
  `{ type, title, direction?, nodes:[{id, card | kind+fields}], edges:[{from,to,label?,...}] }`.
  - node `kind`: default card · `decision` ◇ · `start`/`end` · `fork`/`join` · `entity` (ERD) · `class`.
  - edge ends: `endFrom`/`endTo` ∈ `arrow` · `crow-one`/`crow-many`/`crow-zero-one`/`crow-zero-many` (ERD) ·
    `triangle` (inheritance) · `diamond`/`diamond-filled` (aggregation/composition); `arrow:false` to drop the arrowhead.
- **Lane / time** (`git-workflow`, `timeline`, `gantt`, `user-journey`): see scaffold output.

## Card DSL (graph/flow nodes)
`"[kind:][+]Name | [tech] | detail"` — kind ∈ person|ext|ds|jewel|sec|muted · `+` = ‹component› stereotype.
Always use this compact string form, not the verbose object form.

## Style standard (keep it consistent + legible)
- One boundary per L3 view. If a diagram has many components, **split it** into several
  focused diagrams rather than one mega-diagram — cheaper to iterate and easier to read.
- Omit fields that have sensible defaults (presets fill subtitle, etc.).
- Diagram language = document language.
