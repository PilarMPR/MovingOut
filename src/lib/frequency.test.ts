import { describe, expect, it } from 'vitest';
import { divisorLabel, isRecurring, periodMonths, toMonthly } from './frequency';

describe('toMonthly', () => {
  it('leaves a monthly amount alone', () => {
    expect(toMonthly(33000, 'mensual')).toBe(33000);
  });

  it('halves the bimonthly bill — the common Spanish trap', () => {
    expect(toMonthly(5800, 'bimestral')).toBe(2900);
  });

  it('spreads quarterly and annual costs', () => {
    expect(toMonthly(9000, 'trimestral')).toBe(3000);
    expect(toMonthly(9600, 'anual')).toBe(800);
  });

  it('returns null for a one-off rather than amortising it', () => {
    // A one-off belongs in upfrontCash. Spreading it over twelve months would
    // hide the fact that all of it is due on day one.
    expect(toMonthly(18000, 'unico')).toBeNull();
  });

  it('stays in whole cents', () => {
    expect(toMonthly(100, 'trimestral')).toBe(33);
    expect(Number.isInteger(toMonthly(9999, 'anual') ?? 0)).toBe(true);
  });
});

describe('labels', () => {
  it('annotates only the frequencies that were actually divided', () => {
    expect(divisorLabel('mensual')).toBe('');
    expect(divisorLabel('unico')).toBe('');
    expect(divisorLabel('bimestral')).toBe('÷2');
    expect(divisorLabel('trimestral')).toBe('÷3');
    expect(divisorLabel('anual')).toBe('÷12');
  });

  it('knows what repeats', () => {
    expect(isRecurring('anual')).toBe(true);
    expect(isRecurring('unico')).toBe(false);
    expect(periodMonths('unico')).toBeNull();
  });
});
