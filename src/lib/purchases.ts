/**
 * The shopping log — what was actually bought, and what that works out at per
 * month. Pure functions over plain data, like the rest of `src/lib` (IND007).
 *
 * The three decisions this module is built on, because each of them is easy to
 * undo by accident and each of them changes the headline figure:
 *
 *   · **The monthly figure is a daily average, scaled.** Total logged, divided
 *     by the days from the first purchase to today, times the length of a
 *     month. Not "this calendar month", which would collapse to near zero every
 *     first of the month and report a lie for a week; and not "the last
 *     complete month", which reports nothing at all until one has passed. The
 *     average is also the only one of the three that survives sparse logging —
 *     nobody buys something every day, and the gaps are part of the answer.
 *
 *   · **The window ends today, not at the last purchase.** Three weeks of
 *     silence after the last shop is three weeks of not spending, and dividing
 *     by the span between purchases would quietly delete them.
 *
 *   · **A purchase with no amount is missing, not free.** Same rule the blank
 *     estimate follows: a dash is an admission, a zero is a claim (types.ts).
 *
 * It is a log of spending, which the price history deliberately is not — see
 * `history.ts`. The two never mix: revising an estimate is a forecast changing
 * its mind, and it belongs to the concepto it revises.
 */
import type { Category, Cents, Entry, IsoDate, Purchase } from '../types';
import { isRecurring, toMonthly } from './frequency';

/**
 * The length of a month in days, as the exact fraction 365.25 / 12 = 1461 / 48.
 * Kept as two integers so no amount is ever multiplied by a decimal (IND001),
 * and so the scaling rounds exactly once.
 */
const MONTH_DAYS_NUM = 1461;
const MONTH_DAYS_DEN = 48;

/** What the UI prints beside the figure. The arithmetic above, to one decimal. */
export const MONTH_DAYS_LABEL = '30,4';

const MS_PER_DAY = 86400000;

/**
 * Below this many days logged, the monthly figure is labelled provisional: one
 * big shop inside a five-day window scales to something absurd, and the figure
 * only starts meaning anything once it has seen a whole month of ordinary life.
 */
const SETTLED_DAYS = 30;

// ── dates ────────────────────────────────────────────────────────────────

/**
 * Days from `from` to `to`, counting both ends — one purchase today is one day
 * of data, not zero, or the very first shop divides by nothing.
 *
 * Both sides parse as UTC midnight, so the difference is exact whichever side
 * of a DST change they fall on. `null` for anything unparseable, which is what
 * a hand-edited export can carry.
 */
export function daysInclusive(from: IsoDate, to: IsoDate): number | null {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / MS_PER_DAY) + 1;
}

/** The later of two ISO dates. String order is date order for `YYYY-MM-DD`. */
function laterOf(a: IsoDate, b: IsoDate): IsoDate {
  return a > b ? a : b;
}

/** `2026-08-15` → `2026-08`. The month a date falls in. */
export function monthOf(date: IsoDate): string {
  return date.slice(0, 7);
}

// ── the amount ───────────────────────────────────────────────────────────

/** Zero means "not typed yet" — see `Purchase.amountCents`. */
export function hasAmount(purchase: Purchase): boolean {
  return purchase.amountCents > 0;
}

/**
 * A plain sum of what a list of purchases cost. Safe to add without
 * normalising, unlike an Entry: a purchase happened once, on one day, and has
 * no frequency to mix (IND004 does not apply here).
 */
export function sumAmounts(purchases: readonly Purchase[]): Cents {
  let total = 0;
  for (const purchase of purchases) total += purchase.amountCents;
  return total;
}

/**
 * A total spent over `days`, as a monthly equivalent. One rounding, at the end,
 * on integer cents.
 */
export function toMonthlyRate(totalCents: Cents, days: number): Cents {
  if (days <= 0) return 0;
  return Math.round((totalCents * MONTH_DAYS_NUM) / (days * MONTH_DAYS_DEN));
}

// ── the window ───────────────────────────────────────────────────────────

export interface LogWindow {
  firstDate: IsoDate | null;
  lastDate: IsoDate | null;
  /** First purchase → today, inclusive. `0` when nothing is logged. */
  days: number;
}

