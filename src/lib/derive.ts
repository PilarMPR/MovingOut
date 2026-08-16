/**
 * Every derived figure in the app. Pure functions over plain data — no React,
 * no storage, no DOM (IND007). If a screen shows a number, it came from here,
 * because the alternative is two screens quietly disagreeing about what
 * "monthly total" means.
 *
 * The rules that are easy to get individually right and collectively wrong:
 *
 *   · the fianza is refundable, so `upfrontCash` and `actualSpend` are two
 *     figures and never one, and runway never treats the deposit as burned
 *   · runway only means something when the balance is negative; when it is
 *     positive there is no runway to report, so that branch does not exist
 *     and `∞ meses` can never render
 *   · `pausado` is excluded on purpose, so it is excluded from totals but
 *     still visible in the breakdown
 *   · a blank amount is not a zero — it is counted as missing coverage and
 *     printed alongside every total
 *   · the shopping log is a second source of salidas, and it is *added* to the
 *     estimates rather than reconciled against them — see `withLogged()`
 */
import type { Cents, Category, Entry, IsoDate, Room, Scenario, Settings } from '../types';
import { FALLBACK_ROOM } from '../types';
import { isRecurring, toMonthly } from './frequency';
import { percentOf, ratioPercent } from './money';
import { byCategory, loggedSpend, overlaps, type CategorySpend, type LoggedSpend, type Overlap } from './purchases';

// ── which entries count where ────────────────────────────────────────────

/** Furniture lives in Muebles; everything else is a Costes concepto. */
export function isFurniture(entry: Entry): boolean {
  return entry.room !== undefined;
}

/**
 * A possibility rather than an expense. It has never been paid, it may never
 * be, and it is in no total anywhere in the app — see `EntryKind` in types.ts.
 * What it does instead is size the colchón, in `cushion()` below.
 */
export function isPossibility(entry: Entry): boolean {
  return entry.kind === 'critico';
}

/**
 * Counts toward a monthly total. `pausado` is the deliberate exclusion;
 * `pendiente` still counts, because an annual insurance premium you have not
 * paid yet is still a cost of living there.
 *
 * `critico` is excluded before any of that, and for a different reason: paused
 * is a row you switched off, a possibility is a row that was never on.
 */
export function countsMonthly(entry: Entry): boolean {
  return (
    !isPossibility(entry) &&
    entry.status !== 'pausado' &&
    entry.shouldNotPay !== true &&
    entry.hasAmount &&
    isRecurring(entry.frequency)
  );
}

/**
 * Due before you sleep there. One-offs that are still `pendiente` — `pagado`
 * has already left the account, `pausado` was excluded on purpose.
 *
 * Furniture only counts when it is `esencial`: the minimum to move in is what
 * you genuinely cannot move in without, and a nice armchair is not that.
 */
export function countsUpfront(entry: Entry): boolean {
  // A possibility is never cash you need on day one. This is the single check
  // that stops the cushion — 8.400 € of things that have not happened — being
  // announced as the price of moving in (docs/DEVLOG.md, 2026-08-15).
  if (isPossibility(entry)) return false;
  if (entry.frequency !== 'unico' || entry.direction !== 'salida') return false;
  if (entry.status === 'pagado' || entry.status === 'pausado') return false;
  if (entry.shouldNotPay === true || !entry.hasAmount) return false;
  if (isFurniture(entry) && entry.priority !== 'esencial') return false;
  return true;
}

// ── monthly totals ───────────────────────────────────────────────────────

export interface MonthlyTotals {
  inCents: Cents;
  outCents: Cents;
  balanceCents: Cents;
  /** How many conceptos fed each side — the KPI sub-line prints it. */
  inCount: number;
  outCount: number;
  /** Salidas that are committed. What a bad month actually threatens. */
  fijosCents: Cents;
  /** Salidas that are real but irregular, and yours to choose. */
  esporadicosCents: Cents;
}

/**
 * Frequency-normalised totals per direction. Everything goes via toMonthly().
 *
 * Salidas are also split by `kind`, because "te faltan 120 €" means two very
 * different things depending on which half is short: a fijo you cannot cover
 * is a crisis, an esporádico you cannot fund is a decision. `outCents` stays
 * the sum of both, so nothing that reads it needs to know the split exists.
 */
