const PRESETS = ['c4-l3', 'c4-l2', 'dynamic'];

export function validateSpec(spec) {
  const errors = [];
  if (spec == null || typeof spec !== 'object' || Array.isArray(spec)) {
    return { valid: false, errors: ['spec must be a JSON object'] };
  }
  if (typeof spec.title !== 'string' || !spec.title.trim()) {
    errors.push('`title` is required and must be a non-empty string');
  }
  if (spec.preset !== undefined && !PRESETS.includes(spec.preset)) {
    errors.push(`\`preset\` must be one of ${PRESETS.join(', ')} (got "${spec.preset}")`);
  }
  if (spec.preset === 'dynamic') {
    if (!Array.isArray(spec.steps) || spec.steps.length === 0) {
      errors.push('`dynamic` preset requires a non-empty `steps` array');
    } else {
      spec.steps.forEach((s, i) => {
        if (!s || typeof s.from !== 'string' || !s.from.trim()) {
          errors.push(`steps[${i}] is missing a \`from\` actor`);
        }
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
