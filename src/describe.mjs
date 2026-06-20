import { readFileSync } from 'node:fs';
import { GRAPH_TYPES, LANE_TYPES, GRID_TYPES, SEQUENCE_TYPES } from './types.mjs';

const sequenceCheatsheet = '{ type:"sequence", title, actors:[{id,label}], messages:[{from,to,text, kind?:"sync"|"async"|"return", activate?, return?}] }  // messages ordered top→bottom; activate/return drive activation bars';

const gridCheatsheets = {
  matrix: '{ type:"matrix", title, cols:[..headers..], rows:[{label, cells:[..]}] }',
  quadrant: '{ type:"quadrant", title, xAxis:[left,right], yAxis:[bottom,top], quadrants?:[tl,tr,bl,br], items:[{label, x:0..1, y:0..1}] }',
  kanban: '{ type:"kanban", title, columns:[{title, cards:["Card DSL", ...]}] }',
  swimlane: '{ type:"swimlane", title, lanes:[{id,label}], steps:[{id,lane,t,card}], edges:[{from,to,label?}] }  // t = column index',
};

const laneCheatsheets = {
  'git-workflow': '{ type:"git-workflow", title, lanes:[{id,label,color?}], commits:[{branch,t,label?}], links:[{type:"branch"|"merge", from:{branch,t}, to:{branch,t}}] }  // t = time index',
  'timeline': '{ type:"timeline", title, events:[{title, detail?, at?}] }  // events laid left→right',
  'gantt': '{ type:"gantt", title, unit?, tasks:[{name, start, end, color?}] }  // start/end are numeric units',
  'user-journey': '{ type:"user-journey", title, stages:[{name, sentiment:1..5, detail?}] }',
};

const schema = JSON.parse(readFileSync(new URL('./schema/spec.schema.json', import.meta.url)));
const graphSchema = JSON.parse(readFileSync(new URL('./schema/graph.schema.json', import.meta.url)));

const graphCheatsheet =
  'Graph spec (flowchart, …): { type, title, direction?, nodes:[{id, card}], edges:[{from,to,label?,style?,arrow?}] }\n' +
  '  node.card uses the card DSL: "[kind:][+]Name | [tech] | detail" (kind ∈ person|ext|ds|jewel|sec|muted)\n' +
  '  edge.style ∈ orthogonal(default)|rounded|straight · edge.arrow:false to drop the arrowhead\n' +
  '  direction ∈ TB(default)|LR|BT|RL · layout is automatic (dagre)';

// Returns the schema + cheat-sheet for a given diagram type (graph types → graph schema).
export function describeForType(type) {
  if (type === 'communication') return { schema: graphSchema, cheatsheet: 'Communication diagram (UML) — objects + numbered messages on a free layout:\n' + graphCheatsheet + '\n  Convention: number each edge label by call order, e.g. "1: login()", "2: verify()", "2.1: ...". Use direction:"LR" for a network feel.' };
  if (GRAPH_TYPES.includes(type)) return { schema: graphSchema, cheatsheet: graphCheatsheet };
  if (LANE_TYPES.includes(type)) return { schema: {}, cheatsheet: laneCheatsheets[type] || Object.values(laneCheatsheets).join('\n') };
  if (GRID_TYPES.includes(type)) return { schema: {}, cheatsheet: gridCheatsheets[type] || Object.values(gridCheatsheets).join('\n') };
  if (SEQUENCE_TYPES.includes(type)) return { schema: {}, cheatsheet: sequenceCheatsheet };
  return { schema, cheatsheet: describeSpecSchema().cheatsheet };
}

const blockTypes = [
  '{cards:[...], label?, ctx?, cols?, conn?} — labelled grid of cards',
  '{flow:[card|{arrow}], label?, conn?} — horizontal pipeline',
  '{boundary:"label", blocks:[...], core?, conn?} — dashed container boundary',
  '{steps:[{from,to?,proto?,detail?,done?}]} — numbered Dynamic sequence',
  '{conn:"label"} — standalone vertical connector',
  '{rels?, note?, refs?, relsTitle?} — footer band',
  '{caption:"..."} — bottom caption',
];

const cardDSL =
  'Card DSL: "[kind:][+]Name | [tech] | detail"\n' +
  '  kind ∈ person|ext|ds|jewel|sec|muted   (prefix, e.g. "ds:MongoDB")\n' +
  '  +Name  → ‹component› stereotype\n' +
  '  [tech] or ‹marker› segment → technology tag; remaining segments → detail line\n' +
  'Examples: "+Account Service | users · credentials" · "ds:MongoDB | [datastore] | identity"';

const presets = ['c4-l1', 'c4-l2', 'c4-l3', 'dynamic'];

const partials =
  '@stores → MongoDB/KeyDB/Kafka datastore row · @core → shared Core boundary (idp-specific helpers)';

const sections = {
  cards: cardDSL,
  blocks: blockTypes.join('\n'),
  presets: `presets: ${presets.join(', ')}\npartials: ${partials}`,
};

export function describeSpecSchema(topic) {
  const cheatsheet = topic && sections[topic]
    ? sections[topic]
    : [cardDSL, '', 'Blocks:', blockTypes.join('\n'), '', `Presets: ${presets.join(', ')}`, `Partials: ${partials}`].join('\n');
  return { schema, cheatsheet, blockTypes, cardDSL, presets, partials };
}
