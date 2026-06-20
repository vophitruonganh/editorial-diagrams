// Spec-level aliases: a `defs` map lets a spec define reusable strings referenced
// as `$name` anywhere (whole values OR substrings inside the card DSL). Expanded
// before validate + render. Deterministic; unknown `$name` is left untouched.
// General (not project-specific) — cuts tokens on specs with repeated tech tags etc.
export function expandDefs(spec) {
  if (!spec || typeof spec !== 'object' || !spec.defs) return spec;
  const defs = spec.defs;
  const rep = s => s.replace(/\$([A-Za-z][\w-]*)/g, (m, k) => (Object.prototype.hasOwnProperty.call(defs, k) && typeof defs[k] === 'string' ? defs[k] : m));
  const walk = v => {
    if (typeof v === 'string') return rep(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = walk(v[k]); return o; }
    return v;
  };
  const out = walk(spec);
  delete out.defs;
  return out;
}