export function monthlyTotals(entries: Entry[]): MonthlyTotals {
  let inCents = 0;
  let outCents = 0;
  let inCount = 0;
  let outCount = 0;
  let fijosCents = 0;
  let esporadicosCents = 0;
  for (const entry of entries) {
    if (!countsMonthly(entry)) continue;
    const monthly = toMonthly(entry.amountCents, entry.frequency);
    if (monthly === null) continue;
    if (entry.direction === 'entrada') {
      inCents += monthly;
      inCount += 1;
    } else {
      outCents += monthly;
      outCount += 1;
      if (entry.kind === 'esporadico') esporadicosCents += monthly;
      else fijosCents += monthly;
    }
  }
  return {
    inCents,
    outCents,
    balanceCents: inCents - outCents,
    inCount,
    outCount,
    fijosCents,
    esporadicosCents,
  };
}

/**
 * The estimates, plus what the shopping log actually costs per month.
 *
 * The log is a salida like any other and it *adds*: nothing here inspects the
 * estimates to see whether one of them already claims to cover the same food.
 * That is a deliberate refusal — the app does not get to decide that the row
 * you typed is redundant — and the price of it is that a live "Compra semanal"
 * estimate and a logged weekly shop will both count. `overlaps()` is what finds
 * that case and the UI is what says so out loud.
 *
 * The counts are left alone: they say how many *conceptos* fed each side, and
 * the log is not a concepto. Its own count is reported beside its own figure.
 */
export function withLogged(totals: MonthlyTotals, loggedMonthlyCents: Cents): MonthlyTotals {
  if (loggedMonthlyCents === 0) return totals;
  const outCents = totals.outCents + loggedMonthlyCents;
  // Deliberately not added to `fijosCents` or `esporadicosCents`: the log is
  // not a forecast of either kind, it is what already left the account, and it
  // gets its own line in the waterfall for exactly that reason.
  return { ...totals, outCents, balanceCents: totals.inCents - outCents };
}

// ── the waterfall ────────────────────────────────────────────────────────

/**
 * The balance, in the order the money actually goes, rather than as one
 * subtraction.
 *
 * `disponible` is the number the app was missing: what is left once the
 * unavoidable has gone, which is what a bad month threatens and what the
 * irregular spending is funded out of. A negative `disponible` and a negative
 * `margen` are different emergencies — the first means you cannot pay the
 * rent, the second means you cannot also buy clothes this year — and printing
 * one figure for both was the app answering a question nobody asked.
 *
 * The lines are ordered by how certain the money is: what already left the
 * account, then what is owed, then what is chosen. Possibilities never appear;
 * they are not money that goes anywhere.
 */
export interface Waterfall {
  inCents: Cents;
  fijosCents: Cents;
  /** The shopping log's monthly equivalent — observed, not estimated. */
  loggedCents: Cents;
  /** `in − fijos − logged`. What is left to allocate. */
  disponibleCents: Cents;
  esporadicosCents: Cents;
  /** `disponible − esporádicos`. Equal to `balance`, reached the long way. */
  margenCents: Cents;
}

export function waterfall(totals: MonthlyTotals, loggedCents: Cents): Waterfall {
  const disponibleCents = totals.inCents - totals.fijosCents - loggedCents;
  return {
    inCents: totals.inCents,
    fijosCents: totals.fijosCents,
    loggedCents,
    disponibleCents,
    esporadicosCents: totals.esporadicosCents,
    margenCents: disponibleCents - totals.esporadicosCents,
  };
}

// ── the cushion ──────────────────────────────────────────────────────────

export interface CushionLine {
  id: string;
  label: string;
  amountCents: Cents;
  hasAmount: boolean;
  note?: string;
}

export interface Cushion {
  /** The possibilities, biggest first: the list is read as "what am I covering". */
  lines: CushionLine[];
  /** Their sum. **This is the colchón target** — it is never stored (types.ts). */
  targetCents: Cents;
  /** Possibilities with no figure yet. The target can only rise. */
  missingCount: number;
  /** Savings left after moving in, against the target. */
  coveredCents: Cents;
  covered: boolean;
  /** Share of the target already behind you. `null` when there is no target. */
  percent: number | null;
}

/**
 * The colchón: what could go wrong, what it would cost, and whether the money
 * is there. The target is summed rather than typed, so it cannot drift from
 * the list that justifies it.
 *
 * `covered` is false when the target is zero, exactly as it was when the
 * target was a field: reporting "cubierto" against a goal of nothing is a
 * claim made out of missing data, not an achievement.
 */
