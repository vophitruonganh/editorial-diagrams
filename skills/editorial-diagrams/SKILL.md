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
