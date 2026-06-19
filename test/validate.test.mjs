import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateSpec } from '../src/validate.mjs';

const arch = JSON.parse(readFileSync(new URL('./specs/40-arch-api.json', import.meta.url)));

test('a real golden spec is valid', () => {
  const r = validateSpec(arch);
  assert.equal(r.valid, true, r.errors.join('; '));
});

test('missing title is rejected', () => {
  const r = validateSpec({ preset: 'c4-l3' });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => /title/.test(e)));
});

test('unknown preset is rejected with a clear message', () => {
  const r = validateSpec({ title: 'X', preset: 'c4-l9' });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => /preset/.test(e)));
});

test('dynamic preset requires steps', () => {
  const r = validateSpec({ title: 'X', preset: 'dynamic' });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => /steps/.test(e)));
});

test('a step missing "from" is rejected', () => {
  const r = validateSpec({ title: 'X', preset: 'dynamic', steps: [{ to: 'B' }] });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => /from/.test(e)));
});