export function cushion(entries: Entry[], savingsAfterUpfrontCents: Cents): Cushion {
  const lines: CushionLine[] = [];
  let targetCents = 0;
  let missingCount = 0;

  for (const entry of entries) {
    if (!isPossibility(entry)) continue;
    if (entry.hasAmount) targetCents += entry.amountCents;
    else missingCount += 1;
    const line: CushionLine = {
      id: entry.id,
      label: entry.label,
      amountCents: entry.amountCents,
      hasAmount: entry.hasAmount,
    };
    if (entry.note !== undefined) line.note = entry.note;
    lines.push(line);
  }

  lines.sort((a, b) => Number(b.hasAmount) - Number(a.hasAmount) || b.amountCents - a.amountCents);

  return {
    lines,
    targetCents,
    missingCount,
    coveredCents: savingsAfterUpfrontCents,
    covered: targetCents > 0 && savingsAfterUpfrontCents >= targetCents,
    percent: ratioPercent(Math.max(0, savingsAfterUpfrontCents), targetCents),
  };
}

// ── the upfront ledger ───────────────────────────────────────────────────

export interface UpfrontLine {
  id: string;
  label: string;
  amountCents: Cents;
  refundable: boolean;
  shouldNotPay: boolean;
  /** Set when the line aggregates several entries, e.g. essential furniture. */
  count?: number;
}

export interface Upfront {
  lines: UpfrontLine[];
  /** Everything due before you sleep there, fianza included. */
  cashCents: Cents;
  /** What comes back. */
  refundableCents: Cents;
  /** `cashCents − refundableCents` — the money you never see again. */
  spendCents: Cents;
  /** One-off rows still missing an amount. The total is only this honest. */
  missingCount: number;
}

/**
 * The ledger behind `dinero al entrar` and `gasto real`. Essential furniture
 * collapses into one line because that is how the decision is made — "muebles
 * esenciales, 620 €" — while every other one-off keeps its own row.
 */
export function upfront(entries: Entry[], furnitureLabel: string): Upfront {
  const lines: UpfrontLine[] = [];
  let furnitureCents = 0;
  let furnitureCount = 0;
  let missingCount = 0;

  for (const entry of entries) {
    const oneOff = entry.frequency === 'unico' && entry.direction === 'salida';
    if (oneOff && !entry.hasAmount && entry.status !== 'pagado' && entry.status !== 'pausado') {
      missingCount += 1;
    }
    if (!countsUpfront(entry)) continue;
    if (isFurniture(entry)) {
      furnitureCents += entry.amountCents;
      furnitureCount += 1;
      continue;
    }
    lines.push({
      id: entry.id,
      label: entry.label,
      amountCents: entry.amountCents,
      refundable: entry.refundable === true,
      shouldNotPay: false,
    });
  }

  if (furnitureCount > 0) {
    lines.push({
      id: 'muebles',
      label: furnitureLabel,
      amountCents: furnitureCents,
      refundable: false,
      shouldNotPay: false,
      count: furnitureCount,
    });
  }

  // Rows that exist to be seen rather than paid: agency fees are the
  // landlord's by law since 2023. Present, at zero, struck through — omitting
  // it leaves the user to be surprised, budgeting it legitimises it.
  for (const entry of entries) {
    if (entry.shouldNotPay !== true) continue;
    lines.push({
      id: entry.id,
      label: entry.label,
      amountCents: 0,
      refundable: false,
      shouldNotPay: true,
    });
  }

  let cashCents = 0;
  let refundableCents = 0;
  for (const line of lines) {
    if (line.shouldNotPay) continue;
    cashCents += line.amountCents;
    if (line.refundable) refundableCents += line.amountCents;
  }

  // Refundable first, because the fianza is the one line whose nature changes
  // what the two totals mean; the flagged rows last, because they are a lesson
  // rather than a cost. Everything between them by size.
  const rank = (line: UpfrontLine) => (line.refundable ? 0 : line.shouldNotPay ? 2 : 1);
  lines.sort((a, b) => rank(a) - rank(b) || b.amountCents - a.amountCents);

  return {
    lines,
    cashCents,
    refundableCents,
    spendCents: cashCents - refundableCents,
    missingCount,
  };
}

// ── breakdown ────────────────────────────────────────────────────────────

