/**
 * The only module that touches localStorage (IND006).
 *
 * One door in and out, so schema versioning and JSON export stay coherent.
 * The schema evolves **on read**: the shape-ensuring pass below fills missing
 * keys and coerces types on every single load, rather than running migrations.
 * A new field therefore needs both a default and a backfill (IND003) — with
 * only the first, a payload saved by yesterday's build breaks on load, and the
 * failure looks like data loss rather than a missing field.
 */
import type {
  Buffer,
  Cents,
  Direction,
  Entry,
  Frequency,
  IsoDate,
  Priority,
  PurchaseProject,
  Revision,
  SavedState,
  Scenario,
  Settings,
  Situacion,
  Status,
  Taxon,
} from '../types';
import {
  DIRECTIONS,
  FALLBACK_CATEGORY,
  FALLBACK_ROOM,
  FREQUENCIES,
  PRIORITIES,
  SITUACIONES,
  STATUSES,
} from '../types';
import { es } from '../i18n/es';
import { newId } from './id';
import { defaultCategories, defaultRooms } from './taxonomy';
import { today } from './history';

const KEY = 'movingout.state';
/** v3 added the editable `categories` / `rooms` lists and stopped seeding scenarios. */
const SCHEMA_VERSION = 3;

/** ~a third of income is the usual rule of thumb; it is editable in Ajustes. */
const DEFAULT_MAX_RENT_PERCENT = 32;

// ── construction ─────────────────────────────────────────────────────────

/**
 * A blank scenario — no entries at all.
 *
 * It used to arrive holding the whole seeded checklist. It does not any more:
 * the checklist is a prediction from `docs/COST-CHECKLIST.md`, and opening on
 * 75 rows you did not write makes the first task deleting the wrong ones
 * instead of typing the right ones. `loadChecklist()` in the store pours it in
 * on request, from Ajustes.
 */
export function newScenario(name: string): Scenario {
  return {
    id: newId('s'),
    name,
    situacion: 'estudiante',
    createdAt: today(),
    savingsCents: 0,
    buffer: { targetCents: 0 },
    entries: [],
    projects: [],
  };
}

const DEFAULT_SETTINGS = (): Settings => ({ maxRentPercent: DEFAULT_MAX_RENT_PERCENT });

/**
 * A fresh install. Written as a concise arrow body on purpose: the IND003
 * parity check reads the depth-1 keys of this literal and asserts every one of
 * them is backfilled below.
 *
 * The scenario is empty but the two taxonomies are not: an empty category list
 * would leave the Costes select with nothing to pick, so the shipped set is
 * the canvas, and every one of its rows is deletable.
 */
export const DEFAULTS = (first: Scenario = newScenario(es.scenario.firstName)): SavedState => ({
  version: SCHEMA_VERSION,
  scenarios: [first],
  activeScenarioId: first.id,
  compareIds: [first.id],
  settings: DEFAULT_SETTINGS(),
  categories: defaultCategories(),
  rooms: defaultRooms(),
});

