/**
 * The two grouping axes the user owns — categories and rooms — as plain
 * operations over plain data (IND007).
 *
 * The whole module exists because a category is now a row the user can add,
 * rename and bin, and every one of those verbs has a consequence somewhere
 * else: a rename must not re-file anything, a bin must not orphan anything,
 * and neither may leave an Entry pointing at an id that no longer exists.
 *
 * Two rules hold the rest together:
 *
 *   · ids are opaque and permanent, labels are yours — renaming is a label
 *     edit and nothing more
 *   · the fallback taxon (`otros`) always exists and can never be deleted, so
 *     `removeCategory` always has somewhere to put the rows it displaces
 */
import type { Entry, Scenario, Taxon } from '../types';
import {
  DEFAULT_CATEGORY_IDS,
  DEFAULT_ROOM_IDS,
  FALLBACK_CATEGORY,
  FALLBACK_ROOM,
} from '../types';
import { es } from '../i18n/es';
import { newId } from './id';

// ── the starting set ─────────────────────────────────────────────────────

/**
 * What a fresh install opens with. A starting point, not a schema: every one
 * of these can be renamed or binned, and the app has to keep working when
 * only `otros` is left.
 */
export function defaultCategories(): Taxon[] {
  return DEFAULT_CATEGORY_IDS.map((id) => ({ id, label: es.category[id] }));
}

export function defaultRooms(): Taxon[] {
  return DEFAULT_ROOM_IDS.map((id) => ({ id, label: es.room[id] }));
}

// ── reading ──────────────────────────────────────────────────────────────

/** `Select` and every label lookup want a map, and building one per render is cheap. */
export function labelsOf(taxa: readonly Taxon[]): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const taxon of taxa) labels[taxon.id] = taxon.label;
  return labels;
}

export function idsOf(taxa: readonly Taxon[]): string[] {
  return taxa.map((taxon) => taxon.id);
}

/**
 * The label to print for an id. Falls back to the id itself rather than to a
 * blank: a row filed under something the list has lost should look odd on
 * screen, not invisible.
 */
export function labelOf(taxa: readonly Taxon[], id: string): string {
  return taxa.find((taxon) => taxon.id === id)?.label ?? id;
}

export function hasTaxon(taxa: readonly Taxon[], id: string): boolean {
  return taxa.some((taxon) => taxon.id === id);
}

// ── writing ──────────────────────────────────────────────────────────────

/**
 * A new taxon, appended. The id is generated rather than slugged from the
 * label, because two categories may legitimately be called the same thing
 * while they are being typed, and a slug collision would silently merge them.
 */
export function addTaxon(taxa: readonly Taxon[], label: string, prefix: string): Taxon[] {
  return [...taxa, { id: newId(prefix), label }];
}

/** Renaming touches the label and only the label — see the module header. */
export function renameTaxon(taxa: readonly Taxon[], id: string, label: string): Taxon[] {
  return taxa.map((taxon) => (taxon.id === id ? { ...taxon, label } : taxon));
}

/** Removes a taxon. The fallback is refused, so there is always one left. */
export function removeTaxon(taxa: readonly Taxon[], id: string, fallbackId: string): Taxon[] {
  if (id === fallbackId) return [...taxa];
  return taxa.filter((taxon) => taxon.id !== id);
}

/**
 * Appends any of `required` the list has lost, keeping what is already there
 * — including its current label, because a taxon you renamed should not snap
 * back to its shipped name just because the checklist mentions it.
 */
export function mergeTaxa(taxa: readonly Taxon[], required: readonly Taxon[]): Taxon[] {
  const known = new Set(taxa.map((taxon) => taxon.id));
  return [...taxa, ...required.filter((taxon) => !known.has(taxon.id))];
}

// ── keeping entries pointed at something real ────────────────────────────

/** Every concepto filed under `from` moves to `to`. Used when a category is binned. */
export function refileCategory(entries: readonly Entry[], from: string, to: string): Entry[] {
  return entries.map((entry) => (entry.category === from ? { ...entry, category: to } : entry));
}

/**
 * The same for rooms — and it re-files rather than clearing `room`, because
 * `room !== undefined` is what makes an Entry furniture. Clearing it would
 * teleport a wardrobe out of Muebles and into the Costes grid.
 */
export function refileRoom(entries: readonly Entry[], from: string, to: string): Entry[] {
  return entries.map((entry) => (entry.room === from ? { ...entry, room: to } : entry));
}

/**
 * How many entries a taxon holds, across every scenario — which is the honest
 * number, because the lists are app-wide and so is the delete. Counting only
 * the open scenario would promise "4 conceptos" and move forty.
 */
export function countCategoryUse(scenarios: readonly Scenario[], id: string): number {
  return scenarios.reduce(
    (total, scenario) => total + scenario.entries.filter((entry) => entry.category === id).length,
    0,
  );
}

export function countRoomUse(scenarios: readonly Scenario[], id: string): number {
  return scenarios.reduce(
    (total, scenario) => total + scenario.entries.filter((entry) => entry.room === id).length,
    0,
  );
}

// ── the two axes, named ──────────────────────────────────────────────────

/**
 * Which fallback belongs to which axis. Both happen to be `otros` today; they
 * are two constants so that stops being load-bearing.
 */
export const FALLBACK = { category: FALLBACK_CATEGORY, room: FALLBACK_ROOM } as const;

/** Id prefixes, so a category id is never mistaken for a room id in a payload. */
export const PREFIX = { category: 'c', room: 'r' } as const;