/**
 * The span the average is taken over. A purchase dated in the future — a
 * mistyped year, mostly — extends the window rather than shrinking it below
 * one day, so a fat finger cannot inflate the monthly figure.
 */
export function logWindow(purchases: readonly Purchase[], todayDate: IsoDate): LogWindow {
  let firstDate: IsoDate | null = null;
  let lastDate: IsoDate | null = null;
  for (const purchase of purchases) {
    if (!hasAmount(purchase)) continue;
    if (firstDate === null || purchase.date < firstDate) firstDate = purchase.date;
    if (lastDate === null || purchase.date > lastDate) lastDate = purchase.date;
  }
  if (firstDate === null || lastDate === null) return { firstDate: null, lastDate: null, days: 0 };
  const days = daysInclusive(firstDate, laterOf(todayDate, lastDate));
  return { firstDate, lastDate, days: days === null || days < 1 ? 1 : days };
}

// ── the headline figures ─────────────────────────────────────────────────

export interface LoggedSpend {
  /** Everything logged, in full. Not a monthly figure. */
  totalCents: Cents;
  /** Purchases with an amount. */
  count: number;
  /** Rows added and never filled in. They are in no total. */
  missingCount: number;
  /** Distinct products, by normalised name. */
  productCount: number;
  firstDate: IsoDate | null;
  lastDate: IsoDate | null;
  days: number;
  perDayCents: Cents;
  /** The daily average scaled to a month. This is what enters `monthlyOut`. */
  monthlyCents: Cents;
  /** Under a month of data: the figure is real, but it has not settled. */
  provisional: boolean;
  /** This calendar month so far — shown beside the average, never instead of it. */
  thisMonthCents: Cents;
}

export function loggedSpend(purchases: readonly Purchase[], todayDate: IsoDate): LoggedSpend {
  const { firstDate, lastDate, days } = logWindow(purchases, todayDate);
  const currentMonth = monthOf(todayDate);
  const products = new Set<string>();

  let totalCents = 0;
  let count = 0;
  let missingCount = 0;
  let thisMonthCents = 0;

  for (const purchase of purchases) {
    if (!hasAmount(purchase)) {
      missingCount += 1;
      continue;
    }
    totalCents += purchase.amountCents;
    count += 1;
    products.add(productKey(purchase.product));
    if (monthOf(purchase.date) === currentMonth) thisMonthCents += purchase.amountCents;
  }

  return {
    totalCents,
    count,
    missingCount,
    productCount: products.size,
    firstDate,
    lastDate,
    days,
    perDayCents: days > 0 ? Math.round(totalCents / days) : 0,
    monthlyCents: toMonthlyRate(totalCents, days),
    provisional: days > 0 && days < SETTLED_DAYS,
    thisMonthCents,
  };
}

// ── by product ───────────────────────────────────────────────────────────

/**
 * What counts as the same product. Case and spacing only: "Leche" and "leche "
 * are one line, "Leche entera" is another. Nothing cleverer, because a stemmer
 * that decides "tomates" and "tomate" are the same thing will eventually decide
 * two things that are not.
 */
