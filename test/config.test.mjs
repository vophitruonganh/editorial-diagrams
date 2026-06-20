import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { renderDiagram } from '../src/tools.mjs';
import { resetConfigCache } from '../src/config.mjs';
import { closeBrowser } from '../src/browser.mjs';

const spec = { type: 'flowchart', title: 'T', nodes: [{ id: 'a', card: 'A' }, { id: 'b', card: 'B' }], edges: [{ from: 'a', to: 'b' }] };
const out = join(tmpdir(), 'edm-cfg.png');
const cornerAlpha = async p => {
  const { data } = await sharp(p).ensureAlpha().extract({ left: 2, top: 2, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  return data[3]; // 0 = transparent, 255 = opaque
};
const ENV_KEYS = ['TRANSPARENT', 'FORMAT', 'SCALE', 'PREVIEW_WIDTH', 'RETURN_IMAGE', 'OUT_DIR'].map(k => 'CLAUDE_PLUGIN_OPTION_' + k);
after(() => {
  closeBrowser();
  if (existsSync(out)) rmSync(out);
  delete process.env.EDITORIAL_DIAGRAMS_CONFIG;
  for (const k of ENV_KEYS) delete process.env[k];
  resetConfigCache();
});

test('transparent:true produces a real transparent PNG (corner alpha 0)', async () => {
  await renderDiagram({ spec, format: 'png', scale: 1, out_path: out, transparent: true, return_image: 'none' });
  assert.equal(await cornerAlpha(out), 0);
});

test('default PNG background is solid (corner alpha 255)', async () => {
  await renderDiagram({ spec, format: 'png', scale: 1, out_path: out, transparent: false, return_image: 'none' });
  assert.equal(await cornerAlpha(out), 255);
});

test('config file supplies defaults (transparent + out_dir); per-call args override', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'edm-cfgdir-'));
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ transparent: true, out_dir: dir }));
  process.env.EDITORIAL_DIAGRAMS_CONFIG = join(dir, 'config.json');
  resetConfigCache();

  // no out_path, no transparent → both come from config
  const res = await renderDiagram({ spec: { ...spec, id: 'cfg-demo' }, return_image: 'none' });
  assert.match(res.content[0].text, /cfg-demo\.png/);
  assert.equal(await cornerAlpha(join(dir, 'cfg-demo.png')), 0, 'config transparent applied');

  // per-call arg beats config
  await renderDiagram({ spec: { ...spec, id: 'cfg-demo2' }, transparent: false, return_image: 'none' });
  assert.equal(await cornerAlpha(join(dir, 'cfg-demo2.png')), 255, 'per-call overrides config');

  rmSync(dir, { recursive: true, force: true });
  delete process.env.EDITORIAL_DIAGRAMS_CONFIG;
  resetConfigCache();
});

test('plugin UI config (CLAUDE_PLUGIN_OPTION_* env) drives defaults; per-call args override', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'edm-uidir-'));
  process.env.CLAUDE_PLUGIN_OPTION_TRANSPARENT = 'true';
  process.env.CLAUDE_PLUGIN_OPTION_OUT_DIR = dir;
  resetConfigCache();

  // no out_path, no transparent → both come from the UI/env config
  const res = await renderDiagram({ spec: { ...spec, id: 'ui-demo' }, return_image: 'none' });
  assert.match(res.content[0].text, /ui-demo\.png/);
  assert.equal(await cornerAlpha(join(dir, 'ui-demo.png')), 0, 'UI transparent applied');

  // per-call arg still beats UI config
  await renderDiagram({ spec: { ...spec, id: 'ui-demo2' }, transparent: false, return_image: 'none' });
  assert.equal(await cornerAlpha(join(dir, 'ui-demo2.png')), 255, 'per-call overrides UI config');

  rmSync(dir, { recursive: true, force: true });
  for (const k of ENV_KEYS) delete process.env[k];
  resetConfigCache();
});
