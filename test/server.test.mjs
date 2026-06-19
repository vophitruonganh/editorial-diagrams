import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../src/server.mjs';

test('buildServer registers the three tools', () => {
  const names = [];
  const fakeServer = { registerTool: (n) => names.push(n) };
  buildServer(fakeServer);
  assert.deepEqual(names.sort(), ['describe_spec_schema', 'get_example', 'list_examples', 'render_diagram', 'scaffold_spec', 'validate_spec']);
});
