import { describe, expect, it } from 'vitest';
import {
  addTaxon,
  countCategoryUse,
  countRoomUse,
  defaultCategories,
  defaultRooms,
  hasTaxon,
  labelOf,
  labelsOf,
  mergeTaxa,
  refileCategory,
  refilePurchaseCategory,
  refileRoom,
  removeTaxon,
  renameTaxon,
} from './taxonomy';
import {
  FALLBACK_CATEGORY,
  FALLBACK_ROOM,
  type Entry,
  type Purchase,
  type Scenario,
  type Taxon,
} from '../types';

const taxa: Taxon[] = [
  { id: 'c_viv', label: 'Vivienda' },
  { id: 'c_ocio', label: 'Ocio' },
  { id: FALLBACK_CATEGORY, label: 'Otros' },
];

const entry = (over: Partial<Entry> = {}): Entry => ({
  id: `e${Math.random()}`,
  label: 'Concepto',
  direction: 'salida',
  category: 'c_viv',
  frequency: 'mensual',
  priority: 'esencial',
  status: 'activo',
  kind: 'fijo',
  amountCents: 0,
  hasAmount: false,
  history: [],
  ...over,
});

const scenario = (entries: Entry[], purchases: Purchase[] = []): Scenario => ({
  id: 's1',
  name: 'Piso',
  situacion: 'estudiante',
  createdAt: '2026-08-15',
  savingsCents: 0,
  entries,
  projects: [],
  purchases,
});

describe('the shipped lists', () => {
  it('start with a fallback in each, because every removal needs one', () => {
    expect(hasTaxon(defaultCategories(), FALLBACK_CATEGORY)).toBe(true);
    expect(hasTaxon(defaultRooms(), FALLBACK_ROOM)).toBe(true);
  });

  it('label every id it ships', () => {
    for (const taxon of [...defaultCategories(), ...defaultRooms()]) {
      expect(taxon.label).not.toBe('');
      expect(taxon.label).not.toBe(taxon.id);
    }
  });
});

describe('reading', () => {
  it('maps ids to labels for the selects', () => {
    expect(labelsOf(taxa)).toEqual({ c_viv: 'Vivienda', c_ocio: 'Ocio', otros: 'Otros' });
  });

  it('prints the id rather than a blank when a label is missing', () => {
    expect(labelOf(taxa, 'c_desaparecida')).toBe('c_desaparecida');
  });
});

describe('editing', () => {
  it('appends with a fresh id, so two lists never collide by name', () => {
    const next = addTaxon(taxa, 'Ocio', 'c');
    expect(next).toHaveLength(4);
    expect(next[3].label).toBe('Ocio');
    expect(next[3].id).not.toBe('c_ocio');
  });

  it('renames the label and nothing else', () => {
    const next = renameTaxon(taxa, 'c_ocio', 'Caprichos');
    expect(next[1]).toEqual({ id: 'c_ocio', label: 'Caprichos' });
    // The id is what entries point at; a rename must not re-file anything.
    expect(next.map((t) => t.id)).toEqual(taxa.map((t) => t.id));
  });

  it('refuses to remove the fallback', () => {
    expect(removeTaxon(taxa, FALLBACK_CATEGORY, FALLBACK_CATEGORY)).toHaveLength(3);
    expect(removeTaxon(taxa, 'c_ocio', FALLBACK_CATEGORY)).toHaveLength(2);
  });

  it('merges back only what is missing, keeping the labels already there', () => {
    const renamed = renameTaxon(taxa, 'c_viv', 'Piso');
    const merged = mergeTaxa(renamed, [
      { id: 'c_viv', label: 'Vivienda' },
      { id: 'c_new', label: 'Nueva' },
    ]);
    expect(merged).toHaveLength(4);
    // Restoring a list is not a reason to undo a rename.
    expect(labelOf(merged, 'c_viv')).toBe('Piso');
    expect(labelOf(merged, 'c_new')).toBe('Nueva');
  });
});

describe('re-filing', () => {
  it('moves every concepto off a binned category', () => {
    const entries = [entry({ category: 'c_ocio' }), entry({ category: 'c_viv' })];
    const next = refileCategory(entries, 'c_ocio', FALLBACK_CATEGORY);
    expect(next[0].category).toBe(FALLBACK_CATEGORY);
    expect(next[1].category).toBe('c_viv');
  });

  it('re-files a room rather than clearing it, so furniture stays furniture', () => {
    const next = refileRoom([entry({ room: 'r_gone' })], 'r_gone', FALLBACK_ROOM);
    expect(next[0].room).toBe(FALLBACK_ROOM);
    expect(next[0].room).not.toBeUndefined();
  });

  it('counts across every scenario, because the delete reaches every scenario', () => {
    const scenarios = [
      scenario([entry({ category: 'c_ocio' }), entry({ category: 'c_viv' })]),
      scenario([entry({ category: 'c_ocio' }), entry({ room: 'r_1' })]),
    ];
    expect(countCategoryUse(scenarios, 'c_ocio')).toBe(2);
    expect(countRoomUse(scenarios, 'r_1')).toBe(1);
    expect(countCategoryUse(scenarios, 'c_ninguna')).toBe(0);
  });

  it('counts logged purchases too, since the same delete re-files them', () => {
    const buy = (category: string): Purchase => ({
      id: `g_${category}`,
      date: '2026-08-15',
      product: 'Leche',
      amountCents: 120,
      category,
    });
    const scenarios = [scenario([entry({ category: 'c_ocio' })], [buy('c_ocio'), buy('c_viv')])];
    expect(countCategoryUse(scenarios, 'c_ocio')).toBe(2);
  });

  it('re-files a binned category out of the log as well as out of the conceptos', () => {
    const purchases: Purchase[] = [
      { id: 'g1', date: '2026-08-15', product: 'Leche', amountCents: 120, category: 'c_ocio' },
      { id: 'g2', date: '2026-08-15', product: 'Pan', amountCents: 90, category: 'c_viv' },
    ];
    const next = refilePurchaseCategory(purchases, 'c_ocio', FALLBACK_CATEGORY);
    expect(next[0].category).toBe(FALLBACK_CATEGORY);
    expect(next[1].category).toBe('c_viv');
  });
});
