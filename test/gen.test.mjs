import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build, applyPreset, parseCard, renderSpec } from '../src/gen.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';

const css = loadThemeCss();
const arch = JSON.parse(readFileSync(new URL('./specs/40-arch-api.json', import.meta.url)));
const dyn = JSON.parse(readFileSync(new URL('./specs/30-dyn-login-mfa.json', import.meta.url)));

test('parseCard splits kind / stereotype / tech / detail', () => {
  const c = parseCard('ds:MongoDB | [datastore] | identity');
  assert.equal(c.kind, 'ds');
  assert.equal(c.h, 'MongoDB');
  assert.equal(c.tech, '[datastore]');
  assert.equal(c.p, 'identity');
  assert.equal(parseCard('+Account Service').stereo, 1);
});

test('build inlines CSS and emits the diagram shell', () => {
  const html = build({ eyebrow: 'E', title: 'T', blocks: [] }, css);
  assert.match(html, /<style>/);
  assert.ok(!html.includes('editorial.css'), 'must not link external CSS');
  assert.match(html, /class="diagram"/);
  assert.match(html, /class="title">T</);
});

test('renderSpec expands a c4-l3 preset (boundary + downstream)', () => {
  const html = renderSpec(arch, css);
  assert.match(html, /class="boundary"/);
  assert.match(html, /api-/);
  assert.match(html, /class="card/);
});

test('renderSpec expands a dynamic preset into numbered steps', () => {
  const html = renderSpec(dyn, css);
  assert.match(html, /class="steps"/);
  assert.match(html, /class="step/);
});

test('renderSpec does not mutate the caller spec', () => {
  const before = JSON.stringify(arch);
  renderSpec(arch, css);
  assert.equal(JSON.stringify(arch), before, 'spec must be cloned, not mutated');
});

test('build is deterministic for identical input', () => {
  assert.equal(renderSpec(dyn, css), renderSpec(dyn, css));
});
