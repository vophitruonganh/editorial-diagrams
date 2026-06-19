import { GRAPH_TYPES, LANE_TYPES, GRID_TYPES, SEQUENCE_TYPES } from './types.mjs';

function validateSequence(spec) {
  const errors = [];
  if (!Array.isArray(spec.actors) || spec.actors.length === 0) errors.push('`actors` must be a non-empty array');
  const ids = new Set((spec.actors || []).map(a => a && a.id));
  (spec.messages || []).forEach((m, i) => {
    if (!m || !m.from || !m.to) { errors.push(`messages[${i}] needs from+to`); return; }
    if (!ids.has(m.from)) errors.push(`messages[${i}].from "${m.from}" is not a declared actor`);
    if (!ids.has(m.to)) errors.push(`messages[${i}].to "${m.to}" is not a declared actor`);
  });
  return errors;
}

const GRID_REQUIRED = { matrix: ['rows'], quadrant: ['items'], kanban: ['columns'], swimlane: ['lanes', 'steps'] };
function validateGrid(spec) {
  const errors = [];
  for (const key of GRID_REQUIRED[spec.type] || []) {
    if (!Array.isArray(spec[key]) || spec[key].length === 0) errors.push(`\`${key}\` must be a non-empty array for type "${spec.type}"`);
  }
  if (spec.type === 'swimlane') {
    const ids = new Set((spec.lanes || []).map(l => l && l.id));
    (spec.steps || []).forEach((s, i) => { if (!s || !ids.has(s.lane)) errors.push(`steps[${i}].lane "${s && s.lane}" is not a declared lane`); });
  }
  return errors;
}

const PRESETS = ['c4-l3', 'c4-l2', 'dynamic'];

const LANE_REQUIRED = {
  'git-workflow': ['lanes', 'commits'],
  'timeline': ['events'],
  'gantt': ['tasks'],
  'user-journey': ['stages'],
};

function validateLane(spec) {
  const errors = [];
  for (const key of LANE_REQUIRED[spec.type] || []) {
    if (!Array.isArray(spec[key]) || spec[key].length === 0) errors.push(`\`${key}\` must be a non-empty array for type "${spec.type}"`);
  }
  if (spec.type === 'gantt') {
    (spec.tasks || []).forEach((t, i) => {
      if (!t || typeof t.start !== 'number' || typeof t.end !== 'number') errors.push(`tasks[${i}] needs numeric \`start\` and \`end\``);
      else if (t.end < t.start) errors.push(`tasks[${i}].end < start`);
    });
  }
  if (spec.type === 'git-workflow') {
    const ids = new Set((spec.lanes || []).map(l => l && l.id));
    (spec.commits || []).forEach((c, i) => { if (!c || !ids.has(c.branch)) errors.push(`commits[${i}].branch "${c && c.branch}" is not a declared lane`); });
  }
  return errors;
}

function validateGraph(spec) {
  const errors = [];
  if (!Array.isArray(spec.nodes) || spec.nodes.length === 0) {
    errors.push('`nodes` must be a non-empty array');
  }
  const ids = new Set();
  (spec.nodes || []).forEach((n, i) => {
    if (!n || typeof n.id !== 'string' || !n.id) errors.push(`nodes[${i}] is missing a string \`id\``);
    else if (ids.has(n.id)) errors.push(`duplicate node id "${n.id}"`);
    else ids.add(n.id);
  });
  if (spec.edges !== undefined && !Array.isArray(spec.edges)) errors.push('`edges` must be an array when present');
  (spec.edges || []).forEach((e, i) => {
    if (!e || !e.from || !e.to) { errors.push(`edges[${i}] needs both \`from\` and \`to\``); return; }
    if (!ids.has(e.from)) errors.push(`edges[${i}].from "${e.from}" is not a declared node`);
    if (!ids.has(e.to)) errors.push(`edges[${i}].to "${e.to}" is not a declared node`);
  });
  return errors;
}

export function validateSpec(spec) {
  const errors = [];
  if (spec == null || typeof spec !== 'object' || Array.isArray(spec)) {
    return { valid: false, errors: ['spec must be a JSON object'] };
  }
  if (typeof spec.title !== 'string' || !spec.title.trim()) {
    errors.push('`title` is required and must be a non-empty string');
  }

  // graph-engine types validate by nodes/edges
  if (GRAPH_TYPES.includes(spec.type)) {
    errors.push(...validateGraph(spec));
    return { valid: errors.length === 0, errors };
  }
  // lane/time-engine types validate by their required arrays
  if (LANE_TYPES.includes(spec.type)) {
    errors.push(...validateLane(spec));
    return { valid: errors.length === 0, errors };
  }
  // grid-engine types
  if (GRID_TYPES.includes(spec.type)) {
    errors.push(...validateGrid(spec));
    return { valid: errors.length === 0, errors };
  }
  // sequence engine
  if (SEQUENCE_TYPES.includes(spec.type)) {
    errors.push(...validateSequence(spec));
    return { valid: errors.length === 0, errors };
  }

  // flow engine (preset / blocks)
  if (spec.preset !== undefined && !PRESETS.includes(spec.preset)) {
    errors.push(`\`preset\` must be one of ${PRESETS.join(', ')} (got "${spec.preset}")`);
  }
  if (spec.preset === 'dynamic') {
    if (!Array.isArray(spec.steps) || spec.steps.length === 0) {
      errors.push('`dynamic` preset requires a non-empty `steps` array');
    } else {
      spec.steps.forEach((s, i) => {
        if (!s || typeof s.from !== 'string' || !s.from.trim()) errors.push(`steps[${i}] is missing a \`from\` actor`);
      });
    }
  }
  if ((spec.preset === 'c4-l3' || spec.preset === 'c4-l2') && !spec.boundary && !spec.blocks) {
    errors.push('`c4-l3`/`c4-l2` preset expects a `boundary` (or pre-expanded `blocks`)');
  }
  if (spec.blocks !== undefined && !Array.isArray(spec.blocks)) {
    errors.push('`blocks` must be an array when present');
  }
  return { valid: errors.length === 0, errors };
}
