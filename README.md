# editorial-diagrams-mcp

MCP server that renders editorial-style architecture diagrams (PNG/PDF/SVG) from
a compact JSON spec. Reuses the spec-driven generator + `editorial.css`.

## Install as a Claude Code plugin

The plugin self-bootstraps: on first run it installs its own dependencies
(no need to commit `node_modules`; native `sharp`/`puppeteer-core` binaries are
fetched for your OS). Requires `node` + `npm` on PATH.

**From this repo (local path):**
```
/plugin marketplace add /Users/arvo/SilverTiger/editorial-diagrams-mcp
/plugin install editorial-diagrams
```

**From git (after you push it to a remote):**
```
/plugin marketplace add <github-user>/<repo>
/plugin install editorial-diagrams
```

First launch shows "installing dependencies (one time)…" on stderr, then the
`editorial-diagrams` MCP server + the `editorial-diagrams` skill become available.

**Manual MCP registration (no plugin system):** add to your MCP config:
```json
{ "mcpServers": { "editorial-diagrams": { "command": "node", "args": ["/abs/path/src/launch.mjs"] } } }
```

**Optional (future):** publish to npm and switch `.mcp.json` to `npx -y editorial-diagrams-mcp` for zero-clone installs.

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
