import { describe, expect, it } from 'vitest';
import {
  breakdown,
  coverage,
  derive,
  drift,
  furnitureTotals,
  identicalConcepts,
  monthlyTotals,
  projectProgress,
  projectVerdict,
  upfront,
  verdict,
} from './derive';
import { pushRevision } from './history';
import { byCategory } from './purchases';
import type { Entry, Scenario, Settings } from '../types';

const MUEBLES = 'Muebles esenciales';
const TODAY = '2026-08-15';
const SETTINGS: Settings = { maxRentPercent: 32 };

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
    amountCents: 0,
    hasAmount: false,
    history: [],
    ...patch,
  };
}

/** An amount that was filled in once — which is what makes it an estimate. */
function priced(cents: number, patch: Partial<Entry> = {}): Entry {
  return pushRevision(entry(patch), cents, '2026-05-12');
}

function scenario(entries: Entry[], patch: Partial<Scenario> = {}): Scenario {
  return {
    id: 's1',
    name: 'Compartir con Ana',
    situacion: 'estudiante',
    createdAt: '2026-05-12',
    savingsCents: 0,
    buffer: { targetCents: 0 },
    entries,
    projects: [],
    purchases: [],
    ...patch,
  };
}

describe('monthlyTotals', () => {
  it('normalises every frequency before summing (IND004)', () => {
    const totals = monthlyTotals([
      priced(33000, { frequency: 'mensual' }),
      priced(5800, { frequency: 'bimestral' }),
      priced(9600, { frequency: 'anual' }),
    ]);
    expect(totals.outCents).toBe(33000 + 2900 + 800);
    expect(totals.outCount).toBe(3);
  });

  it('applies the sign from direction, once (IND005)', () => {
    const totals = monthlyTotals([
      priced(73000, { direction: 'entrada', category: 'ingresos' }),
      priced(64200),
    ]);
    expect(totals.inCents).toBe(73000);
    expect(totals.outCents).toBe(64200);
    expect(totals.balanceCents).toBe(8800);
  });

  it('excludes pausado on purpose, and blanks because they are not zeros', () => {
    const totals = monthlyTotals([
      priced(33000),
      priced(2900, { status: 'pausado' }),
      entry({ amountCents: 0, hasAmount: false }),
    ]);
    expect(totals.outCents).toBe(33000);
    expect(totals.outCount).toBe(1);
  });

  it('counts pendiente, because an unpaid annual premium is still a cost', () => {
    const totals = monthlyTotals([priced(9600, { frequency: 'anual', status: 'pendiente' })]);
    expect(totals.outCents).toBe(800);
  });

  it('leaves one-offs out of the monthly total entirely', () => {
    const totals = monthlyTotals([priced(18000, { frequency: 'unico', status: 'pendiente' })]);
    expect(totals.outCents).toBe(0);
  });

  it('never counts a row flagged as one the landlord owes', () => {
    const totals = monthlyTotals([priced(50000, { shouldNotPay: true })]);
    expect(totals.outCents).toBe(0);
  });
});

describe('upfront', () => {
  const entries = [
    priced(33000, { label: 'Fianza', frequency: 'unico', status: 'pendiente', refundable: true }),
    priced(33000, { label: 'Mes anticipado', frequency: 'unico', status: 'pendiente' }),
    priced(9000, { label: 'Mudanza', frequency: 'unico', status: 'pendiente' }),
    priced(2800, { label: 'Ya comprado', frequency: 'unico', status: 'pagado' }),
    priced(50000, { label: 'Agencia', frequency: 'unico', status: 'pendiente', shouldNotPay: true }),
    priced(18000, { label: 'Colchón', frequency: 'unico', status: 'pendiente', room: 'dormitorio' }),
    priced(9900, { label: 'Sofá', frequency: 'unico', status: 'pendiente', room: 'salon', priority: 'deseable' }),
  ];

  it('separates cash needed from money actually spent', () => {
    const ledger = upfront(entries, MUEBLES);
    // fianza + mes + mudanza + essential furniture. The sofá is deseable, and
    // a nice armchair is not something you cannot sleep without.
    expect(ledger.cashCents).toBe(33000 + 33000 + 9000 + 18000);
    expect(ledger.refundableCents).toBe(33000);
    expect(ledger.spendCents).toBe(33000 + 9000 + 18000);
  });

  it('never treats the deposit as burned', () => {
    const ledger = upfront(entries, MUEBLES);
    expect(ledger.spendCents).toBe(ledger.cashCents - ledger.refundableCents);
    expect(ledger.spendCents).toBeLessThan(ledger.cashCents);
  });

  it('excludes what is already paid', () => {
    const ledger = upfront(entries, MUEBLES);
    expect(ledger.lines.some((line) => line.label === 'Ya comprado')).toBe(false);
  });

  it('shows the agency fee at zero, struck through, rather than hiding it', () => {
    const ledger = upfront(entries, MUEBLES);
    const flagged = ledger.lines.find((line) => line.shouldNotPay);
    expect(flagged?.label).toBe('Agencia');
    expect(flagged?.amountCents).toBe(0);
    // Present, but it never moves a total.
    expect(ledger.cashCents).not.toContain(50000);
  });

  it('collapses essential furniture into one line', () => {
    const ledger = upfront(entries, MUEBLES);
    const furniture = ledger.lines.find((line) => line.label === MUEBLES);
    expect(furniture?.amountCents).toBe(18000);
    expect(furniture?.count).toBe(1);
  });

  it('counts one-offs that still have no amount', () => {
    const ledger = upfront(
      [entry({ frequency: 'unico', status: 'pendiente' }), ...entries],
      MUEBLES,
    );
    expect(ledger.missingCount).toBe(1);
  });
});

