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
 */
import type { Cents, Category, Entry, Room, Scenario, Settings } from '../types';
import { ROOMS } from '../types';
import { isRecurring, toMonthly } from './frequency';
import { percentOf, ratioPercent } from './money';

// ── which entries count where ────────────────────────────────────────────

/** Furniture lives in Muebles; everything else is a Costes concepto. */
export function isFurniture(entry: Entry): boolean {
  return entry.room !== undefined;
}

/**
 * Counts toward a monthly total. `pausado` is the deliberate exclusion;
 * `pendiente` still counts, because an annual insurance premium you have not
 * paid yet is still a cost of living there.
 */
export function countsMonthly(entry: Entry): boolean {
  return (
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
}

/** Frequency-normalised totals per direction. Everything goes via toMonthly(). */
export function monthlyTotals(entries: Entry[]): MonthlyTotals {
  let inCents = 0;
  let outCents = 0;
  let inCount = 0;
  let outCount = 0;
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
    }
  }
  return { inCents, outCents, balanceCents: inCents - outCents, inCount, outCount };
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
}

/** Where the money goes. Salidas only — entradas are not a "share of" anything. */
export function breakdown(entries: Entry[]): CategorySlice[] {
  const totals = new Map<Category, { cents: Cents; missing: number; active: number; rows: number }>();

  for (const entry of entries) {
    if (entry.direction !== 'salida' || entry.shouldNotPay === true) continue;
    if (!isRecurring(entry.frequency)) continue;
    const slot = totals.get(entry.category) ?? { cents: 0, missing: 0, active: 0, rows: 0 };
    slot.rows += 1;
    if (entry.status === 'pausado') {
      totals.set(entry.category, slot);
      continue;
    }
    slot.active += 1;
    if (!entry.hasAmount) {
      slot.missing += 1;
    } else {
      const monthly = toMonthly(entry.amountCents, entry.frequency);
      if (monthly !== null) slot.cents += monthly;
    }
    totals.set(entry.category, slot);
  }

  const outCents = monthlyTotals(entries).outCents;
  const slices: CategorySlice[] = [];
  for (const [category, slot] of totals) {
    slices.push({
      category,
      monthlyCents: slot.cents,
      percent: ratioPercent(slot.cents, outCents),
      missingCount: slot.missing,
      allPaused: slot.active === 0 && slot.rows > 0,
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
  /** Conceptos — everything that is not furniture. */
  costes: Entry[];
  furniture: Entry[];
  totals: MonthlyTotals;
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
}

export function derive(scenario: Scenario, settings: Settings, furnitureLabel: string): Derived {
  const costes = scenario.entries.filter((entry) => !isFurniture(entry));
  const furniture = scenario.entries.filter(isFurniture);

  const totals = monthlyTotals(scenario.entries);
  const ledger = upfront(scenario.entries, furnitureLabel);
  const savingsAfterUpfrontCents = scenario.savingsCents - ledger.cashCents;
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
      targetCents: scenario.buffer.targetCents,
      // No target is not a covered target. Reporting "cubierto" against a goal
      // of zero would be another claim made out of missing data.
      covered: scenario.buffer.targetCents > 0 && savingsAfterUpfrontCents >= scenario.buffer.targetCents,
      savingsAfterUpfrontCents,
    };
  }

  return {
    costes,
    furniture,
    totals,
    upfront: ledger,
    breakdown: breakdown(scenario.entries),
    coverage: coverage(costes),
    savingsAfterUpfrontCents,
    runwayMonths,
    bufferCovered: savingsAfterUpfrontCents >= scenario.buffer.targetCents,
    maxAffordableRentCents: percentOf(totals.inCents, settings.maxRentPercent),
    driftCents: drift(scenario.entries),
    verdict: kind,
    shortfallCents: deficitCents,
    balanceShareOfIn: ratioPercent(totals.balanceCents, totals.inCents),
    sixth,
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
}

/**
 * Furniture grouped by room, in the fixed room order so the list does not
 * reshuffle as items are ticked off.
 *
 * `onlyEssential` is the control that answers the question this tab exists
 * for — the true minimum to move in — which is why it is promoted out of the
 * chip row and into the panel header.
 */
export function furnitureByRoom(furniture: Entry[], onlyEssential: boolean): RoomGroup[] {
  const groups = new Map<Room, RoomGroup>();
  for (const room of ROOMS) {
    groups.set(room, { room, items: [], pendingCount: 0, pendingCents: 0, missingPriceCount: 0 });
  }

  for (const item of furniture) {
    if (onlyEssential && item.priority !== 'esencial') continue;
    const group = groups.get(item.room ?? 'otros');
    if (group === undefined) continue;
    group.items.push(item);
    if (item.status === 'pagado' || item.status === 'pausado') continue;
    group.pendingCount += 1;
    if (item.hasAmount) {
      group.pendingCents += item.amountCents;
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
