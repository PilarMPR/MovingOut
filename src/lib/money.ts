/**
 * Money. Integer cents in, formatted strings out (IND001).
 *
 * Floats lose money at the third addition, so nothing here ever does float
 * arithmetic on an amount. Formatting happens only at the edges, and only
 * through Intl — a hand-rolled `,` swap gets the thousands separator wrong
 * for exactly the values that matter.
 */
import type { Cents } from '../types';

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const PLAIN = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const INT = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

/** `133000` → `"1.330,00 €"`. */
export function formatEUR(cents: Cents): string {
  return EUR.format(cents / 100);
}

/** `133000` → `"1.330,00"`. No symbol, for a cell that already has a column header. */
export function formatPlain(cents: Cents): string {
  return PLAIN.format(cents / 100);
}

/** `-34000` → `"−340,00 €"`, with a real minus sign and an explicit `+`. */
export function formatSignedEUR(cents: Cents): string {
  if (cents === 0) return EUR.format(0);
  const sign = cents > 0 ? '+' : '−';
  return sign + EUR.format(Math.abs(cents) / 100);
}

/**
 * Split for the display face: the big part and the small part.
 * `88000` → `{ big: '880', small: ',00 €' }` — the KPI renders them at
 * different sizes, so the decimals never compete with the number.
 */
export function splitEUR(cents: Cents, signed = false): { big: string; small: string } {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const rest = abs % 100;
  const sign = negative ? '−' : signed ? '+' : '';
  return {
    big: sign + INT.format(whole),
    small: ',' + String(rest).padStart(2, '0') + ' €',
  };
}

/** A percentage of a cents amount, still in integer cents. */
export function percentOf(cents: Cents, percent: number): Cents {
  return Math.round((cents * percent) / 100);
}

/** `340` of `730` → `47`. Guards the zero denominator so no KPI renders `NaN`. */
export function ratioPercent(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return (part / whole) * 100;
}

/** `12.4` → `"12 %"`, `0.6` → `"0,6 %"`. One decimal only below 10. */
export function formatPercent(value: number): string {
  const abs = Math.abs(value);
  const digits = abs < 10 && abs > 0 ? 1 : 0;
  const fmt = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return fmt.format(value) + ' %';
}

export function formatSignedPercent(value: number): string {
  if (value === 0) return formatPercent(0);
  return (value > 0 ? '+' : '−') + formatPercent(Math.abs(value));
}

/** `9.42` → `"9,4"`. Months of runway, one decimal. */
export function formatMonths(months: number): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(months);
}

/**
 * Parse what a person types into integer cents. Accepts `1.695,50`, `1695,5`,
 * `1695.50`, `1 695,50` and `1.695,50 €`; returns `null` for anything empty or
 * unreadable, because an unreadable amount is a blank, not a zero.
 *
 * Deliberately not parseFloat: it stops at the first thousands separator and
 * returns `1` for `1.695`, which is a plausible-looking wrong answer (IND001).
 */
export function parseAmount(input: string): Cents | null {
  const cleaned = input.replace(/[^\d.,-]/g, '').trim();
  if (cleaned === '' || cleaned === '-') return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const sepAt = Math.max(lastComma, lastDot);
  const both = lastComma !== -1 && lastDot !== -1;

  let whole = cleaned;
  let fraction = '';
  if (sepAt !== -1) {
    const tail = cleaned.slice(sepAt + 1);
    // With both separators present the last one is the decimal point, whichever
    // convention the user typed: `1.695,50` and `1,695.50` are the same money.
    //
    // With only one, a comma is *always* decimal here — this is an es-ES app,
    // and `12,999` means thirteen euros. A lone dot is the ambiguous case, so a
    // trailing group of exactly three digits reads as thousands (`1.695`) and
    // anything else as a decimal point (`12.5`).
    const isDecimal = both || sepAt === lastComma || tail.length !== 3;
    if (isDecimal) {
      whole = cleaned.slice(0, sepAt);
      fraction = tail;
    }
  }

  const digitsOnly = whole.replace(/[.,\s]/g, '');
  const negative = digitsOnly.startsWith('-');
  const magnitude = digitsOnly.replace(/-/g, '');
  if (magnitude === '' && fraction === '') return null;
  if (!/^\d*$/.test(magnitude) || !/^\d*$/.test(fraction)) return null;

  const units = magnitude === '' ? 0 : Number(magnitude);
  const cents = Math.round(Number('0.' + (fraction === '' ? '0' : fraction)) * 100);
  const total = units * 100 + cents;
  return negative ? -total : total;
}

/** What an editable cell shows once it takes focus: the raw number, no symbol. */
export function toEditableString(cents: Cents): string {
  return PLAIN.format(cents / 100);
}