describe('verdict', () => {
  const totals = (inCents: number, outCents: number) =>
    monthlyTotals([
      priced(inCents, { direction: 'entrada', category: 'ingresos' }),
      priced(outCents),
    ]);

  it('says no when the balance is negative', () => {
    expect(verdict(totals(73000, 107000))).toBe('falta');
  });

  it('says marginal when the balance is under 5 % of salidas', () => {
    expect(verdict(totals(73000, 71200))).toBe('justo');
  });

  it('says yes when there is real room', () => {
    expect(verdict(totals(73000, 64200))).toBe('ok');
  });

  it('refuses to answer an empty budget', () => {
    // Nothing in and nothing out is not a balanced budget, it is an empty one.
    // Reporting "ok" on first launch is the same lie as printing 0,00 € for a
    // blank amount — a claim where the question has not been asked yet.
    expect(verdict(monthlyTotals([]))).toBe('sindatos');
    expect(verdict(monthlyTotals([entry(), entry()]))).toBe('sindatos');
  });

  it('still answers when the two sides genuinely cancel out', () => {
    // A real 730 in against a real 730 out is a marginal yes, not "no data".
    expect(verdict(totals(73000, 73000))).toBe('justo');
  });
});

describe('derive', () => {
  const base = [
    priced(73000, { direction: 'entrada', category: 'ingresos', label: 'Beca' }),
    priced(33000, { category: 'vivienda', label: 'Alquiler' }),
    priced(5800, { category: 'suministros', frequency: 'bimestral', label: 'Agua' }),
    priced(33000, { label: 'Fianza', frequency: 'unico', status: 'pendiente', refundable: true }),
  ];

  it('reports runway only when the balance is negative', () => {
    const poor = derive(
      scenario([...base, priced(100000, { label: 'Estudio' })], { savingsCents: 640000 }),
      SETTINGS,
      MUEBLES,
      TODAY,
    );
    expect(poor.verdict).toBe('falta');
    expect(poor.sixth.kind).toBe('runway');
    expect(poor.runwayMonths).not.toBeNull();
  });

  it('does not report a buffer as covered when no target was ever set', () => {
    const fresh = derive(scenario(base), SETTINGS, MUEBLES, TODAY);
    if (fresh.sixth.kind !== 'buffer') throw new Error('expected the buffer KPI');
    expect(fresh.sixth.targetCents).toBe(0);
    expect(fresh.sixth.covered).toBe(false);
  });

  it('has no branch that can render an infinite runway', () => {
    const rich = derive(scenario(base, { savingsCents: 640000 }), SETTINGS, MUEBLES, TODAY);
    expect(rich.verdict).toBe('ok');
    expect(rich.sixth.kind).toBe('buffer');
    // The positive branch reports the buffer; runway is simply not asked.
    expect(rich.runwayMonths).toBeNull();
  });

  it('quantifies fragility in the marginal state', () => {
    const tight = derive(
      scenario([
        priced(73000, { direction: 'entrada', category: 'ingresos' }),
        priced(71200),
      ]),
      SETTINGS,
      MUEBLES,
      TODAY,
    );
    expect(tight.verdict).toBe('justo');
    if (tight.sixth.kind !== 'margin') throw new Error('expected the margin KPI');
    expect(tight.sixth.monthsPerHundred).toBeCloseTo(10000 / 1800, 6);
  });

  it('subtracts the whole upfront from savings, deposit included', () => {
    // The fianza comes back eventually, but it is not available next month.
    const d = derive(scenario(base, { savingsCents: 640000 }), SETTINGS, MUEBLES, TODAY);
    expect(d.savingsAfterUpfrontCents).toBe(640000 - 33000);
  });

  it('treats the max-rent guideline as a share of income, nothing more', () => {
    const d = derive(scenario(base), SETTINGS, MUEBLES, TODAY);
    expect(d.maxAffordableRentCents).toBe(Math.round(73000 * 0.32));
  });

  it('splits furniture out of the conceptos list', () => {
    const d = derive(
      scenario([...base, priced(18000, { room: 'dormitorio', frequency: 'unico', status: 'pendiente' })]),
      SETTINGS,
      MUEBLES,
      TODAY,
    );
    expect(d.furniture).toHaveLength(1);
    expect(d.costes).toHaveLength(base.length);
  });
});

