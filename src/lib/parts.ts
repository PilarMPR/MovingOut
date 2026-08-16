/**
 * The desglose — a concepto against what it is made of.
 *
 * Everything here is arithmetic on one Entry and its `parts`, and none of it
 * reaches a total: `derive()` does not import this module, and that is the
 * point. A desglose explains a figure, it never changes one (types.ts, `Part`).
 * What it can do is disagree with the figure it explains, and saying so out
 * loud is this module's whole job — a breakdown that silently came to 640 €
 * under a headline of 800 € would be worse than no breakdown, because it would
 * read as the detailed version.
 *
 * Pure, no clock, no React (CLAUDE.md § Architecture conventions).
 */

import type { Cents, Entry, Part } from '../types';

/**
 * How a desglose stands against the concepto above it.
 *
 *   · `vacio`    nothing written down yet. Not a problem — most rows are this,
 *                and a budget where every line is itemised is a budget nobody
 *                finished.
 *   · `parcial`  the parts come to less than the headline. The remainder is
 *                real money that has not been accounted for, and it is the
 *                normal state of a desglose in progress.
 *   · `cuadra`   they agree to the cent.
 *   · `pasado`   the parts come to *more* than the headline. Not an error to be
 *                rejected — it is the most useful thing this screen can tell
 *                you, because it means the estimate above is too low and you
 *                found out by listing what you actually need.
 */
export type PartsStatus = 'vacio' | 'parcial' | 'cuadra' | 'pasado';

export interface PartsSummary {
  /** The parts, in the order they were written. */
  parts: Part[];
  /** How many there are. */
  count: number;
  /** Sum of the parts that carry an amount. Blanks contribute nothing. */
  totalCents: Cents;
  /**
   * Headline minus parts. **Signed, and the one number here that is allowed to
   * be negative** — it is a difference, not an amount, so IND005 does not apply
   * and clamping it at zero would erase the `pasado` case entirely.
   */
  unallocatedCents: number;
  /** Parts still missing an amount. The gap above is provisional while this is > 0. */
  missingCount: number;
  status: PartsStatus;
  /**
   * Share of the headline the parts account for, 0–100 and clamped at 100 so a
   * `pasado` desglose cannot draw a bar past the end of its track. `null` when
   * the concepto has no amount to be a share *of* — which is not zero percent,
   * it is an unanswerable question, and the bar is not drawn at all.
   */
  coveragePercent: number | null;
}

/** The parts of an entry, treating absent and empty as the same thing. */
export function partsOf(entry: Entry): Part[] {
  return entry.parts ?? [];
}

/**
 * Sum of the parts.
 *
 * Blank parts add nothing rather than zero — the distinction matters because
 * `missingCount` is what tells the screen the sum is still provisional, and a
 * blank silently counted as 0 € would make a half-priced desglose look like a
 * finished one that leaves money spare (IND001: integer cents throughout).
 */
export function partsTotal(parts: readonly Part[]): Cents {
  // IND004 fires on the line below and it is a false positive — but read this
  // before "fixing" it, because routing this sum through `toMonthly()` would be
  // a real bug rather than a correction. A Part has no frequency of its own on
  // purpose (types.ts): it inherits the concepto's. So every amount in this
  // array is already in the same unit, and the only figure the sum is ever
  // compared against is `entry.amountCents`, which is in that unit too.
  // Normalising would divide an anual concepto's parts by twelve and then hold
  // them against an un-normalised anual headline, making every yearly desglose
  // read as 92 % unallocated.
  // check:ignore IND004 one entry's parts all share that entry's frequency
  return parts.reduce((sum, part) => (part.hasAmount ? sum + part.amountCents : sum), 0);
}

/**
 * Everything the desglose screen needs about one concepto, in one pass.
 *
 * A concepto with no amount of its own is deliberately not a failure here: you
 * are allowed to list what a lump is made of *before* you know what the lump
 * costs, and in fact that is how you find out. It just has no share to report.
 */
export function summarise(entry: Entry): PartsSummary {
  const parts = partsOf(entry);
  const totalCents = partsTotal(parts);
  const missingCount = parts.filter((part) => !part.hasAmount).length;
  const headlineCents = entry.hasAmount ? entry.amountCents : 0;
  const unallocatedCents = headlineCents - totalCents;

  let status: PartsStatus;
  if (parts.length === 0) status = 'vacio';
  else if (!entry.hasAmount) status = 'parcial';
  else if (unallocatedCents === 0) status = 'cuadra';
  else if (unallocatedCents < 0) status = 'pasado';
  else status = 'parcial';

  return {
    parts,
    count: parts.length,
    totalCents,
    unallocatedCents,
    missingCount,
    status,
    coveragePercent:
      entry.hasAmount && entry.amountCents > 0
        ? Math.min(100, Math.round((totalCents / entry.amountCents) * 100))
        : null,
  };
}

/**
 * The whole scenario's desglose, for the tab header.
 *
 * `conceptosBrokenDown` counts rows that have any part at all, against every
 * row that could have one. Both figures ignore nothing and filter nothing: a
 * `pausado` row still has a desglose, and a `critico` one especially does —
 * "the laptop dying · 900 €" is exactly the kind of number that deserves to say
 * what it is made of, and excluding possibilities here would be the fifth place
 * to forget them (CLAUDE.md § Domain rules).
 */
export interface DesgloseTotals {
  conceptosBrokenDown: number;
  conceptosTotal: number;
  /** Rows whose parts exceed their headline — the ones worth looking at first. */
  overCount: number;
  /** Rows with a desglose that is still missing at least one price. */
  incompleteCount: number;
}

export function desgloseTotals(entries: readonly Entry[]): DesgloseTotals {
  let conceptosBrokenDown = 0;
  let overCount = 0;
  let incompleteCount = 0;

  for (const entry of entries) {
    const summary = summarise(entry);
    if (summary.count === 0) continue;
    conceptosBrokenDown += 1;
    if (summary.status === 'pasado') overCount += 1;
    if (summary.missingCount > 0) incompleteCount += 1;
  }

  return {
    conceptosBrokenDown,
    conceptosTotal: entries.length,
    overCount,
    incompleteCount,
  };
}
