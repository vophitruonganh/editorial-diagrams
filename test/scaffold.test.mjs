import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('package.json declares ESM and required deps', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  assert.equal(pkg.type, 'module');
  assert.ok(pkg.dependencies['@modelcontextprotocol/sdk']);
  assert.ok(pkg.dependencies['puppeteer-core']);
  assert.ok(pkg.dependencies['@puppeteer/browsers']);
});
