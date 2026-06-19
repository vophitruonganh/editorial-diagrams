// scaffold_spec: deterministic per-type skeleton specs. The MCP writes the
// boilerplate; Claude only edits the deltas → cuts authoring tokens (no model here).
const G = (type, nodes, edges) => ({ type, eyebrow: '', title: '<title>', nodes, edges, caption: '' });

const SCAFFOLDS = {
  flowchart: () => G('flowchart',
    [{ id: 'a', card: 'Start step|detail' }, { id: 'b', card: 'Next step' }, { id: 'c', card: 'sec:Decision?|branch' }],
    [{ from: 'a', to: 'b' }, { from: 'b', to: 'c', label: 'when' }]),
  activity: () => ({ type: 'activity', title: '<title>', nodes: [{ id: 's', kind: 'start' }, { id: 'a', card: 'Do thing' }, { id: 'd', kind: 'decision', label: 'OK?' }, { id: 'e', kind: 'end' }], edges: [{ from: 's', to: 'a' }, { from: 'a', to: 'd' }, { from: 'd', to: 'e', label: 'yes' }] }),
  state: () => G('state',
    [{ id: 'idle', card: 'Idle' }, { id: 'active', card: 'Active' }],
    [{ from: 'idle', to: 'active', label: 'start' }, { from: 'active', to: 'idle', label: 'stop' }]),
  erd: () => ({ type: 'erd', title: '<title>', nodes: [{ id: 'A', kind: 'entity', name: 'A', fields: [['id', 'uuid', 'pk'], ['name', 'string']] }, { id: 'B', kind: 'entity', name: 'B', fields: [['id', 'uuid', 'pk'], ['a_id', 'uuid', 'fk']] }], edges: [{ from: 'A', to: 'B', endFrom: 'crow-one', endTo: 'crow-many', arrow: false }] }),
  class: () => ({ type: 'class', title: '<title>', nodes: [{ id: 'Base', kind: 'class', name: 'Base', attributes: ['id: UUID'], methods: ['save()'] }, { id: 'Sub', kind: 'class', name: 'Sub', methods: ['extra()'] }], edges: [{ from: 'Sub', to: 'Base', endTo: 'triangle', arrow: false, label: 'extends' }] }),
  'c4-l3': () => ({ preset: 'c4-l3', type: 'c4-l3', eyebrow: 'Component view (C4 L3) · <service>', title: 'Inside <service>', boundary: '‹container› <service> — [tech]', layers: [{ l: 'Layer', c: 2, cards: ['+Component A|[tech]|detail', '+Component B|detail'], conn: 'uses' }], downstream: '@stores', caption: '' }),
  'git-workflow': () => ({ type: 'git-workflow', title: '<title>', lanes: [{ id: 'main', label: 'main' }, { id: 'feature', label: 'feature' }], commits: [{ branch: 'main', t: 0, label: 'init' }, { branch: 'feature', t: 2 }, { branch: 'main', t: 4, label: 'merge' }], links: [{ type: 'branch', from: { branch: 'main', t: 0 }, to: { branch: 'feature', t: 2 } }, { type: 'merge', from: { branch: 'feature', t: 2 }, to: { branch: 'main', t: 4 } }] }),
  timeline: () => ({ type: 'timeline', title: '<title>', events: [{ at: 'Q1', title: 'Milestone A', detail: '...' }, { at: 'Q2', title: 'Milestone B' }] }),
  gantt: () => ({ type: 'gantt', title: '<title>', tasks: [{ name: 'Task A', start: 0, end: 3 }, { name: 'Task B', start: 3, end: 6 }] }),
  'user-journey': () => ({ type: 'user-journey', title: '<title>', stages: [{ name: 'Stage 1', sentiment: 3 }, { name: 'Stage 2', sentiment: 4 }] }),
};
for (const t of ['dependency', 'call-graph', 'network', 'knowledge-graph', 'data-lineage'])
  SCAFFOLDS[t] = () => G(t, [{ id: 'a', card: 'Node A' }, { id: 'b', card: 'Node B' }, { id: 'c', card: 'Node C' }], [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }]);
for (const t of ['mindmap', 'org-chart', 'decision-tree'])
  SCAFFOLDS[t] = () => G(t, [{ id: 'root', card: 'Root' }, { id: 'a', card: 'Child A' }, { id: 'b', card: 'Child B' }], [{ from: 'root', to: 'a' }, { from: 'root', to: 'b' }]);

export function scaffoldSpec(type) {
  const fn = SCAFFOLDS[type];
  if (!fn) throw new Error(`no scaffold for type "${type}" — known: ${Object.keys(SCAFFOLDS).join(', ')}`);
  return fn();
}
export function scaffoldTypes() { return Object.keys(SCAFFOLDS); }
