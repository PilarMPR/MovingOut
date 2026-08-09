/**
 * Frequency normalisation — the only place a bimonthly bill becomes a monthly
 * figure (IND004).
 *
 * Entries store their *real* frequency, because that is the number the user
 * knows: water and gas are billed every two months in Spain and insurance
 * annually. A budget that assumes everything is monthly is wrong before it
 * starts, and it is wrong quietly.
 */
import type { Cents, Frequency } from '../types';

/** How many months one billing period covers. `unico` has no period at all. */
const MONTHS_PER_PERIOD: Record<Frequency, number | null> = {
  mensual: 1,
  bimestral: 2,
  trimestral: 3,
  anual: 12,
  unico: null,
};

/**
 * The monthly equivalent of one amount, or `null` when the question does not
 * apply. `null` means "this does not belong in a monthly total" — a one-off
 * belongs in `upfrontCash`, and amortising it across twelve months would hide
 * the fact that all of it is due on day one.
 */
export function toMonthly(amountCents: Cents, frequency: Frequency): Cents | null {
  const months = MONTHS_PER_PERIOD[frequency];
  if (months === null) return null;
  return Math.round(amountCents / months);
}

/** `true` for anything that repeats. */
export function isRecurring(frequency: Frequency): boolean {
  return MONTHS_PER_PERIOD[frequency] !== null;
}

/**
 * The faint annotation between IMPORTE and EQUIV. MENSUAL: `÷2`, `÷12`.
 * Empty for monthly and for one-offs, where there is nothing to explain.
 */
export function divisorLabel(frequency: Frequency): string {
  const months = MONTHS_PER_PERIOD[frequency];
  if (months === null || months === 1) return '';
  return '÷' + String(months);
}

export function periodMonths(frequency: Frequency): number | null {
  return MONTHS_PER_PERIOD[frequency];
}
