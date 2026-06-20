import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderByType } from '../src/router.mjs';
import { loadThemeCss } from '../src/themes/index.mjs';
import { renderHtml } from '../src/render.mjs';
import { closeBrowser } from '../src/browser.mjs';
import { validateSpec } from '../src/validate.mjs';

const css = loadThemeCss();
const load = f => JSON.parse(readFileSync(new URL('./specs/lane/' + f, import.meta.url)));
const git = load('git-gitflow.json');
const tl = load('timeline-roadmap.json');
const gantt = load('gantt-sprint.json');
const journey = load('journey-signup.json');

after(() => closeBrowser());

test('git-workflow: lanes, commits, branch/merge curves', async () => {
  const h = await renderByType(git, css);
  assert.match(h, />main</);
  assert.match(h, /<circle /);   // commits
  assert.match(h, /<path /);     // branch/merge curves
  assert.match(h, />merge feature</);
});

test('timeline: events laid out with cards', async () => {
  const h = await renderByType(tl, css);
  assert.match(h, />MVP</);
  assert.match(h, /<foreignObject/);
});

test('gantt: task names + bars', async () => {
  const h = await renderByType(gantt, css);
  assert.match(h, />Build API</);
  assert.match(h, /<rect /);
});

test('user-journey: stages + sentiment polyline', async () => {
  const h = await renderByType(journey, css);
  assert.match(h, />Onboard</);
  assert.match(h, /<polyline /);
});

test('lane validation catches bad specs', async () => {
  assert.equal(validateSpec({ type: 'gantt', title: 'x', tasks: [{ name: 'a', start: 5, end: 2 }] }).valid, false);
  assert.equal(validateSpec({ type: 'timeline', title: 'x', events: [] }).valid, false);
  const badGit = validateSpec({ type: 'git-workflow', title: 'x', lanes: [{ id: 'main' }], commits: [{ branch: 'nope', t: 0 }] });
  assert.equal(badGit.valid, false);
  assert.ok(badGit.errors.some(e => /not a declared lane/.test(e)));
});

test('all four lane types render to valid PNGs', async () => {
  for (const spec of [git, tl, gantt, journey]) {
    const { buffer } = await renderHtml(await renderByType(spec, css), { format: 'png', scale: 1 });
    assert.deepEqual([...buffer.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], `${spec.type} PNG`);
    assert.ok(buffer.length > 1000);
  }
});
