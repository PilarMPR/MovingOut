import { describe, expect, it } from 'vitest';
import {
  byCategory,
  byProduct,
  daysInclusive,
  loggedSpend,
  logWindow,
  monthOf,
  overlaps,
  productKey,
  sumAmounts,
  toMonthlyRate,
} from './purchases';
import type { Entry, Purchase } from '../types';

const TODAY = '2026-08-15';

let n = 0;
function buy(date: string, product: string, amountCents: number, category = 'alimentacion'): Purchase {
  n += 1;
  return { id: `g${n}`, date, product, amountCents, category };
}

function entry(patch: Partial<Entry> = {}): Entry {
  n += 1;
  return {
    id: `e${n}`,
    label: `concepto ${n}`,
    direction: 'salida',
    category: 'alimentacion',
    frequency: 'mensual',
    priority: 'esencial',
    status: 'activo',
    amountCents: 20000,
    hasAmount: true,
    history: [],
    ...patch,
  };
}

describe('daysInclusive', () => {
  it('counts both ends, so one purchase today is one day of data', () => {
    expect(daysInclusive('2026-08-15', '2026-08-15')).toBe(1);
    expect(daysInclusive('2026-08-01', '2026-08-15')).toBe(15);
  });

  it('is exact across a DST change — both sides parse as UTC', () => {
    // Spain moves the clocks on 2026-10-25. A local-midnight parse would make
    // this 30.96 days and round to 31.
    expect(daysInclusive('2026-10-01', '2026-10-31')).toBe(31);
  });

  it('returns null for a date it cannot read', () => {
    expect(daysInclusive('ayer', TODAY)).toBeNull();
  });
});

describe('logWindow', () => {
  it('measures from the first purchase to today, not to the last one', () => {
    // Three weeks of buying nothing is three weeks of not spending, and the
    // average has to see them.
    const window = logWindow([buy('2026-07-16', 'Compra', 4000)], TODAY);
    expect(window.days).toBe(31);
    expect(window.firstDate).toBe('2026-07-16');
  });

  it('extends rather than shrinks when a date is typed in the future', () => {
    const window = logWindow([buy('2026-08-10', 'Compra', 4000), buy('2027-08-10', 'Ups', 100)], TODAY);
    expect(window.days).toBeGreaterThan(365);
  });

  it('is empty when nothing has an amount yet', () => {
    expect(logWindow([buy(TODAY, 'Producto', 0)], TODAY)).toEqual({
      firstDate: null,
      lastDate: null,
      days: 0,
    });
  });
});

describe('toMonthlyRate', () => {
  it('scales a daily average by 365,25 / 12', () => {
    // 10 € a day over 10 days → 30,4375 × 10 € = 304,38 €
    expect(toMonthlyRate(10000, 10)).toBe(30438);
  });

  it('leaves a figure alone when the window already is a month', () => {
    expect(toMonthlyRate(30000, 30)).toBe(30438);
    expect(toMonthlyRate(1461, 1461 / 48)).toBe(1461);
  });

  it('rounds once, to whole cents (IND001)', () => {
    expect(Number.isInteger(toMonthlyRate(3333, 7))).toBe(true);
  });

  it('is zero rather than infinite over an empty window', () => {
    expect(toMonthlyRate(5000, 0)).toBe(0);
  });
});

describe('loggedSpend', () => {
  const purchases = [
    buy('2026-08-01', 'Compra semanal', 4520),
    buy('2026-08-08', 'Compra semanal', 3810),
    buy('2026-08-15', 'Detergente', 690, 'consumibles'),
  ];

  it('totals what was spent and averages it over the window', () => {
    const spend = loggedSpend(purchases, TODAY);
    expect(spend.totalCents).toBe(9020);
    expect(spend.count).toBe(3);
    expect(spend.days).toBe(15);
    expect(spend.perDayCents).toBe(Math.round(9020 / 15));
    expect(spend.monthlyCents).toBe(toMonthlyRate(9020, 15));
  });

  it('flags the figure as provisional until a month has been logged', () => {
    expect(loggedSpend(purchases, TODAY).provisional).toBe(true);
    expect(loggedSpend(purchases, '2026-09-30').provisional).toBe(false);
  });

  it('counts a row with no amount as missing, not as free', () => {
    const spend = loggedSpend([...purchases, buy(TODAY, 'Producto', 0)], TODAY);
    expect(spend.count).toBe(3);
    expect(spend.missingCount).toBe(1);
    expect(spend.totalCents).toBe(9020);
  });

  it('reports the calendar month beside the average, never instead of it', () => {
    const spend = loggedSpend([buy('2026-07-30', 'Compra', 5000), ...purchases], TODAY);
    expect(spend.thisMonthCents).toBe(9020);
    expect(spend.totalCents).toBe(14020);
  });

  it('answers with zeroes on an empty log rather than dividing by nothing', () => {
    const spend = loggedSpend([], TODAY);
    expect(spend).toMatchObject({ totalCents: 0, count: 0, days: 0, monthlyCents: 0, provisional: false });
  });

  it('counts distinct products by normalised name', () => {
    const spend = loggedSpend([buy(TODAY, 'Leche', 100), buy(TODAY, ' leche ', 100)], TODAY);
    expect(spend.productCount).toBe(1);
  });
});