describe('drift', () => {
  it('is null until something has actually been revised', () => {
    expect(drift([priced(33000)])).toBeNull();
  });

  it('measures burn today against burn when the scenario was created', () => {
    const luz = pushRevision(priced(4200, { category: 'suministros' }), 4800, '2026-08-09');
    const water = pushRevision(
      priced(5800, { frequency: 'bimestral' }),
      6000,
      '2026-08-09',
    );
    // +600 on the monthly bill, +100 on the monthly equivalent of the bimonthly.
    expect(drift([luz, water])).toBe(600 + 100);
  });

  it('ignores entradas — drift is about what the piso costs', () => {
    const grant = pushRevision(
      priced(30000, { direction: 'entrada', category: 'ingresos' }),
      35000,
      '2026-08-09',
    );
    expect(drift([grant])).toBeNull();
  });
});

describe('breakdown', () => {
  it('shares out salidas by category and keeps paused categories visible', () => {
    const slices = breakdown([
      priced(33000, { category: 'vivienda' }),
      priced(13000, { category: 'alimentacion' }),
      priced(2900, { category: 'ocio', status: 'pausado' }),
      entry({ category: 'impuestos' }),
    ]);

    const vivienda = slices.find((s) => s.category === 'vivienda');
    expect(vivienda?.monthlyCents).toBe(33000);
    expect(vivienda?.percent).toBeCloseTo((33000 / 46000) * 100, 6);

    const ocio = slices.find((s) => s.category === 'ocio');
    expect(ocio?.allPaused).toBe(true);
    expect(ocio?.monthlyCents).toBe(0);

    expect(slices.find((s) => s.category === 'impuestos')?.missingCount).toBe(1);
    // Paused categories sort last so they never head the chart.
    expect(slices[slices.length - 1].category).toBe('ocio');
  });
});

describe('the shopping log in the totals', () => {
  const shop = (date: string, amountCents: number, category = 'alimentacion') => ({
    id: `g${date}${amountCents}`,
    date,
    product: 'Compra',
    amountCents,
    category,
  });

  it('adds to salidas rather than replacing an estimate', () => {
    const entries = [
      priced(73000, { direction: 'entrada', category: 'ingresos' }),
      priced(33000, { category: 'vivienda' }),
    ];
    const purchases = [shop('2026-08-01', 4520), shop('2026-08-08', 3810)];
    const d = derive(scenario(entries, { purchases }), SETTINGS, MUEBLES, TODAY);

    const plain = monthlyTotals(entries);
    expect(d.spend.totalCents).toBe(8330);
    expect(d.totals.outCents).toBe(plain.outCents + d.spend.monthlyCents);
    expect(d.totals.balanceCents).toBe(d.totals.inCents - d.totals.outCents);
    // The counts stay a count of conceptos: the log is not one.
    expect(d.totals.outCount).toBe(plain.outCount);
  });

  it('leaves the totals untouched when nothing is logged', () => {
    const entries = [priced(33000)];
    expect(derive(scenario(entries), SETTINGS, MUEBLES, TODAY).totals).toEqual(monthlyTotals(entries));
  });

  it('puts logged spending in the breakdown, on the same axis and in the denominator', () => {
    const purchases = [shop('2026-08-01', 4520, 'alimentacion')];
    const logged = byCategory(purchases, TODAY);
    const slices = breakdown([priced(33000, { category: 'vivienda' })], logged);

    const food = slices.find((s) => s.category === 'alimentacion');
    expect(food?.loggedCents).toBe(logged[0].monthlyCents);
    expect(food?.monthlyCents).toBe(logged[0].monthlyCents);
    // Shares still add up, which they would not if the log were left out of
    // the denominator.
    const total = slices.reduce((sum, s) => sum + (s.percent ?? 0), 0);
    expect(total).toBeCloseTo(100, 6);
  });

  it('draws a bar for a category whose only estimate is paused but which has a real shop', () => {
    const logged = byCategory([shop('2026-08-01', 4520, 'ocio')], TODAY);
    const slices = breakdown([priced(2900, { category: 'ocio', status: 'pausado' })], logged);
    expect(slices.find((s) => s.category === 'ocio')?.allPaused).toBe(false);
  });

  it('carries the overlap warning, so nothing is counted twice in silence', () => {
    const d = derive(
      scenario([priced(20000, { category: 'alimentacion', label: 'Compra semanal' })], {
        purchases: [shop('2026-08-01', 4520)],
      }),
      SETTINGS,
      MUEBLES,
      TODAY,
    );
    expect(d.overlaps).toHaveLength(1);
    expect(d.overlaps[0].category).toBe('alimentacion');
  });
});

