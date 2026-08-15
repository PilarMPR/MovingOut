/**
 * The template is the one place in the repo where a wrong number is silent:
 * every other module is arithmetic over data the user typed, this one *is* the
 * data. So the assertions below are the spreadsheet's own totals, and they fail
 * the moment a row is edited without its column being re-added.
 */
import { describe, expect, it } from 'vitest';
import { derive, monthlyTotals, upfront } from './derive';
import { toMonthly } from './frequency';
import {
  templateBufferTargetCents,
  templateCategories,
  templateCount,
  templateScenario,
} from './template';
import { DEFAULTS, ensureShape } from './storage';
import { defaultCategories, mergeTaxa } from './taxonomy';
import { es } from '../i18n/es';
import { FALLBACK_CATEGORY, type Settings, type Taxon } from '../types';

const settings: Settings = { maxRentPercent: 32 };
const scenario = () => templateScenario('Presupuesto');
const derived = () => derive(scenario(), settings, 'Muebles', '2026-08-15');

/** The sheet's own figures, in cents. Change these only against the sheet. */
const SHEET = {
  ingreso: 157000,
  fijos: 105300,
  esporadicos: 19000,
  aportacion: 10000,
  fondoObjetivo: 840000,
  ahorroLibre: 22700,
};

describe('templateScenario', () => {
  it('reproduces the sheet: 1.570 € in, 1.343 € out, 227 € free', () => {
    const totals = monthlyTotals(scenario().entries);
    expect(totals.inCents).toBe(SHEET.ingreso);
    expect(totals.outCents).toBe(SHEET.fijos + SHEET.esporadicos + SHEET.aportacion);
    expect(totals.balanceCents).toBe(SHEET.ahorroLibre);
  });

  it('says you can afford it', () => {
    expect(derived().verdict).toBe('ok');
    expect(derived().shortfallCents).toBe(0);
  });

  it('sets the colchón target from the contingencies, not from a literal', () => {
    expect(templateBufferTargetCents()).toBe(SHEET.fondoObjetivo);
    expect(scenario().buffer.targetCents).toBe(templateBufferTargetCents());
  });

  /**
   * The regression this file mostly exists for. The five contingencies are
   * `unico`, and a `unico` row that is not paused counts as due before you move
   * in — which would announce that moving out costs 8.400 € on day one.
   */
  it('keeps the contingencies out of every total', () => {
    const ledger = upfront(scenario().entries, 'Muebles');
    expect(ledger.cashCents).toBe(0);
    expect(ledger.spendCents).toBe(0);
    expect(ledger.lines).toHaveLength(0);
    // Nor are they missing an amount — they have one, they are just paused.
    expect(ledger.missingCount).toBe(0);
  });

  it('files the paused contingencies where the fund is', () => {
    const paused = scenario().entries.filter((entry) => entry.status === 'pausado');
    expect(paused).toHaveLength(5);
    expect(paused.every((entry) => entry.frequency === 'unico')).toBe(true);
    expect(paused.every((entry) => entry.category === 'catastrofe')).toBe(true);
    let total = 0;
    for (const entry of paused) total += entry.amountCents;
    expect(total).toBe(SHEET.fondoObjetivo);
  });

  it('starts every row with its figure already in the log', () => {
    // Without this, the user's first edit would be recorded as the original and
    // the drift against the sheet would be lost exactly when it starts to matter.
    for (const entry of scenario().entries) {
      expect(entry.hasAmount).toBe(true);
      expect(entry.history).toHaveLength(1);
      expect(entry.history[0].amountCents).toBe(entry.amountCents);
    }
    // One estimate each is not a revision, so there is nothing to drift against yet.
    expect(derived().driftCents).toBeNull();
  });

  it('stores amounts positive, in whole cents (IND001, IND005)', () => {
    for (const entry of scenario().entries) {
      expect(entry.amountCents).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(entry.amountCents)).toBe(true);
    }
  });

  it('is all conceptos — the sheet has no furniture', () => {
    expect(derived().furniture).toHaveLength(0);
    expect(derived().costes).toHaveLength(templateCount());
  });

  it('gives every row real copy, never a leaked key', () => {
    for (const entry of scenario().entries) {
      expect(es.template.rows[entry.label]).toBeUndefined();
      expect(entry.label.length).toBeGreaterThan(2);
    }
  });

  it('opens as an empleado scenario with no savings yet', () => {
    // The sheet is built on a net salary, and its projection accumulates from
    // zero — both are scenario-level facts, which is why this is a scenario.
    expect(scenario().situacion).toBe('empleado');
    expect(scenario().savingsCents).toBe(0);
  });
});

