/**
 * Names the user has to tell apart in a list.
 *
 * This exists because of a real failure: "Nuevo escenario" created a second
 * scenario named exactly like the first, and the header picker — which shows
 * names, not ids — then offered two identical options over two identical
 * screens. The button worked; nothing on screen said so. A blank scenario made
 * it total, because the seeded checklist appearing had been the only feedback.
 *
 * The same shape applies to anything added from a fixed default label:
 * categories, rooms, scenario copies.
 */

/**
 * `base` if it is free, otherwise `base 2`, `base 3`, … until it is.
 *
 * Compared on trimmed values so " Piso" and "Piso" count as the same name to a
 * reader, which is the only judge that matters here.
 */
export function uniqueName(taken: readonly string[], base: string): string {
  const used = new Set(taken.map((name) => name.trim()));
  if (!used.has(base.trim())) return base;

  // At most `used.size` names are occupied, so a free suffix exists inside this
  // bound — the loop is written to terminate rather than to be trusted.
  for (let n = 2; n <= used.size + 2; n += 1) {
    const candidate = `${base} ${n}`;
    if (!used.has(candidate.trim())) return candidate;
  }
  return `${base} ${used.size + 2}`;
}