// ── coercion helpers ─────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function optionalStr(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Amounts are integer cents and never negative — the sign is direction's job. */
function cents(value: unknown, fallback: Cents): Cents {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.abs(Math.round(value));
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * The open-set version of `oneOf`, for the two lists the user edits. An id
 * that is not in the live list re-files onto the fallback, which is how a
 * category deleted on another device — or in a hand-edited export — stops
 * being able to hide rows from every screen at once.
 */
function knownId(value: unknown, allowed: ReadonlySet<string>, fallback: string): string {
  return typeof value === 'string' && allowed.has(value) ? value : fallback;
}

function date(value: unknown, fallback: IsoDate): IsoDate {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

// ── read-time backfill ───────────────────────────────────────────────────

function ensureRevision(raw: unknown, fallbackDate: IsoDate): Revision {
  const r = isRecord(raw) ? raw : {};
  const revision: Revision = {
    date: date(r.date, fallbackDate),
    amountCents: cents(r.amountCents, 0),
  };
  const note = optionalStr(r.note);
  if (note !== undefined) revision.note = note;
  return revision;
}

/** The live ids of both axes, threaded down so entries can be checked against them. */
interface KnownIds {
  categories: ReadonlySet<string>;
  rooms: ReadonlySet<string>;
}

/**
 * One taxonomy list. An absent key means a payload written before v3, which
 * gets the shipped set; a present one is trusted but tidied — blank and
 * duplicate ids dropped, and the fallback put back if it went missing, because
 * `removeCategory` needs somewhere to put the rows it displaces.
 */
function ensureTaxonomy(raw: unknown, fallbackId: string, shipped: () => Taxon[]): Taxon[] {
  if (!Array.isArray(raw)) return shipped();

  const seen = new Set<string>();
  const taxa: Taxon[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = str(item.id, '');
    if (id === '' || seen.has(id)) continue;
    seen.add(id);
    // A blank label would render as an unclickable sliver, so it falls back to
    // the id: ugly on screen beats invisible on screen.
    taxa.push({ id, label: str(item.label, '') === '' ? id : str(item.label, id) });
  }

  if (taxa.length === 0) return shipped();
  if (!seen.has(fallbackId)) {
    const fallback = shipped().find((taxon) => taxon.id === fallbackId);
    if (fallback !== undefined) taxa.push(fallback);
  }
  return taxa;
}

function ensureEntry(raw: unknown, createdAt: IsoDate, known: KnownIds): Entry {
  const r = isRecord(raw) ? raw : {};
  const history = list(r.history).map((revision) => ensureRevision(revision, createdAt));
  const amountCents = cents(r.amountCents, 0);

  const entry: Entry = {
    id: str(r.id, newId('e')),
    label: str(r.label, ''),
    direction: oneOf<Direction>(r.direction, DIRECTIONS, 'salida'),
    category: knownId(r.category, known.categories, FALLBACK_CATEGORY),
    frequency: oneOf<Frequency>(r.frequency, FREQUENCIES, 'mensual'),
    priority: oneOf<Priority>(r.priority, PRIORITIES, 'deseable'),
    status: oneOf<Status>(r.status, STATUSES, 'activo'),
    amountCents,
    // v1 had no `hasAmount`: a saved amount above zero is a real estimate,
    // and a saved zero from that build was genuinely "not filled in yet".
    hasAmount: bool(r.hasAmount, amountCents > 0 || history.length > 0),
    history,
  };

  // `room !== undefined` is what makes an Entry furniture, so an unknown room
  // re-files rather than clears: clearing it would move a wardrobe into Costes.
  const room = typeof r.room === 'string' ? knownId(r.room, known.rooms, FALLBACK_ROOM) : undefined;
  if (room !== undefined) entry.room = room;
  const projectId = optionalStr(r.projectId);
  if (projectId !== undefined) entry.projectId = projectId;
  const note = optionalStr(r.note);
  if (note !== undefined) entry.note = note;
  if (bool(r.refundable, false)) entry.refundable = true;
  if (bool(r.shouldNotPay, false)) entry.shouldNotPay = true;
  return entry;
}

function ensureProject(raw: unknown, createdAt: IsoDate): PurchaseProject {
  const r = isRecord(raw) ? raw : {};
  const project: PurchaseProject = {
    id: str(r.id, newId('p')),
    name: str(r.name, ''),
    budgetCents: cents(r.budgetCents, 0),
    startDate: date(r.startDate, createdAt),
    targetDate: date(r.targetDate, createdAt),
  };
  const note = optionalStr(r.note);
  if (note !== undefined) project.note = note;
  return project;
}

function ensureBuffer(raw: unknown): Buffer {
  const r = isRecord(raw) ? raw : {};
  return { targetCents: cents(r.targetCents, 0) };
}

function ensureScenario(raw: unknown, known: KnownIds): Scenario {
  const r = isRecord(raw) ? raw : {};
  const createdAt = date(r.createdAt, today());
  const scenario: Scenario = {
    id: str(r.id, newId('s')),
    name: str(r.name, es.scenario.firstName),
    situacion: oneOf<Situacion>(r.situacion, SITUACIONES, 'estudiante'),
    createdAt,
    savingsCents: cents(r.savingsCents, 0),
    buffer: ensureBuffer(r.buffer),
    entries: list(r.entries).map((entry) => ensureEntry(entry, createdAt, known)),
    projects: list(r.projects).map((project) => ensureProject(project, createdAt)),
  };
  const note = optionalStr(r.note);
  if (note !== undefined) scenario.note = note;
  return scenario;
}

function ensureSettings(raw: unknown): Settings {
  const r = isRecord(raw) ? raw : {};
  const percent = num(r.maxRentPercent, DEFAULT_MAX_RENT_PERCENT);
  return { maxRentPercent: Math.min(100, Math.max(1, Math.round(percent))) };
}

/**
 * Every key of DEFAULTS(), backfilled. Nothing here throws: a payload that has
 * lost a field should still open, missing that field, rather than greet the
 * user with a blank app.
 */
export function ensureShape(raw: unknown): SavedState {
  const r = isRecord(raw) ? raw : {};

  // Both taxonomies are read first: they are the vocabulary every entry below
  // is checked against, so the order here is not cosmetic.
  const categories = ensureTaxonomy(r.categories, FALLBACK_CATEGORY, defaultCategories);
  const rooms = ensureTaxonomy(r.rooms, FALLBACK_ROOM, defaultRooms);
  const known: KnownIds = {
    categories: new Set(categories.map((taxon) => taxon.id)),
    rooms: new Set(rooms.map((taxon) => taxon.id)),
  };

  const scenarios = list(r.scenarios).map((scenario) => ensureScenario(scenario, known));
  if (scenarios.length === 0) scenarios.push(newScenario(es.scenario.firstName));

  const ids = new Set(scenarios.map((scenario) => scenario.id));
  const savedActive = str(r.activeScenarioId, '');
  const activeScenarioId = ids.has(savedActive) ? savedActive : scenarios[0].id;

  const compareIds = list(r.compareIds).filter((id): id is string => typeof id === 'string' && ids.has(id));
  if (compareIds.length === 0) compareIds.push(activeScenarioId);

  return {
    version: SCHEMA_VERSION,
    scenarios,
    activeScenarioId,
    compareIds,
    settings: ensureSettings(r.settings),
    categories,
    rooms,
  };
}

// ── the door ─────────────────────────────────────────────────────────────

export function load(): SavedState {
  let text: string | null = null;
  try {
    text = localStorage.getItem(KEY);
  } catch {
    // Private mode, disabled storage, quota — the app still works, it just
    // will not remember. Better than refusing to start.
    return DEFAULTS();
  }
  if (text === null) return DEFAULTS();
  try {
    return ensureShape(JSON.parse(text));
  } catch {
    return DEFAULTS();
  }
}

export function save(state: SavedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Nothing useful to do: the alternative is throwing away the keystroke
    // the user just made.
  }
}

export function clear(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // See save().
  }
}

/** The backup and device-transfer story. Same shape, through the same door. */
export function exportJson(state: SavedState): string {
  return JSON.stringify(state, null, 2);
}

/** Throws only when the text is not JSON at all; anything else is backfilled. */
export function importJson(text: string): SavedState {
  return ensureShape(JSON.parse(text));
}

export const STORAGE_KEY = KEY;
export const VERSION = SCHEMA_VERSION;
