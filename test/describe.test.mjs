import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeSpecSchema } from '../src/describe.mjs';

test('returns schema + DSL reference', () => {
  const d = describeSpecSchema();
  assert.ok(d.schema && d.schema.properties.title);
  assert.match(d.cardDSL, /kind:/);
  assert.ok(Array.isArray(d.blockTypes) && d.blockTypes.length >= 5);
  assert.ok(d.presets.includes('c4-l3'));
});

test('topic narrows the cheatsheet', () => {
  const d = describeSpecSchema('cards');
  assert.match(d.cheatsheet, /card/i);
});
