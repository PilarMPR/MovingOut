import { describe, expect, it } from 'vitest';
import { seedEntries } from './seed';
import { DEFAULTS, ensureShape, exportJson, importJson, newScenario } from './storage';
import { FALLBACK_CATEGORY, FALLBACK_ROOM } from '../types';

describe('DEFAULTS', () => {
  it('opens on a blank scenario', () => {
    const state = DEFAULTS();
    expect(state.scenarios).toHaveLength(1);
    expect(state.activeScenarioId).toBe(state.scenarios[0].id);
    // The canvas is empty on purpose: the checklist is a button, not a default.
    expect(state.scenarios[0].entries).toEqual([]);
  });

  it('still opens with both taxonomies filled, or nothing could be filed', () => {
    const state = DEFAULTS();
    expect(state.categories.length).toBeGreaterThan(1);
    expect(state.rooms.length).toBeGreaterThan(1);
    expect(state.categories.some((taxon) => taxon.id === FALLBACK_CATEGORY)).toBe(true);
    expect(state.rooms.some((taxon) => taxon.id === FALLBACK_ROOM)).toBe(true);
    expect(state.categories.every((taxon) => taxon.label !== '')).toBe(true);
  });
});

describe('the checklist', () => {
  it('carries the rows that exist to teach a rule, and no prices', () => {
    const entries = seedEntries();
    expect(entries.length).toBeGreaterThan(40);
    // Deliberately no prices: a number baked into a repo is stale within a year.
    expect(entries.every((entry) => !entry.hasAmount)).toBe(true);
    expect(entries.some((entry) => entry.refundable === true)).toBe(true);
    expect(entries.some((entry) => entry.shouldNotPay === true)).toBe(true);
    // Water and gas are billed every two months here, and that is the trap.
    expect(entries.some((entry) => entry.frequency === 'bimestral')).toBe(true);
  });

  it('only files under taxa a fresh install actually has', () => {
    const { categories, rooms } = DEFAULTS();
    const categoryIds = new Set(categories.map((taxon) => taxon.id));
    const roomIds = new Set(rooms.map((taxon) => taxon.id));
    for (const entry of seedEntries()) {
      expect(categoryIds.has(entry.category)).toBe(true);
      if (entry.room !== undefined) expect(roomIds.has(entry.room)).toBe(true);
    }
  });
});