describe('coverage', () => {
  it('counts what has an amount against what exists', () => {
    const c = coverage([priced(1000), priced(2000), entry()]);
    expect(c).toEqual({ withAmount: 2, total: 3 });
  });

  it('does not count a row that exists only to be seen', () => {
    expect(coverage([priced(1000), entry({ shouldNotPay: true })]).total).toBe(1);
  });
});

describe('furnitureTotals', () => {
  const items = [
    priced(18000, { room: 'dormitorio', priority: 'esencial', status: 'pendiente' }),
    priced(4000, { room: 'dormitorio', priority: 'esencial', status: 'pendiente' }),
    priced(9900, { room: 'salon', priority: 'deseable', status: 'pendiente' }),
    priced(2800, { room: 'cocina', priority: 'esencial', status: 'pagado' }),
    entry({ room: 'cocina', priority: 'esencial', status: 'pendiente' }),
  ];

  it('gives the true minimum to move in', () => {
    const t = furnitureTotals(items);
    expect(t.minimumCents).toBe(22000);
    expect(t.minimumCount).toBe(2);
  });

  it('is honest about how complete that minimum is', () => {
    expect(furnitureTotals(items).missingPriceCount).toBe(1);
  });

  it('separates what is already bought', () => {
    const t = furnitureTotals(items);
    expect(t.paidCents).toBe(2800);
    expect(t.paidCount).toBe(1);
    expect(t.wholeListCents).toBe(22000 + 9900);
  });
});

describe('projects', () => {
  const entries = [
    priced(15000, { projectId: 'p1', status: 'pagado', frequency: 'unico' }),
    priced(13500, { projectId: 'p1', status: 'pendiente', frequency: 'unico' }),
    priced(9000, { projectId: 'p2', status: 'pagado', frequency: 'unico' }),
  ];

  it('measures money and time independently', () => {
    const p = projectProgress(entries, 'p1', 45000, '2026-05-01', '2026-09-30', '2026-08-09');
    expect(p.spentCents).toBe(15000);
    expect(p.itemCount).toBe(2);
    expect(p.pendingCount).toBe(1);
    expect(p.moneyPercent).toBeCloseTo((15000 / 45000) * 100, 6);
    expect(p.timePercent).toBeGreaterThan(60);
  });

  it('calls it overspent when the money bar passes the budget', () => {
    const p = projectProgress(entries, 'p2', 8000, '2026-05-01', '2026-11-15', '2026-08-09');
    expect(p.overBudget).toBe(true);
    expect(projectVerdict(p)).toBe('over');
  });

  it('calls it stalled when time has run ahead of spend', () => {
    const p = projectProgress([], 'p3', 26000, '2026-01-01', '2026-12-31', '2026-11-01');
    expect(projectVerdict(p)).toBe('stalled');
  });
});

describe('identicalConcepts', () => {
  it('finds the conceptos every scenario agrees on', () => {
    const shared = () => [
      priced(2500, { label: 'Consumibles' }),
      priced(2000, { label: 'Abono joven' }),
    ];
    const a = scenario([...shared(), priced(33000, { label: 'Alquiler' })], { id: 'a' });
    const b = scenario([...shared(), priced(43000, { label: 'Alquiler' })], { id: 'b' });
    expect(identicalConcepts([a, b])).toBe(2);
  });

  it('needs more than one scenario to mean anything', () => {
    expect(identicalConcepts([scenario([priced(1000)])])).toBe(0);
  });
});
