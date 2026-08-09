import { describe, expect, it } from 'vitest';
import { delta, formatDate, log, original, previous, pushRevision, summary } from './history';
import type { Entry } from '../types';

function entry(patch: Partial<Entry> = {}): Entry {
  return {
    id: 'e1',
    label: 'Luz',
    direction: 'salida',
    category: 'suministros',
    frequency: 'mensual',
    priority: 'esencial',
    status: 'activo',
    amountCents: 0,
    hasAmount: false,
    history: [],
    ...patch,
  };
}

describe('pushRevision', () => {
  it('appends rather than mutating — the changelog is the feature (IND002)', () => {
    const first = pushRevision(entry(), 4200, '2026-05-12');
    const second = pushRevision(first, 4800, '2026-08-09', 'subida de la tarifa');

    expect(first.history).toHaveLength(1);
    expect(second.history).toHaveLength(2);
    // The original array is untouched, and its first element is the same object.
    expect(second.history[0]).toBe(first.history[0]);
    expect(first.history[0].amountCents).toBe(4200);
  });

  it('makes the latest revision the current amount', () => {
    const e = pushRevision(pushRevision(entry(), 4200, '2026-05-12'), 4800, '2026-08-09');
    expect(e.amountCents).toBe(4800);
    expect(e.hasAmount).toBe(true);
    expect(original(e)?.amountCents).toBe(4200);
    expect(previous(e)?.amountCents).toBe(4200);
  });

  it('keeps a note that repeats the same amount, because a note is information', () => {
    const e = pushRevision(pushRevision(entry(), 4200, '2026-05-12'), 4200, '2026-07-03', 'factura de junio');
    expect(e.history).toHaveLength(2);
    expect(e.history[1].note).toBe('factura de junio');
  });
});

describe('delta', () => {
  it('reports nothing on a first estimate — there is no change yet', () => {
    const e = pushRevision(entry(), 4200, '2026-05-12');
    expect(delta(e)).toEqual({
      vsPreviousCents: null,
      vsOriginalCents: null,
      vsOriginalPercent: null,
    });
  });

  it('measures against both the previous and the original', () => {
    let e = pushRevision(entry(), 4200, '2026-05-12');
    e = pushRevision(e, 4500, '2026-07-03');
    e = pushRevision(e, 4800, '2026-08-09');
    const d = delta(e);
    expect(d.vsPreviousCents).toBe(300);
    expect(d.vsOriginalCents).toBe(600);
    expect(d.vsOriginalPercent).toBeCloseTo(14.2857, 3);
  });

  it('does not divide by an original of zero', () => {
    let e = pushRevision(entry(), 0, '2026-05-12');
    e = pushRevision(e, 4800, '2026-08-09');
    expect(delta(e).vsOriginalPercent).toBeNull();
  });
});

describe('log', () => {
  it('returns every revision across every entry, newest first', () => {
    const luz = pushRevision(pushRevision(entry(), 4200, '2026-05-12'), 4800, '2026-08-09');
    const rent = pushRevision(entry({ id: 'e2', label: 'Alquiler' }), 33000, '2026-07-21');

    const lines = log([luz, rent]);
    expect(lines.map((l) => l.date)).toEqual(['2026-08-09', '2026-07-21', '2026-05-12']);
    expect(lines[0].vsPreviousCents).toBe(600);
    expect(lines[2].isFirst).toBe(true);
  });

  it('does not reorder the append-only history in place', () => {
    const luz = pushRevision(pushRevision(entry(), 4200, '2026-05-12'), 4800, '2026-08-09');
    const before = luz.history.map((r) => r.date);
    log([luz]);
    expect(luz.history.map((r) => r.date)).toEqual(before);
  });
});

describe('summary', () => {
  it('counts revisions, not first estimates', () => {
    const luz = pushRevision(pushRevision(entry(), 4200, '2026-05-12'), 4800, '2026-08-09');
    const rent = pushRevision(entry({ id: 'e2', label: 'Alquiler' }), 33000, '2026-07-21');

    const s = summary([luz, rent]);
    expect(s.revisionCount).toBe(1);
    expect(s.revisedEntries).toBe(1);
    expect(s.biggestRise?.label).toBe('Luz');
    expect(s.biggestRise?.cents).toBe(600);
    expect(s.lastDate).toBe('2026-08-09');
  });

  it('reports no rise when everything went down', () => {
    const e = pushRevision(pushRevision(entry(), 22000, '2026-05-12'), 18000, '2026-07-28');
    expect(summary([e]).biggestRise).toBeNull();
  });
});

describe('formatDate', () => {
  it('renders the Spanish order', () => {
    expect(formatDate('2026-08-09')).toBe('09/08/2026');
  });
});