export interface CategorySlice {
  category: Category;
  monthlyCents: Cents;
  /** Share of monthly salidas. `null` when there are no salidas at all. */
  percent: number | null;
  /** Conceptos in this category with no amount yet — printed as `+N`. */
  missingCount: number;
  /** Every concepto here is paused: the row shows `pausado`, not a bar. */
  allPaused: boolean;
  /** How much of the bar came from the shopping log rather than an estimate. */
  loggedCents: Cents;
}

/**
 * Where the money goes. Salidas only — entradas are not a "share of" anything.
 *
 * `logged` is the shopping log rolled up by category (`purchases.byCategory`).
 * It goes into the same bars rather than into one of its own, because the
 * question the panel answers is where the money went, and the answer does not
 * depend on whether a figure was estimated or observed. It does count toward
 * the denominator, so the shares still add to a hundred.
 */
export function breakdown(entries: Entry[], logged: readonly CategorySpend[] = []): CategorySlice[] {
  const totals = new Map<Category, { cents: Cents; missing: number; active: number; rows: number; logged: Cents }>();
  const slot = (category: Category) =>
    totals.get(category) ?? { cents: 0, missing: 0, active: 0, rows: 0, logged: 0 };

  for (const entry of entries) {
    if (entry.direction !== 'salida' || entry.shouldNotPay === true) continue;
    // A possibility is not somewhere the money goes. Most are `unico` and would
    // fall out below anyway; this says so for the one tagged monthly.
    if (isPossibility(entry)) continue;
    if (!isRecurring(entry.frequency)) continue;
    const found = slot(entry.category);
    found.rows += 1;
    if (entry.status === 'pausado') {
      totals.set(entry.category, found);
      continue;
    }
    found.active += 1;
    if (!entry.hasAmount) {
      found.missing += 1;
    } else {
      const monthly = toMonthly(entry.amountCents, entry.frequency);
      if (monthly !== null) found.cents += monthly;
    }
    totals.set(entry.category, found);
  }

  for (const line of logged) {
    const found = slot(line.category);
    found.cents += line.monthlyCents;
    found.logged += line.monthlyCents;
    // Logged spending is by definition not paused: it already happened. A
    // category holding nothing but paused estimates plus a real shop is an
    // active category, and its bar has to draw.
    found.rows += line.count;
    found.active += line.count;
    totals.set(line.category, found);
  }

  let outCents = monthlyTotals(entries).outCents;
  for (const line of logged) outCents += line.monthlyCents;

  const slices: CategorySlice[] = [];
  for (const [category, found] of totals) {
    slices.push({
      category,
      monthlyCents: found.cents,
      percent: ratioPercent(found.cents, outCents),
      missingCount: found.missing,
      allPaused: found.active === 0 && found.rows > 0,
      loggedCents: found.logged,
    });
  }

  return slices.sort((a, b) => {
    if (a.allPaused !== b.allPaused) return a.allPaused ? 1 : -1;
    return b.monthlyCents - a.monthlyCents;
  });
}

// ── coverage ─────────────────────────────────────────────────────────────

export interface Coverage {
  withAmount: number;
  total: number;
}

export function coverage(entries: Entry[]): Coverage {
  let withAmount = 0;
  let total = 0;
  for (const entry of entries) {
    if (entry.shouldNotPay === true) continue;
    total += 1;
    if (entry.hasAmount) withAmount += 1;
  }
  return { withAmount, total };
}

// ── drift ────────────────────────────────────────────────────────────────

/**
 * Burn today against burn when the scenario was created: is this piso more
 * expensive than when I planned it? Reads the first revision of every entry,
 * which is why the history has to be append-only.
 *
 * `null` when nothing has been revised yet — a drift of zero would claim the
 * question has been asked and answered.
 */
export function drift(entries: Entry[]): Cents | null {
  let currentCents = 0;
  let originalCents = 0;
  let revised = false;

  for (const entry of entries) {
    if (!countsMonthly(entry) || entry.direction !== 'salida') continue;
    const now = toMonthly(entry.amountCents, entry.frequency);
    if (now === null) continue;
    currentCents += now;
    const first = entry.history.length > 0 ? entry.history[0] : null;
    if (first === null) {
      originalCents += now;
      continue;
    }
    if (entry.history.length > 1) revised = true;
    const then = toMonthly(first.amountCents, entry.frequency);
    originalCents += then === null ? now : then;
  }

  return revised ? currentCents - originalCents : null;
}