describe('productKey', () => {
  it('folds case and spacing, and nothing else', () => {
    expect(productKey('  Leche   Entera ')).toBe('leche entera');
    // Deliberately not a stemmer: "tomate" and "tomates" stay two products,
    // because a rule that merges them will eventually merge something else.
    expect(productKey('Tomates')).not.toBe(productKey('Tomate'));
  });
});

describe('byProduct', () => {
  const purchases = [
    buy('2026-08-01', 'Leche', 120),
    buy('2026-08-08', 'leche', 130),
    buy('2026-08-10', 'Café', 480),
  ];

  it('groups by product, biggest spend first', () => {
    const lines = byProduct(purchases, TODAY);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ product: 'Café', count: 1, totalCents: 480 });
    expect(lines[1]).toMatchObject({ count: 2, totalCents: 250, averageCents: 125 });
  });

  it('takes the most recent spelling as the group label', () => {
    const lines = byProduct(purchases, TODAY);
    expect(lines[1].product).toBe('leche');
  });

  it('scales every line over the whole log window, so the lines sum to the total', () => {
    const lines = byProduct(purchases, TODAY);
    const spend = loggedSpend(purchases, TODAY);
    const summed = lines.reduce((total, line) => total + line.monthlyCents, 0);
    // Per-line rounding is allowed to lose a cent, exactly as toMonthly() is.
    expect(Math.abs(summed - spend.monthlyCents)).toBeLessThanOrEqual(lines.length);
  });

  it('leaves the share null when there is nothing to take a share of', () => {
    expect(byProduct([buy(TODAY, 'Producto', 0)], TODAY)).toEqual([]);
  });
});

describe('byCategory', () => {
  it('rolls the log up onto the axis the breakdown is drawn on', () => {
    const lines = byCategory(
      [buy('2026-08-01', 'Compra', 4000), buy('2026-08-02', 'Lejía', 300, 'consumibles')],
      TODAY,
    );
    expect(lines.map((line) => line.category)).toEqual(['alimentacion', 'consumibles']);
    expect(lines[0].totalCents).toBe(4000);
    expect(lines[1].count).toBe(1);
  });
});

describe('overlaps — the double-count guard', () => {
  const purchases = [buy('2026-08-01', 'Compra semanal', 4000)];

  it('finds a live estimate sitting in a category that is also being logged', () => {
    const found = overlaps([entry({ label: 'Compra semanal' })], purchases, TODAY);
    expect(found).toHaveLength(1);
    expect(found[0].estimateMonthlyCents).toBe(20000);
    expect(found[0].loggedMonthlyCents).toBeGreaterThan(0);
  });

  it('normalises the estimate before comparing it (IND004)', () => {
    const found = overlaps(
      [entry({ frequency: 'bimestral', amountCents: 20000 })],
      purchases,
      TODAY,
    );
    expect(found[0].estimateMonthlyCents).toBe(10000);
  });

  it('says nothing about rows that are already out of every total', () => {
    const quiet = [
      entry({ status: 'pausado' }),
      entry({ hasAmount: false, amountCents: 0 }),
      entry({ shouldNotPay: true }),
      entry({ frequency: 'unico' }),
      entry({ direction: 'entrada' }),
      entry({ category: 'ocio' }),
      entry({ room: 'cocina' }),
    ];
    expect(overlaps(quiet, purchases, TODAY)).toEqual([]);
  });

  it('says nothing when there is no log to duplicate', () => {
    expect(overlaps([entry()], [], TODAY)).toEqual([]);
  });
});

describe('sumAmounts and monthOf', () => {
  it('sums without normalising, because a purchase has no frequency', () => {
    expect(sumAmounts([buy(TODAY, 'A', 100), buy(TODAY, 'B', 250)])).toBe(350);
  });

  it('reads the month off an ISO date', () => {
    expect(monthOf('2026-08-15')).toBe('2026-08');
  });
});
