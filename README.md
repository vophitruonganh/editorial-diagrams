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