// ── the verdict, and the sixth KPI ───────────────────────────────────────

export type VerdictKind = 'sindatos' | 'ok' | 'justo' | 'falta';

/**
 * "Marginal" is a balance that survives on paper and not in life. Five percent
 * of monthly salidas is the line: below it, one ordinary month goes wrong and
 * the answer flips.
 */
const MARGINAL_SHARE_OF_OUT = 5;

export function verdict(totals: MonthlyTotals): VerdictKind {
  // Nothing in and nothing out is not a balanced budget, it is an empty one.
  // A zero balance here would render "te lo puedes permitir" on first launch,
  // which is the same lie as printing 0,00 € for a blank amount: a claim where
  // the honest answer is that the question has not been asked yet.
  if (totals.inCents === 0 && totals.outCents === 0) return 'sindatos';
  if (totals.balanceCents < 0) return 'falta';
  if (totals.balanceCents < percentOf(totals.outCents, MARGINAL_SHARE_OF_OUT)) return 'justo';
  return 'ok';
}

/**
 * The sixth KPI changes identity with the sign of the balance. The label
 * changes; the slot does not move. There is no `∞ meses` branch because there
 * is no branch where a positive balance reports runway.
 */
export type SixthKpi =
  | {
      kind: 'runway';
      /** `null` when there is nothing left after moving in — not infinity. */
      months: number | null;
      savingsAfterUpfrontCents: Cents;
      deficitCents: Cents;
    }
  | {
      kind: 'margin';
      balanceCents: Cents;
      /**
       * How many months of margin a 100 € surprise eats. Derived, not a price:
       * 100 € is a unit of measure here, and nothing in this repo hardcodes a
       * real-world figure.
       */
      monthsPerHundred: number | null;
    }
  | {
      kind: 'buffer';
      targetCents: Cents;
      covered: boolean;
      savingsAfterUpfrontCents: Cents;
    };

// ── the whole picture ────────────────────────────────────────────────────

export interface Derived {
  /**
   * Conceptos — everything that is not furniture and not a possibility. This is
   * the Costes grid, and possibilities are not in it: they have their own
   * section, because a list of things that might happen read as a list of costs
   * is exactly the confusion `kind` exists to end.
   */
  costes: Entry[];
  furniture: Entry[];
  /** The colchón: the possibilities, and the target they add up to. */
  cushion: Cushion;
  totals: MonthlyTotals;
  /** The balance in the order the money goes, rather than as one subtraction. */
  waterfall: Waterfall;
  upfront: Upfront;
  breakdown: CategorySlice[];
  coverage: Coverage;
  /** Savings left once the move is paid for. The fianza is spent, not burned. */
  savingsAfterUpfrontCents: Cents;
  runwayMonths: number | null;
  bufferCovered: boolean;
  /** Guideline only — a visible rule of thumb, never a gate on an input. */
  maxAffordableRentCents: Cents;
  driftCents: Cents | null;
  verdict: VerdictKind;
  /** How far short, per month. `0` unless the verdict is `falta`. */
  shortfallCents: Cents;
  /** Balance as a share of entradas. `null` when nothing comes in. */
  balanceShareOfIn: number | null;
  sixth: SixthKpi;
  /** The shopping log: what it totals, and what it costs per month. */
  spend: LoggedSpend;
  /** Categories where the log and a live estimate may be counting the same money. */
  overlaps: Overlap[];
}

/**
 * `todayDate` is a parameter and not a `new Date()` for the same reason
 * `projectProgress` takes one: the log's monthly figure is an average over the
 * days since the first purchase, so the answer depends on what day it is, and
 * `src/lib` is not allowed to know that on its own. It also means the figure
 * can be tested at all.
 */
