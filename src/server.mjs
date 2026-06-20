#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { renderDiagram, validateSpecTool, describeSchemaTool, scaffoldSpecTool, listExamplesTool, getExampleTool } from './tools.mjs';

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
        return_image: z.union([z.boolean(), z.enum(['auto', 'full', 'none'])]).optional(),
        preview_width: z.number().min(300).max(2000).optional(),
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
      description: 'Return the JSON schema + DSL cheat-sheet. Pass `type` (e.g. "flowchart") for graph specs, or `topic` for the flow/C4 DSL.',
      inputSchema: { topic: z.enum(['cards', 'blocks', 'presets']).optional(), type: z.string().optional() },
    },
    (args) => describeSchemaTool(args),
  );

  server.registerTool(
    'scaffold_spec',
    {
      title: 'Scaffold a diagram spec',
      description: 'Write a starter spec skeleton for a diagram `type` (to `out_path` if given). Edit the placeholders, then render. Saves authoring tokens vs writing the spec from scratch.',
      inputSchema: { type: z.string(), out_path: z.string().optional() },
    },
    (args) => scaffoldSpecTool(args),
  );

  server.registerTool(
    'list_examples',
    {
      title: 'List example specs',
      description: 'List the bundled example/golden specs (id · type · title). Use get_example to fetch one as a starting point.',
      inputSchema: {},
    },
    () => listExamplesTool(),
  );

  server.registerTool(
    'get_example',
    {
      title: 'Get an example spec',
      description: 'Return a bundled example spec by id (from list_examples) — copy + edit it instead of authoring from scratch.',
      inputSchema: { id: z.string() },
    },
    (args) => getExampleTool(args),
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
