import { describe, expect, it } from 'vitest';
import { DEFAULTS, ensureShape, exportJson, importJson, newScenario } from './storage';

describe('DEFAULTS', () => {
  it('opens on a seeded scenario with no prices in it', () => {
    const state = DEFAULTS();
    expect(state.scenarios).toHaveLength(1);
    expect(state.activeScenarioId).toBe(state.scenarios[0].id);
    expect(state.scenarios[0].entries.length).toBeGreaterThan(40);
    // Deliberately no prices: a number baked into a repo is stale within a year.
    expect(state.scenarios[0].entries.every((entry) => !entry.hasAmount)).toBe(true);
  });

  it('seeds the rows that exist to teach a rule', () => {
    const entries = DEFAULTS().scenarios[0].entries;
    expect(entries.some((entry) => entry.refundable === true)).toBe(true);
    expect(entries.some((entry) => entry.shouldNotPay === true)).toBe(true);
    // Water and gas are billed every two months here, and that is the trap.
    expect(entries.some((entry) => entry.frequency === 'bimestral')).toBe(true);
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