export function derive(
  scenario: Scenario,
  settings: Settings,
  furnitureLabel: string,
  todayDate: IsoDate,
): Derived {
  const costes = scenario.entries.filter(
    (entry) => !isFurniture(entry) && !isPossibility(entry),
  );
  const furniture = scenario.entries.filter(isFurniture);

  const spend = loggedSpend(scenario.purchases, todayDate);
  const logged = byCategory(scenario.purchases, todayDate);
  const totals = withLogged(monthlyTotals(scenario.entries), spend.monthlyCents);
  const ledger = upfront(scenario.entries, furnitureLabel);
  const savingsAfterUpfrontCents = scenario.savingsCents - ledger.cashCents;
  const reserve = cushion(scenario.entries, savingsAfterUpfrontCents);
  const kind = verdict(totals);

  const deficitCents = totals.balanceCents < 0 ? -totals.balanceCents : 0;
  const runwayMonths =
    deficitCents > 0 && savingsAfterUpfrontCents > 0 ? savingsAfterUpfrontCents / deficitCents : null;

  let sixth: SixthKpi;
  if (kind === 'falta') {
    sixth = { kind: 'runway', months: runwayMonths, savingsAfterUpfrontCents, deficitCents };
  } else if (kind === 'justo') {
    sixth = {
      kind: 'margin',
      balanceCents: totals.balanceCents,
      monthsPerHundred: totals.balanceCents > 0 ? 10000 / totals.balanceCents : null,
    };
  } else {
    sixth = {
      kind: 'buffer',
      // Summed from the possibilities, never stored — so the target and the
      // list of what it covers cannot drift apart (types.ts).
      targetCents: reserve.targetCents,
      covered: reserve.covered,
      savingsAfterUpfrontCents,
    };
  }

  return {
    costes,
    furniture,
    cushion: reserve,
    totals,
    waterfall: waterfall(totals, spend.monthlyCents),
    upfront: ledger,
    breakdown: breakdown(scenario.entries, logged),
    coverage: coverage(costes),
    savingsAfterUpfrontCents,
    runwayMonths,
    bufferCovered: reserve.covered,
    maxAffordableRentCents: percentOf(totals.inCents, settings.maxRentPercent),
    driftCents: drift(scenario.entries),
    verdict: kind,
    shortfallCents: deficitCents,
    balanceShareOfIn: ratioPercent(totals.balanceCents, totals.inCents),
    sixth,
    spend,
    overlaps: overlaps(scenario.entries, scenario.purchases, todayDate),
  };
}

// ── Muebles ──────────────────────────────────────────────────────────────

export interface FurnitureTotals {
  /** Essentials still pending — the true minimum to move in. */
  minimumCents: Cents;
  minimumCount: number;
  /** Essentials plus deseables, everything still pending. */
  wholeListCents: Cents;
  /** Already bought. */
  paidCents: Cents;
  paidCount: number;
  /** Pending items with no price yet: the minimum can only rise. */
  missingPriceCount: number;
  total: number;
}

export function furnitureTotals(furniture: Entry[]): FurnitureTotals {
  let minimumCents = 0;
  let minimumCount = 0;
  let wholeListCents = 0;
  let paidCents = 0;
  let paidCount = 0;
  let missingPriceCount = 0;

  for (const item of furniture) {
    if (item.status === 'pagado') {
      paidCount += 1;
      if (item.hasAmount) paidCents += item.amountCents;
      continue;
    }
    if (item.status === 'pausado') continue;
    if (!item.hasAmount) {
      missingPriceCount += 1;
      continue;
    }
    wholeListCents += item.amountCents;
    if (item.priority === 'esencial') {
      minimumCents += item.amountCents;
      minimumCount += 1;
    }
  }

  return {
    minimumCents,
    minimumCount,
    wholeListCents,
    paidCents,
    paidCount,
    missingPriceCount,
    total: furniture.length,
  };
}

export interface RoomGroup {
  room: Room;
  items: Entry[];
  pendingCount: number;
  pendingCents: Cents;
  missingPriceCount: number;
  /** Already bought, in this room. */
  paidCents: Cents;
  /** Paid plus pending — the denominator of the room's progress strip.
   *  Priced items only: a room is not "0 % done" because nothing has a price. */
  totalCents: Cents;
}

/**
 * Furniture grouped by room, in the order the user's room list is in, so the
 * list does not reshuffle as items are ticked off.
 *
 * `roomIds` is passed in rather than read from a constant because the rooms
 * are the user's to edit. An article whose room has been binned lands in the
 * fallback group instead of vanishing — a wardrobe with nowhere to go is
 * still a wardrobe you have to buy.
 *
 * `onlyEssential` is the control that answers the question this tab exists
 * for — the true minimum to move in — which is why it is promoted out of the
 * chip row and into the panel header.
 */
