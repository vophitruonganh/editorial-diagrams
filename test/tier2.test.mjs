import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scaffoldSpec, scaffoldTypes } from '../src/scaffold.mjs';
import { listExamples, getExample } from '../src/examples.mjs';
import { renderByType } from '../src/router.mjs';
import { validateSpec } from '../src/validate.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';
import { renderDiagram } from '../src/tools.mjs';
import { closeBrowser } from '../src/browser.mjs';

const css = loadThemeCss();
const out = join(tmpdir(), 'edm-tier2.png');
after(() => { closeBrowser(); if (existsSync(out)) rmSync(out); });

test('every scaffold type is valid AND renders without error', async () => {
  for (const type of scaffoldTypes()) {
    const spec = scaffoldSpec(type);
    const v = validateSpec(spec);
    assert.equal(v.valid, true, `${type} scaffold invalid: ${v.errors.join('; ')}`);
    const html = await renderByType(spec, css);
    assert.match(html, /class="diagram"/, `${type} render`);
  }
});

test('examples: list includes known ids, get returns the spec', async () => {
  const ids = listExamples().map(e => e.id);
  assert.ok(ids.includes('flowchart-login'));
  assert.ok(ids.includes('git-gitflow'));
  assert.ok(ids.includes('40-arch-api'));
  assert.equal(getExample('flowchart-login').type, 'flowchart');
});

test('return_image: none → no image; auto → preview image; full → image', async () => {
  const spec = scaffoldSpec('flowchart');
  spec.title = 'T';
  const none = await renderDiagram({ spec, format: 'png', scale: 1, out_path: out, return_image: 'none' });
  assert.ok(!none.content.some(c => c.type === 'image'));

  const auto = await renderDiagram({ spec, format: 'png', scale: 2, out_path: out, return_image: 'auto' });
  assert.ok(auto.content.some(c => c.type === 'image'));
  assert.match(auto.content[0].text, /preview/);

  const full = await renderDiagram({ spec, format: 'png', scale: 1, out_path: out, return_image: 'full' });
  assert.ok(full.content.some(c => c.type === 'image'));
});

test('return_image auto returns a png preview even for pdf on disk', async () => {
  const spec = scaffoldSpec('flowchart'); spec.title = 'T';
  const res = await renderDiagram({ spec, format: 'pdf', out_path: join(tmpdir(), 'edm-tier2.pdf'), return_image: 'auto' });
  assert.ok(res.content.some(c => c.type === 'image' && c.mimeType === 'image/png'));
  rmSync(join(tmpdir(), 'edm-tier2.pdf'), { force: true });
});
