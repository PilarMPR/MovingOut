import { describe, expect, it } from 'vitest';
import {
  formatEUR,
  formatMonths,
  formatPercent,
  formatSignedEUR,
  parseAmount,
  percentOf,
  ratioPercent,
  splitEUR,
  toEditableString,
} from './money';

const nbsp = (s: string) => s.replace(/ /g, ' ');

describe('parseAmount', () => {
  it('reads the Spanish decimal comma', () => {
    expect(parseAmount('330,50')).toBe(33050);
    expect(parseAmount('0,05')).toBe(5);
  });

  it('reads a thousands separator without losing the thousands', () => {
    // The classic parseFloat bug: '1.695' becomes 1, and 1,00 € is a plausible
    // enough number that nobody notices (IND001).
    expect(parseAmount('1.695')).toBe(169500);
    expect(parseAmount('1.695,50')).toBe(169550);
    expect(parseAmount('1,695.50')).toBe(169550);
  });

  it('reads a plain dot decimal too', () => {
    expect(parseAmount('1695.50')).toBe(169550);
    expect(parseAmount('12.5')).toBe(1250);
  });

  it('strips the currency symbol and whitespace', () => {
    expect(parseAmount('  1.695,50 €  ')).toBe(169550);
  });

  it('returns null for a blank, because a blank is not a zero', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('   ')).toBeNull();
    expect(parseAmount('— —')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });

  it('treats a lone comma as decimal, because this is an es-ES app', () => {
    // `12,999` is thirteen euros, not twelve thousand. Only a lone *dot* is
    // ambiguous, and there a trailing group of three digits reads as thousands.
    expect(parseAmount('12,999')).toBe(1300);
    expect(parseAmount('12.999')).toBe(1299900);
  });

  it('always returns whole cents', () => {
    expect(parseAmount('7,7')).toBe(770);
    expect(Number.isInteger(parseAmount('7,7') ?? 0)).toBe(true);
    expect(Number.isInteger(parseAmount('0,005') ?? 0)).toBe(true);
  });

  it('round-trips through the editable string', () => {
    for (const cents of [0, 5, 99, 100, 169550, 1234567]) {
      expect(parseAmount(toEditableString(cents))).toBe(cents);
    }
  });
});

describe('formatting', () => {
  it('formats euros the Spanish way', () => {
    expect(nbsp(formatEUR(169550))).toBe('1695,50 €');
    expect(nbsp(formatEUR(0))).toBe('0,00 €');
  });

  it('groups thousands the way es-ES actually does, from five digits up', () => {
    // Spanish does not separate a four-digit number: 1695,00 €, but 16.950,00 €.
    // Worth pinning, because hand-rolling the separator is how you get it wrong,
    // and this app renders four-figure upfront totals constantly.
    expect(nbsp(formatEUR(999900))).toBe('9999,00 €');
    expect(nbsp(formatEUR(1000000))).toBe('10.000,00 €');
  });

  it('uses a real minus sign and an explicit plus', () => {
    expect(nbsp(formatSignedEUR(8800))).toBe('+88,00 €');
    expect(nbsp(formatSignedEUR(-34000))).toBe('−340,00 €');
    expect(nbsp(formatSignedEUR(0))).toBe('0,00 €');
  });

  it('splits into a display part and a decimals part', () => {
    expect(splitEUR(169550)).toEqual({ big: '1695', small: ',50 €' });
    expect(splitEUR(1000000)).toEqual({ big: '10.000', small: ',00 €' });
    expect(splitEUR(8800, true)).toEqual({ big: '+88', small: ',00 €' });
    expect(splitEUR(-34000)).toEqual({ big: '−340', small: ',00 €' });
    expect(splitEUR(5)).toEqual({ big: '0', small: ',05 €' });
  });

  it('keeps one decimal on small percentages only', () => {
    expect(nbsp(formatPercent(12.4))).toBe('12 %');
    expect(nbsp(formatPercent(2.53))).toBe('2,5 %');
  });

  it('formats months to one decimal', () => {
    expect(formatMonths(9.44)).toBe('9,4');
  });
});

describe('percentages', () => {
  it('stays in integer cents', () => {
    expect(percentOf(73000, 32)).toBe(23360);
    expect(Number.isInteger(percentOf(73000, 33.3))).toBe(true);
  });

  it('guards the zero denominator so no KPI renders NaN', () => {
    expect(ratioPercent(340, 0)).toBeNull();
    expect(ratioPercent(340, 730)).toBeCloseTo(46.575, 3);
  });
});
