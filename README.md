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

## Diagram types
- **Flow / C4** (built-in engine): c4-l1..l3, dynamic, deployment, landscape, layered, dfd, pipeline.
- **Graph** (dagre + editorial cards): flowchart, activity, state, erd, class, dependency,
  call-graph, network, mindmap, org-chart, decision-tree, knowledge-graph, data-lineage.
- **Lane / time**: git-workflow, timeline, gantt, user-journey.

All in the editorial style — nodes are editorial cards, notation (arrowheads, crow's-foot,
UML triangle/diamond, fork/join, lifelines) is hand-drawn SVG matching the palette.

## Tools
- `render_diagram` — spec → file on disk (+ inline preview). `spec` or `spec_path`;
  `format` (png/pdf/svg) · `scale` · `width` · `out_path` · `transparent` ·
  `return_image` (`auto` preview / `full` / `none`).
- `validate_spec` — cheap structural + DSL check (use before rendering).
- `describe_spec_schema` — schema + DSL cheat-sheet (pass `type` for graph/lane specs).
- `scaffold_spec` — write a per-type starter skeleton to disk (edit deltas → saves tokens).
- `list_examples` / `get_example` — bundled golden specs to copy from.

## Chromium
Prefers a system Chrome/Edge; otherwise downloads Chromium on first run to
`~/.cache/editorial-diagrams-mcp/`. Override with `PUPPETEER_EXECUTABLE_PATH`.

## Test
`node --test` (render tests need a resolvable Chrome).
