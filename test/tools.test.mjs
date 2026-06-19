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
  assert.ok(res.content.some((c) => c.type === 'text' && /png/i.test(c.text)));
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
