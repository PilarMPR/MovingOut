/**
 * Price history — the changelog of estimates (IND002).
 *
 * `history` is append-only. Revising an estimate pushes a new revision; it
 * never mutates an existing one. Nothing in this module writes into an
 * existing element, and nothing sorts in place.
 *
 * This is a log of what the user *thinks* something will cost. It is not a
 * spending feed, and it must never become one — the app has to stay useful
 * without daily upkeep.
 */
import type { Cents, Entry, IsoDate, Revision } from '../types';

/** Today, as a local `YYYY-MM-DD`. `toISOString()` would drift a day in CEST. */
export function today(): IsoDate {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `2026-08-09` → `09/08/2026`. */
export function formatDate(iso: IsoDate): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** The first estimate ever recorded, which is what drift measures against. */
export function original(entry: Entry): Revision | null {
  return entry.history.length > 0 ? entry.history[0] : null;
}

/** The revision before the current one, or `null` if this is still the first. */
export function previous(entry: Entry): Revision | null {
  const n = entry.history.length;
  return n >= 2 ? entry.history[n - 2] : null;
}

/**
 * Record a new estimate. Returns a new Entry — the caller replaces, never
 * patches. A revision that repeats the current amount is still recorded when
 * it carries a note, because "confirmed against the June bill" is information.
 */
export function pushRevision(
  entry: Entry,
  amountCents: Cents,
  date: IsoDate,
  note?: string,
): Entry {
  const revision: Revision = note === undefined || note === '' ? { date, amountCents } : { date, amountCents, note };
  return {
    ...entry,
    amountCents,
    hasAmount: true,
    history: [...entry.history, revision],
  };
}

export interface Delta {
  /** Change against the revision before it. `null` on the first estimate. */
  vsPreviousCents: Cents | null;
  /** Change against the very first estimate. `null` on the first estimate. */
  vsOriginalCents: Cents | null;
  /** Change against the first estimate, in percent. `null` if it started at 0. */
  vsOriginalPercent: number | null;
}

/** The deltas for the current amount of an entry. */
export function delta(entry: Entry): Delta {
  const first = original(entry);
  const prev = previous(entry);
  if (first === null || entry.history.length < 2) {
    return { vsPreviousCents: null, vsOriginalCents: null, vsOriginalPercent: null };
  }
  const vsOriginalCents = entry.amountCents - first.amountCents;
  return {
    vsPreviousCents: prev === null ? null : entry.amountCents - prev.amountCents,
    vsOriginalCents,
    vsOriginalPercent: first.amountCents === 0 ? null : (vsOriginalCents / first.amountCents) * 100,
  };
}

/** One line of the Historial tab: a revision, with the entry it belongs to. */
export interface LogLine {
  entryId: string;
  label: string;
  date: IsoDate;
  amountCents: Cents;
  note?: string;
  /** `null` on the first revision of an entry — there is nothing to compare to. */
  vsPreviousCents: Cents | null;
  vsOriginalPercent: number | null;
  isFirst: boolean;
}

/**
 * Every revision across every entry, newest first. Copies before sorting —
 * `history.sort()` would reorder the append-only array in place (IND002).
 */
export function log(entries: Entry[]): LogLine[] {
  const lines: LogLine[] = [];
  for (const entry of entries) {
    const first = entry.history.length > 0 ? entry.history[0] : null;
    entry.history.forEach((revision, i) => {
      const prev = i > 0 ? entry.history[i - 1] : null;
      const vsOriginal = first === null || i === 0 ? null : revision.amountCents - first.amountCents;
      lines.push({
        entryId: entry.id,
        label: entry.label,
        date: revision.date,
        amountCents: revision.amountCents,
        note: revision.note,
        vsPreviousCents: prev === null ? null : revision.amountCents - prev.amountCents,
        vsOriginalPercent:
          vsOriginal === null || first === null || first.amountCents === 0
            ? null
            : (vsOriginal / first.amountCents) * 100,
        isFirst: i === 0,
      });
    });
  }
  return lines.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
}

export interface HistorySummary {
  /** Revisions, not first estimates — the first one is not a change. */
  revisionCount: number;
  /** How many conceptos have been revised at least once. */
  revisedEntries: number;
  /** The single biggest rise since its original estimate. */
  biggestRise: { label: string; cents: Cents; percent: number | null } | null;
  lastDate: IsoDate | null;
}

/** The Historial KPI row. Reads the same series the log does. */
export function summary(entries: Entry[]): HistorySummary {
  let revisionCount = 0;
  let revisedEntries = 0;
  let lastDate: IsoDate | null = null;
  let biggestRise: HistorySummary['biggestRise'] = null;

  for (const entry of entries) {
    if (entry.history.length > 1) {
      revisionCount += entry.history.length - 1;
      revisedEntries += 1;
      const d = delta(entry);
      if (d.vsOriginalCents !== null && d.vsOriginalCents > 0) {
        if (biggestRise === null || d.vsOriginalCents > biggestRise.cents) {
          biggestRise = {
            label: entry.label,
            cents: d.vsOriginalCents,
            percent: d.vsOriginalPercent,
          };
        }
      }
    }
    for (const revision of entry.history) {
      if (lastDate === null || revision.date > lastDate) lastDate = revision.date;
    }
  }

  return { revisionCount, revisedEntries, biggestRise, lastDate };
}
