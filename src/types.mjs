// Single source of truth for which diagram `type` routes to which engine.
// Each build phase appends the types it implements (engine + validation stay in sync).
//
// Phase A: flowchart. Phase B: + UML/ERD/class/trees/graphs (all graph engine).
// Phase C: git-workflow, timeline, gantt, user-journey (lane engine).
// Phase D: sequence, communication (sequence engine).
export const GRAPH_TYPES = [
  'flowchart', 'activity', 'state', 'erd', 'class',
  'dependency', 'call-graph', 'network', 'mindmap',
  'org-chart', 'decision-tree', 'knowledge-graph', 'data-lineage',
];
export const LANE_TYPES = ['git-workflow', 'timeline', 'gantt', 'user-journey'];
export const SEQUENCE_TYPES = [];
export const GRID_TYPES = ['matrix', 'quadrant', 'kanban', 'swimlane'];

// Flow engine is the default (preset/blocks specs); these are documented for describe_spec_schema.
export const FLOW_TYPES = ['c4-l1', 'c4-l2', 'c4-l3', 'dynamic', 'deployment', 'landscape', 'layered', 'dfd', 'pipeline'];

export function engineFor(type) {
  if (GRAPH_TYPES.includes(type)) return 'graph';
  if (LANE_TYPES.includes(type)) return 'lane';
  if (GRID_TYPES.includes(type)) return 'grid';
  if (SEQUENCE_TYPES.includes(type)) return 'sequence';
  return 'flow';
}