export function productKey(product: string): string {
  return product.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface ProductLine {
  key: string;
  /** The most recent spelling — renaming the newest row renames the group. */
  product: string;
  totalCents: Cents;
  count: number;
  averageCents: Cents;
  /** Scaled over the *whole* log's window, so the lines sum to the headline. */
  monthlyCents: Cents;
  /** Share of everything logged. `null` when nothing is. */
  percent: number | null;
  lastDate: IsoDate;
}

/**
 * The log rolled up by product, biggest spend first — the question the log
 * exists to answer.
 *
 * Every line is scaled over the same window as the headline figure, not over
 * its own first-to-today span. Otherwise a bag of ice bought yesterday would
 * report as thirty bags a month, and the lines would not add up to the total
 * they are a breakdown of.
 */
export function byProduct(purchases: readonly Purchase[], todayDate: IsoDate): ProductLine[] {
  const { days } = logWindow(purchases, todayDate);
  const groups = new Map<string, ProductLine>();
  let totalCents = 0;

  for (const purchase of purchases) {
    if (!hasAmount(purchase)) continue;
    totalCents += purchase.amountCents;
    const key = productKey(purchase.product);
    const found = groups.get(key);
    if (found === undefined) {
      groups.set(key, {
        key,
        product: purchase.product.trim(),
        totalCents: purchase.amountCents,
        count: 1,
        averageCents: purchase.amountCents,
        monthlyCents: 0,
        percent: null,
        lastDate: purchase.date,
      });
      continue;
    }
    found.totalCents += purchase.amountCents;
    found.count += 1;
    if (purchase.date >= found.lastDate) {
      found.lastDate = purchase.date;
      found.product = purchase.product.trim();
    }
  }

  const lines = [...groups.values()];
  for (const line of lines) {
    line.averageCents = Math.round(line.totalCents / line.count);
    line.monthlyCents = toMonthlyRate(line.totalCents, days);
    line.percent = totalCents === 0 ? null : (line.totalCents / totalCents) * 100;
  }
  return lines.sort((a, b) => b.totalCents - a.totalCents || a.key.localeCompare(b.key));
}

// ── by category ──────────────────────────────────────────────────────────

export interface CategorySpend {
  category: Category;
  totalCents: Cents;
  monthlyCents: Cents;
  count: number;
}

/**
 * The log rolled up by category, which is how it reaches the breakdown on
 * Resumen. Each line rounds on its own, exactly as `toMonthly()` does per
 * entry, so the parts can sit a cent off the whole — the same cent the rest of
 * the app has always been willing to lose.
 */
export function byCategory(purchases: readonly Purchase[], todayDate: IsoDate): CategorySpend[] {
  const { days } = logWindow(purchases, todayDate);
  const groups = new Map<Category, CategorySpend>();

  for (const purchase of purchases) {
    if (!hasAmount(purchase)) continue;
    const found = groups.get(purchase.category);
    if (found === undefined) {
      groups.set(purchase.category, {
        category: purchase.category,
        totalCents: purchase.amountCents,
        monthlyCents: 0,
        count: 1,
      });
      continue;
    }
    found.totalCents += purchase.amountCents;
    found.count += 1;
  }

  const lines = [...groups.values()];
  for (const line of lines) line.monthlyCents = toMonthlyRate(line.totalCents, days);
  return lines.sort((a, b) => b.totalCents - a.totalCents);
}

// ── the double-count guard ───────────────────────────────────────────────

export interface Overlap {
  category: Category;
  loggedMonthlyCents: Cents;
  /** What the still-active estimates in the same category claim, per month. */
  estimateMonthlyCents: Cents;
  entryIds: string[];
}

/**
 * Categories where the log and a live estimate are both counting — "Compra
 * semanal, 200 €/mes" sitting in Alimentación while the same food is being
 * logged item by item.
 *
 * The log **adds** to the monthly total; it does not replace anything, and it
 * never silently pauses a row someone typed. So the app's whole defence against
 * counting the weekly shop twice is this list, the warning it draws, and the
 * one button that pauses the estimates it names. If this function goes quiet,
 * the total goes wrong and nothing says so.
 *
 * Paused, blank and `shouldNotPay` rows are already out of every total, so they
 * cannot be duplicating anything and are not reported.
 */
export function overlaps(
  entries: readonly Entry[],
  purchases: readonly Purchase[],
  todayDate: IsoDate,
): Overlap[] {
  const logged = byCategory(purchases, todayDate);
  if (logged.length === 0) return [];

  const found: Overlap[] = [];
  for (const line of logged) {
    let estimateMonthlyCents = 0;
    const entryIds: string[] = [];
    for (const entry of entries) {
      if (entry.category !== line.category) continue;
      if (entry.direction !== 'salida' || entry.room !== undefined) continue;
      if (entry.status === 'pausado' || entry.shouldNotPay === true || !entry.hasAmount) continue;
      if (!isRecurring(entry.frequency)) continue;
      const monthly = toMonthly(entry.amountCents, entry.frequency);
      if (monthly === null) continue;
      estimateMonthlyCents += monthly;
      entryIds.push(entry.id);
    }
    if (entryIds.length > 0) {
      found.push({
        category: line.category,
        loggedMonthlyCents: line.monthlyCents,
        estimateMonthlyCents,
        entryIds,
      });
    }
  }
  return found;
}
