import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectSystemChrome } from '../src/browser.mjs';

test('detectSystemChrome finds macOS Chrome when present', () => {
  const mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const p = detectSystemChrome('darwin', (x) => x === mac);
  assert.equal(p, mac);
});

test('detectSystemChrome finds Linux chromium when present', () => {
  const p = detectSystemChrome('linux', (x) => x === '/usr/bin/chromium');
  assert.equal(p, '/usr/bin/chromium');
});

test('detectSystemChrome finds Windows Chrome when present', () => {
  const win = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const p = detectSystemChrome('win32', (x) => x === win);
  assert.equal(p, win);
});

test('detectSystemChrome returns null when nothing exists', () => {
  assert.equal(detectSystemChrome('darwin', () => false), null);
});