export function furnitureByRoom(
  furniture: Entry[],
  roomIds: readonly Room[],
  onlyEssential: boolean,
): RoomGroup[] {
  const groups = new Map<Room, RoomGroup>();
  for (const room of roomIds) {
    groups.set(room, {
      room,
      items: [],
      pendingCount: 0,
      pendingCents: 0,
      missingPriceCount: 0,
      paidCents: 0,
      totalCents: 0,
    });
  }

  for (const item of furniture) {
    if (onlyEssential && item.priority !== 'esencial') continue;
    const group = groups.get(item.room ?? FALLBACK_ROOM) ?? groups.get(FALLBACK_ROOM);
    if (group === undefined) continue;
    group.items.push(item);
    if (item.status === 'pagado') {
      if (item.hasAmount) {
        group.paidCents += item.amountCents;
        group.totalCents += item.amountCents;
      }
      continue;
    }
    if (item.status === 'pausado') continue;
    group.pendingCount += 1;
    if (item.hasAmount) {
      group.pendingCents += item.amountCents;
      group.totalCents += item.amountCents;
    } else {
      group.missingPriceCount += 1;
    }
  }

  return [...groups.values()].filter((group) => group.items.length > 0);
}

// ── Proyectos ────────────────────────────────────────────────────────────

export interface ProjectProgress {
  spentCents: Cents;
  itemCount: number;
  pendingCount: number;
  /** Share of the budget already committed. `null` if the budget is zero. */
  moneyPercent: number | null;
  /** Share of the window already elapsed. `null` if the dates are degenerate. */
  timePercent: number | null;
  overBudget: boolean;
}

/**
 * A project is late in two independent ways, so both get a bar. Money bar
 * ahead of the time bar means overspending; behind means stalled. That
 * relationship is the whole readout.
 */
export function projectProgress(
  entries: Entry[],
  projectId: string,
  budgetCents: Cents,
  startDate: string,
  targetDate: string,
  todayDate: string,
): ProjectProgress {
  let spentCents = 0;
  let itemCount = 0;
  let pendingCount = 0;
  for (const entry of entries) {
    if (entry.projectId !== projectId) continue;
    itemCount += 1;
    if (entry.status === 'pagado') {
      if (entry.hasAmount) spentCents += entry.amountCents;
    } else if (entry.status !== 'pausado') {
      pendingCount += 1;
    }
  }

  const start = Date.parse(startDate);
  const end = Date.parse(targetDate);
  const now = Date.parse(todayDate);
  const span = end - start;
  const timePercent =
    Number.isNaN(span) || span <= 0 ? null : Math.min(100, Math.max(0, ((now - start) / span) * 100));

  return {
    spentCents,
    itemCount,
    pendingCount,
    moneyPercent: ratioPercent(spentCents, budgetCents),
    timePercent,
    overBudget: spentCents > budgetCents,
  };
}

export type ProjectVerdict = 'notStarted' | 'over' | 'tight' | 'stalled' | 'onTrack';

/**
 * Reading the two bars against each other: money ahead of time is
 * overspending, money behind time is stalled. Everything else is on track.
 */
export function projectVerdict(progress: ProjectProgress): ProjectVerdict {
  if (progress.overBudget) return 'over';
  const money = progress.moneyPercent;
  const time = progress.timePercent;
  if (money === null || time === null) return money === null || money === 0 ? 'notStarted' : 'onTrack';
  if (money === 0 && time < 10) return 'notStarted';
  if (money > time + 15) return 'tight';
  if (time > money + 25) return 'stalled';
  return 'onTrack';
}

// ── Comparar ─────────────────────────────────────────────────────────────

/**
 * Conceptos that carry the same label and the same monthly equivalent in every
 * scenario. They collapse into one muted line so the differences are the only
 * thing on screen — three flats then fit where forty identical rows would not.
 */
export function identicalConcepts(scenarios: Scenario[]): number {
  if (scenarios.length < 2) return 0;
  const monthlyByLabel = scenarios.map((scenario) => {
    const map = new Map<string, Cents | null>();
    for (const entry of scenario.entries) {
      if (isFurniture(entry)) continue;
      const monthly = countsMonthly(entry) ? toMonthly(entry.amountCents, entry.frequency) : null;
      map.set(entry.label, monthly);
    }
    return map;
  });

  const [first, ...rest] = monthlyByLabel;
  let identical = 0;
  for (const [label, monthly] of first) {
    if (rest.every((map) => map.has(label) && map.get(label) === monthly)) identical += 1;
  }
  return identical;
}