describe('templateCategories', () => {
  it('covers every category the rows file under', () => {
    const offered = new Set(templateCategories().map((taxon) => taxon.id));
    for (const entry of scenario().entries) {
      expect(offered.has(entry.category)).toBe(true);
    }
  });

  it('brings the two the shipped list does not have', () => {
    const ids = templateCategories().map((taxon) => taxon.id);
    expect(ids).toContain('esporadicos');
    expect(ids).toContain('catastrofe');
  });

  it('offers nothing it does not use', () => {
    const used = new Set(scenario().entries.map((entry) => entry.category));
    for (const taxon of templateCategories()) expect(used.has(taxon.id)).toBe(true);
  });
});

describe('the breakdown the mixed axis was chosen for', () => {
  it('keeps the fixed costs on the domestic axis and the rest on the sheet’s', () => {
    const bars = new Map(derived().breakdown.map((slice) => [slice.category, slice.monthlyCents]));
    expect(bars.get('vivienda')).toBe(65000);
    expect(bars.get('alimentacion')).toBe(29000);
    expect(bars.get('suministros')).toBe(9200);
    expect(bars.get('ocio')).toBe(6000);
    expect(bars.get('transporte')).toBe(2000);
    expect(bars.get('consumibles')).toBe(100);
    // What is left of the sheet's esporádicos once ocio y salidas goes home.
    expect(bars.get('esporadicos')).toBe(13000);
    expect(bars.get('catastrofe')).toBe(SHEET.aportacion);
  });

  it('adds up to the monthly salidas, so nothing is filed outside a bar', () => {
    let total = 0;
    for (const slice of derived().breakdown) total += slice.monthlyCents;
    expect(total).toBe(derived().totals.outCents);
  });
});

/**
 * The failure the merge exists to prevent, and the only one the unit tests
 * above cannot see: `storage.ts` re-files any entry whose category is not in
 * the live list, so a template loaded against a pruned taxonomy would look
 * right until the next reload and then arrive with a third of its rows in Otros.
 */
describe('surviving a storage round-trip', () => {
  const roundTrip = (categories: Taxon[]) =>
    ensureShape({
      ...DEFAULTS(templateScenario('Presupuesto')),
      categories: mergeTaxa(categories, templateCategories()),
    });

  it('keeps every row where the template filed it', () => {
    const after = roundTrip(defaultCategories());
    const rebuilt = after.scenarios[0].entries;
    const before = scenario().entries;
    expect(rebuilt.map((e) => e.category)).toEqual(before.map((e) => e.category));
    expect(rebuilt.filter((e) => e.category === FALLBACK_CATEGORY)).toHaveLength(0);
  });

  it('restores categories this install had binned', () => {
    // The realistic case: Vivienda and Alimentación deleted while building a
    // scenario by hand, months before the template is ever pressed.
    const pruned = defaultCategories().filter(
      (taxon) => taxon.id !== 'vivienda' && taxon.id !== 'alimentacion',
    );
    const after = roundTrip(pruned);
    const ids = after.categories.map((taxon) => taxon.id);
    expect(ids).toContain('vivienda');
    expect(ids).toContain('alimentacion');
    expect(after.scenarios[0].entries.filter((e) => e.category === FALLBACK_CATEGORY)).toHaveLength(0);
  });

  it('does not undo a rename to put a category back', () => {
    const renamed = defaultCategories().map((taxon) =>
      taxon.id === 'ocio' ? { ...taxon, label: 'Caprichos' } : taxon,
    );
    const after = roundTrip(renamed);
    expect(after.categories.find((taxon) => taxon.id === 'ocio')?.label).toBe('Caprichos');
  });
});

describe('the prorated esporádicos', () => {
  it('are stored monthly, so no averaging happens twice (IND004)', () => {
    // The sheet's column is "media mensual": the division already happened.
    // toMonthly() must therefore be the identity on every one of these rows.
    for (const entry of scenario().entries) {
      if (entry.status === 'pausado') continue;
      expect(toMonthly(entry.amountCents, entry.frequency)).toBe(entry.amountCents);
    }
  });
});
