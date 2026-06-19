import { readFileSync } from 'node:fs';

const schema = JSON.parse(readFileSync(new URL('./schema/spec.schema.json', import.meta.url)));

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
