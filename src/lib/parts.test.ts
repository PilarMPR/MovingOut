import { describe, expect, it } from 'vitest';
import { desgloseTotals, partsOf, partsTotal, summarise } from './parts';
import { monthlyTotals, upfront } from './derive';
import type { Entry, Part } from '../types';

const MUEBLES = 'Muebles esenciales';

let n = 0;
function entry(patch: Partial<Entry> = {}): Entry {
  n += 1;
  return {
    id: `e${n}`,
    label: `concepto ${n}`,
    direction: 'salida',
    category: 'otros',
    frequency: 'mensual',
    priority: 'esencial',
    status: 'activo',
    kind: 'fijo',
    amountCents: 0,
    hasAmount: false,
    history: [],
    ...patch,
  };
}

let p = 0;
function part(amountCents: number | null, label = ''): Part {
  p += 1;
  return {
    id: `p${p}`,
    label: label === '' ? `parte ${p}` : label,
    amountCents: amountCents ?? 0,
    hasAmount: amountCents !== null,
  };
}

describe('partsOf', () => {
  it('treats absent and empty as the same thing', () => {
    expect(partsOf(entry())).toEqual([]);
    expect(partsOf(entry({ parts: [] }))).toEqual([]);
  });
});

describe('partsTotal', () => {
  it('sums in integer cents', () => {
    expect(partsTotal([part(35000), part(9000), part(12000)])).toBe(56000);
  });

  it('a blank part contributes nothing, and is not a zero', () => {
    // The distinction is the whole point: if a blank counted as 0 €, a desglose
    // with an unpriced kettle would report the same total as a finished one.
    expect(partsTotal([part(35000), part(null)])).toBe(35000);
  });

  it('is zero for no parts', () => {
    expect(partsTotal([])).toBe(0);
  });
});

describe('summarise', () => {
  it('reports vacio when nothing is written down', () => {
    const summary = summarise(entry({ amountCents: 80000, hasAmount: true }));
    expect(summary.status).toBe('vacio');
    expect(summary.count).toBe(0);
    expect(summary.unallocatedCents).toBe(80000);
  });

  it('reports parcial, and what is left over, while the parts fall short', () => {
    const summary = summarise(
      entry({ amountCents: 80000, hasAmount: true, parts: [part(35000), part(9000)] }),
    );
    expect(summary.status).toBe('parcial');
    expect(summary.totalCents).toBe(44000);
    expect(summary.unallocatedCents).toBe(36000);
    expect(summary.coveragePercent).toBe(55);
  });

  it('reports cuadra on an exact match', () => {
    const summary = summarise(
      entry({ amountCents: 44000, hasAmount: true, parts: [part(35000), part(9000)] }),
    );
    expect(summary.status).toBe('cuadra');
    expect(summary.unallocatedCents).toBe(0);
    expect(summary.coveragePercent).toBe(100);
  });

  it('reports pasado with a negative gap when the parts exceed the headline', () => {
    // The most useful thing the screen can say: the estimate above is too low,
    // and listing what you actually need is how you found out.
    const summary = summarise(
      entry({ amountCents: 40000, hasAmount: true, parts: [part(35000), part(9000)] }),
    );
    expect(summary.status).toBe('pasado');
    expect(summary.unallocatedCents).toBe(-4000);
  });

  it('clamps the bar at 100 so pasado cannot overrun its track', () => {
    const summary = summarise(entry({ amountCents: 10000, hasAmount: true, parts: [part(50000)] }));
    expect(summary.coveragePercent).toBe(100);
  });

  it('counts the parts still missing a price', () => {
    const summary = summarise(
      entry({ amountCents: 80000, hasAmount: true, parts: [part(35000), part(null), part(null)] }),
    );
    expect(summary.missingCount).toBe(2);
    expect(summary.totalCents).toBe(35000);
  });

  it('allows a desglose on a concepto that has no amount yet', () => {
    // Listing what a lump is made of is how you find out what the lump costs,
    // so this is a normal state and not a failure.
    const summary = summarise(entry({ parts: [part(35000)] }));
    expect(summary.status).toBe('parcial');
    expect(summary.totalCents).toBe(35000);
  });

  it('reports no share when there is no headline to be a share of', () => {
    // Not zero percent — an unanswerable question, so the bar is not drawn.
    expect(summarise(entry({ parts: [part(35000)] })).coveragePercent).toBeNull();
    expect(summarise(entry({ amountCents: 0, hasAmount: true, parts: [part(1)] })).coveragePercent)
      .toBeNull();
  });
});

describe('parts reach no total', () => {
  // The guarantee the whole feature rests on. If one of these ever fails, a
  // desglose has started changing what the flat costs, and writing detail has
  // become something the user has to be brave to do.
  const bare = entry({ amountCents: 80000, hasAmount: true, frequency: 'mensual' });
  const broken = entry({
    amountCents: 80000,
    hasAmount: true,
    frequency: 'mensual',
    parts: [part(35000), part(9000), part(12000)],
  });

  it('does not change the monthly total', () => {
    expect(monthlyTotals([broken]).outCents).toBe(monthlyTotals([bare]).outCents);
    expect(monthlyTotals([broken]).outCents).toBe(80000);
  });

  it('does not change the money needed upfront, even when the parts exceed it', () => {
    const over = entry({
      amountCents: 40000,
      hasAmount: true,
      frequency: 'unico',
      parts: [part(35000), part(9000)],
    });
    const plain = entry({ amountCents: 40000, hasAmount: true, frequency: 'unico' });
    expect(upfront([over], MUEBLES).cashCents).toBe(upfront([plain], MUEBLES).cashCents);
    expect(upfront([over], MUEBLES).cashCents).toBe(40000);
  });
});

describe('desgloseTotals', () => {
  it('counts the rows broken down against every row that could be', () => {
    const totals = desgloseTotals([
      entry({ amountCents: 80000, hasAmount: true, parts: [part(35000)] }),
      entry({ amountCents: 90000, hasAmount: true }),
      entry({ amountCents: 5000, hasAmount: true, parts: [] }),
    ]);
    expect(totals.conceptosBrokenDown).toBe(1);
    expect(totals.conceptosTotal).toBe(3);
  });

  it('counts the over-broken-down and the still-unpriced separately', () => {
    const totals = desgloseTotals([
      entry({ amountCents: 10000, hasAmount: true, parts: [part(50000)] }),
      entry({ amountCents: 80000, hasAmount: true, parts: [part(1000), part(null)] }),
    ]);
    expect(totals.overCount).toBe(1);
    expect(totals.incompleteCount).toBe(1);
  });

  it('includes paused rows and possibilities', () => {
    // A possibility is exactly the kind of number that deserves to say what it
    // is made of, and excluding it here would be the fifth place to forget it.
    const totals = desgloseTotals([
      entry({ status: 'pausado', amountCents: 5000, hasAmount: true, parts: [part(5000)] }),
      entry({ kind: 'critico', amountCents: 90000, hasAmount: true, parts: [part(40000)] }),
    ]);
    expect(totals.conceptosBrokenDown).toBe(2);
  });

  it('is all zeroes for an empty scenario', () => {
    expect(desgloseTotals([])).toEqual({
      conceptosBrokenDown: 0,
      conceptosTotal: 0,
      overCount: 0,
      incompleteCount: 0,
    });
  });
});
