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
  Cents,
  Direction,
  Entry,
  EntryKind,
  Frequency,
  IsoDate,
  Priority,
  Purchase,
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
  ENTRY_KINDS,
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
/**
 * v3 added the editable `categories` / `rooms` lists and stopped seeding
 * scenarios; v4 added the shopping log, `Scenario.purchases`; v5 added
 * `Entry.kind` and turned the colchón target from a stored field into the sum
 * of the `critico` rows. Every one of them reads anything older — an absent
 * `purchases` means an empty log, an absent `kind` means `fijo`, which is what
 * every row written before the field existed actually was.
 */
const SCHEMA_VERSION = 5;

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
    entries: [],
    projects: [],
    purchases: [],
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
    // Pre-v5 rows have no kind, and `fijo` is what every one of them was: they
    // were all in the monthly total, which is precisely what fijo means. The
    // default is the only one that leaves an existing budget's figures alone.
    kind: oneOf<EntryKind>(r.kind, ENTRY_KINDS, 'fijo'),
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

/**
 * One logged purchase. It is checked against the live category list like an
 * Entry is — a purchase filed under a category binned on another device has to
 * land in Otros rather than vanish from the breakdown it belongs in.
 *
 * No `hasAmount` to backfill: on a Purchase, zero *is* the blank (types.ts).
 */
function ensurePurchase(raw: unknown, fallbackDate: IsoDate, known: KnownIds): Purchase {
  const r = isRecord(raw) ? raw : {};
  const purchase: Purchase = {
    id: str(r.id, newId('g')),
    date: date(r.date, fallbackDate),
    product: str(r.product, ''),
    amountCents: cents(r.amountCents, 0),
    category: knownId(r.category, known.categories, FALLBACK_CATEGORY),
  };
  const note = optionalStr(r.note);
  if (note !== undefined) purchase.note = note;
  return purchase;
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

/**
 * The colchón target used to be a stored number, `Scenario.buffer.targetCents`,
 * and is now the sum of the `critico` rows (types.ts). A payload that still
 * carries one would open with its target silently gone — so the figure is
 * materialised as a single possibility holding the whole amount. The target
 * survives to the cent, and it lands in the one place that can now say what it
 * is *for*, which is the thing the old field could never answer.
 *
 * Only when the scenario has no possibilities of its own: once there is a list,
 * its sum is the target and a stored number is a stale duplicate of it.
 */
function legacyCushionEntry(raw: unknown, entries: Entry[], createdAt: IsoDate): Entry | null {
  if (entries.some((entry) => entry.kind === 'critico')) return null;
  const buffer = isRecord(raw) ? raw : {};
  const targetCents = cents(buffer.targetCents, 0);
  if (targetCents === 0) return null;
  return {
    id: newId('e'),
    label: es.colchon.legacyLabel,
    direction: 'salida',
    category: FALLBACK_CATEGORY,
    // `unico` and `activo`: a possibility is a one-off that has not happened.
    // It needs no `pausado` to stay out of the totals — `critico` does that,
    // and it does it because of what the row is rather than by switching it off.
    frequency: 'unico',
    priority: 'esencial',
    status: 'activo',
    kind: 'critico',
    amountCents: targetCents,
    hasAmount: true,
    // The figure it arrives with is its original estimate, so it is also its
    // first revision — or the first edit would be logged as the original and
    // the drift against it lost (IND002).
    history: [{ date: createdAt, amountCents: targetCents }],
    note: es.colchon.legacyNote,
  };
}

function ensureScenario(raw: unknown, known: KnownIds): Scenario {
  const r = isRecord(raw) ? raw : {};
  const createdAt = date(r.createdAt, today());
  const entries = list(r.entries).map((entry) => ensureEntry(entry, createdAt, known));
  const legacy = legacyCushionEntry(r.buffer, entries, createdAt);
  if (legacy !== null) entries.push(legacy);

  const scenario: Scenario = {
    id: str(r.id, newId('s')),
    name: str(r.name, es.scenario.firstName),
    situacion: oneOf<Situacion>(r.situacion, SITUACIONES, 'estudiante'),
    createdAt,
    savingsCents: cents(r.savingsCents, 0),
    entries,
    projects: list(r.projects).map((project) => ensureProject(project, createdAt)),
    purchases: list(r.purchases).map((purchase) => ensurePurchase(purchase, createdAt, known)),
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