describe('ensureShape', () => {
  it('backfills every key DEFAULTS defines (IND003)', () => {
    const filled = ensureShape({});
    for (const key of Object.keys(DEFAULTS())) {
      expect(filled).toHaveProperty(key);
    }
  });

  it('survives a payload that is not even an object', () => {
    for (const junk of [null, 42, 'nope', []]) {
      const state = ensureShape(junk);
      expect(state.scenarios.length).toBeGreaterThan(0);
      expect(state.activeScenarioId).toBe(state.scenarios[0].id);
    }
  });

  it('gives a pre-v3 payload the shipped taxonomies', () => {
    const state = ensureShape({ version: 2, scenarios: [{ id: 's1', entries: [] }] });
    expect(state.categories.length).toBeGreaterThan(1);
    expect(state.rooms.length).toBeGreaterThan(1);
  });

  it('keeps a saved taxonomy, tidied — no blanks, no duplicate ids', () => {
    const state = ensureShape({
      categories: [
        { id: 'c_1', label: 'Piso' },
        { id: 'c_1', label: 'Piso otra vez' },
        { id: '', label: 'Sin id' },
        { label: 'Sin id tampoco' },
        { id: 'c_2' },
      ],
    });
    expect(state.categories.map((taxon) => taxon.id)).toEqual(['c_1', 'c_2', FALLBACK_CATEGORY]);
    // A blank label would render as an unclickable sliver, so it shows the id.
    expect(state.categories[1].label).toBe('c_2');
  });

  it('puts the fallback back when a payload has dropped it', () => {
    const state = ensureShape({ categories: [{ id: 'c_1', label: 'Piso' }] });
    expect(state.categories.some((taxon) => taxon.id === FALLBACK_CATEGORY)).toBe(true);
  });

  it('re-files an entry whose category no longer exists', () => {
    const state = ensureShape({
      categories: [{ id: 'c_1', label: 'Piso' }],
      rooms: [{ id: 'r_1', label: 'Cocina' }],
      scenarios: [
        {
          id: 's1',
          entries: [
            { id: 'e1', label: 'Alquiler', category: 'c_borrada' },
            { id: 'e2', label: 'Sofá', category: 'c_1', room: 'r_borrada' },
          ],
        },
      ],
    });
    expect(state.scenarios[0].entries[0].category).toBe(FALLBACK_CATEGORY);
    // Re-filed, not cleared: `room !== undefined` is what keeps it in Muebles.
    expect(state.scenarios[0].entries[1].room).toBe(FALLBACK_ROOM);
  });

  it('coerces an unknown enum value rather than throwing', () => {
    const state = ensureShape({
      scenarios: [
        {
          id: 's1',
          name: 'Piso',
          situacion: 'astronauta',
          entries: [{ id: 'e1', label: 'Luz', frequency: 'quincenal', status: 'inventado' }],
        },
      ],
    });
    expect(state.scenarios[0].situacion).toBe('estudiante');
    expect(state.scenarios[0].entries[0].frequency).toBe('mensual');
    expect(state.scenarios[0].entries[0].status).toBe('activo');
  });

  it('stores amounts positive, whatever the payload claimed (IND005)', () => {
    const state = ensureShape({
      // check:ignore IND005 a deliberately malformed payload is the point of this test
      scenarios: [{ id: 's1', entries: [{ id: 'e1', amountCents: -33000 }] }],
    });
    expect(state.scenarios[0].entries[0].amountCents).toBe(33000);
  });

  it('rounds a float amount back to whole cents (IND001)', () => {
    const state = ensureShape({
      // check:ignore IND001 a deliberately malformed payload is the point of this test
      scenarios: [{ id: 's1', entries: [{ id: 'e1', amountCents: 4299.9999 }] }],
    });
    expect(state.scenarios[0].entries[0].amountCents).toBe(4300);
  });

  it('reads a v1 payload that predates hasAmount', () => {
    const state = ensureShape({
      version: 1,
      scenarios: [
        {
          id: 's1',
          entries: [
            { id: 'e1', label: 'Alquiler', amountCents: 33000 },
            { id: 'e2', label: 'Tasa de basuras', amountCents: 0 },
          ],
        },
      ],
    });
    // A saved amount is a real estimate; a saved zero from that build was a blank.
    expect(state.scenarios[0].entries[0].hasAmount).toBe(true);
    expect(state.scenarios[0].entries[1].hasAmount).toBe(false);
  });

  it('gives a payload written before the shopping log an empty one (IND003)', () => {
    // v3 had no `purchases` key, and the absence meant exactly this.
    const state = ensureShape({ version: 3, scenarios: [{ id: 's1', entries: [] }] });
    expect(state.scenarios[0].purchases).toEqual([]);
  });

  it('re-files a purchase whose category no longer exists', () => {
    const state = ensureShape({
      categories: [{ id: 'c_1', label: 'Piso' }],
      scenarios: [
        {
          id: 's1',
          createdAt: '2026-08-01',
          purchases: [
            { id: 'g1', date: '2026-08-14', product: 'Leche', amountCents: 120, category: 'c_borrada' },
          ],
        },
      ],
    });
    expect(state.scenarios[0].purchases[0].category).toBe(FALLBACK_CATEGORY);
  });

  it('coerces a malformed purchase rather than dropping the row', () => {
    const state = ensureShape({
      scenarios: [
        {
          id: 's1',
          createdAt: '2026-08-01',
          // check:ignore IND005, IND001 a deliberately malformed payload is the point of this test
          purchases: [{ id: 'g1', date: 'el martes', amountCents: -450.7 }],
        },
      ],
    });
    const purchase = state.scenarios[0].purchases[0];
    // An unreadable date falls back to the scenario's own start, an amount is
    // rounded and made positive, and a missing product name is blank, not gone.
    expect(purchase.date).toBe('2026-08-01');
    expect(purchase.amountCents).toBe(451);
    expect(purchase.product).toBe('');
  });

  it('repairs a dangling active scenario id instead of showing nothing', () => {
    const state = ensureShape({
      scenarios: [{ id: 's1' }],
      activeScenarioId: 's-deleted',
      compareIds: ['s-deleted'],
    });
    expect(state.activeScenarioId).toBe('s1');
    expect(state.compareIds).toEqual(['s1']);
  });

  it('keeps the max-rent guideline inside a sane range', () => {
    expect(ensureShape({ settings: { maxRentPercent: 4000 } }).settings.maxRentPercent).toBe(100);
    expect(ensureShape({ settings: { maxRentPercent: -3 } }).settings.maxRentPercent).toBe(1);
    expect(ensureShape({ settings: {} }).settings.maxRentPercent).toBeGreaterThan(0);
  });

  it('preserves the append-only history through a reload', () => {
    const state = ensureShape({
      scenarios: [
        {
          id: 's1',
          entries: [
            {
              id: 'e1',
              label: 'Luz',
              amountCents: 4800,
              hasAmount: true,
              history: [
                { date: '2026-05-12', amountCents: 4200 },
                { date: '2026-08-09', amountCents: 4800, note: 'subida de tarifa' },
              ],
            },
          ],
        },
      ],
    });
    const entry = state.scenarios[0].entries[0];
    expect(entry.history).toHaveLength(2);
    expect(entry.history[1].note).toBe('subida de tarifa');
  });

  // ── v6: Entry.parts, the desglose ──────────────────────────────────────
  //
  // IND003 is the one invariant in this repo that has fired for real, and it
  // fired exactly here: a field added to the payload without a backfill.

  function withEntry(patch: Record<string, unknown>) {
    return ensureShape({
      version: 6,
      scenarios: [{ id: 's1', entries: [{ id: 'e1', label: 'Muebles cocina', ...patch }] }],
    }).scenarios[0].entries[0];
  }

  it('reads a v5 entry as having no desglose', () => {
    // The whole v5 → v6 story: nobody broke this row down, and that is not a
    // state that needs recording.
    expect(withEntry({ amountCents: 80000, hasAmount: true }).parts).toBeUndefined();
  });

  it('keeps a stored desglose, ids and all', () => {
    const entry = withEntry({
      amountCents: 80000,
      hasAmount: true,
      parts: [
        { id: 'd1', label: 'Nevera', amountCents: 35000, hasAmount: true },
        { id: 'd2', label: 'Vajilla', amountCents: 0, hasAmount: false, note: 'segunda mano' },
      ],
    });
    expect(entry.parts?.map((part) => part.id)).toEqual(['d1', 'd2']);
    expect(entry.parts?.[1].note).toBe('segunda mano');
  });

  it('reads an amount without the flag as a real figure someone typed', () => {
    const entry = withEntry({ parts: [{ id: 'd1', label: 'Nevera', amountCents: 35000 }] });
    expect(entry.parts?.[0].hasAmount).toBe(true);
  });

  it('keeps a part with a blank label rather than dropping its amount', () => {
    // Half a desglose is a normal thing to have typed; discarding the row would
    // take the money beside it.
    const entry = withEntry({ parts: [{ id: 'd1', amountCents: 9000, hasAmount: true }] });
    expect(entry.parts).toHaveLength(1);
    expect(entry.parts?.[0].label).toBe('');
  });

  it('stores no empty desglose, so absent and empty stay one state', () => {
    expect(withEntry({ parts: [] }).parts).toBeUndefined();
  });

  it('coerces junk parts instead of throwing', () => {
    // check:ignore IND005 the negative is the fixture — the assertion is that it does not survive
    const entry = withEntry({ parts: [null, 42, { label: 'Nevera', amountCents: -35000 }] });
    expect(entry.parts).toHaveLength(3);
    // Negative amounts flip positive like every other amount (IND005).
    expect(entry.parts?.[2].amountCents).toBe(35000);
    expect(entry.parts?.every((part) => typeof part.id === 'string' && part.id !== '')).toBe(true);
  });

  it('survives parts that are not an array', () => {
    expect(withEntry({ parts: 'nope' }).parts).toBeUndefined();
  });
});

describe('export / import', () => {
  it('round-trips through the same door', () => {
    const before = DEFAULTS(newScenario('Compartir con Ana'));
    const after = importJson(exportJson(before));
    expect(after.scenarios[0].name).toBe('Compartir con Ana');
    expect(after.scenarios[0].entries).toHaveLength(before.scenarios[0].entries.length);
    expect(after.activeScenarioId).toBe(before.activeScenarioId);
  });

  it('throws only when the text is not JSON at all', () => {
    expect(() => importJson('{ definitely not json')).toThrow();
    // Anything that parses is backfilled rather than rejected.
    expect(importJson('{}').scenarios.length).toBeGreaterThan(0);
  });
});
