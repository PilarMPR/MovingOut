/** Stable ids for entries, scenarios and projects. Local only — nothing syncs. */
let counter = 0;

export function newId(prefix: string): string {
  const c = globalThis.crypto;
  if (c !== undefined && typeof c.randomUUID === 'function') {
    return `${prefix}_${c.randomUUID().slice(0, 8)}`;
  }
  counter += 1;
  return `${prefix}_${counter.toString(36)}${Math.trunc(performance.now()).toString(36)}`;
}
