import { readFileSync } from 'node:fs';
import { GRAPH_TYPES } from './types.mjs';

const schema = JSON.parse(readFileSync(new URL('./schema/spec.schema.json', import.meta.url)));
const graphSchema = JSON.parse(readFileSync(new URL('./schema/graph.schema.json', import.meta.url)));

const graphCheatsheet =
  'Graph spec (flowchart, …): { type, title, direction?, nodes:[{id, card}], edges:[{from,to,label?,style?,arrow?}] }\n' +
  '  node.card uses the card DSL: "[kind:][+]Name | [tech] | detail" (kind ∈ person|ext|ds|jewel|sec|muted)\n' +
  '  edge.style ∈ orthogonal(default)|rounded|straight · edge.arrow:false to drop the arrowhead\n' +
  '  direction ∈ TB(default)|LR|BT|RL · layout is automatic (dagre)';

// Returns the schema + cheat-sheet for a given diagram type (graph types → graph schema).
export function describeForType(type) {
  if (GRAPH_TYPES.includes(type)) return { schema: graphSchema, cheatsheet: graphCheatsheet };
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

const presets = ['c4-l3', 'c4-l2', 'dynamic'];

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
