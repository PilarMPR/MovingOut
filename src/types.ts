/**
 * The domain model — the single source of truth for the vocabulary in
 * CLAUDE.md § Domain model. No logic lives here.
 *
 * Spanish identifiers are deliberate: fianza, autónomo, comunidad and the
 * enum values below have no clean English equivalent, and translating them
 * loses the meaning (CLAUDE.md § Language).
 */

/** Money is always an integer count of cents, and always positive (IND001, IND005). */
export type Cents = number;

/** ISO date, `YYYY-MM-DD`. Local calendar days, never timestamps. */
export type IsoDate = string;

export const DIRECTIONS = ['entrada', 'salida'] as const;
export type Direction = (typeof DIRECTIONS)[number];

/**
 * A grouping axis the user owns: a category, or a room in Muebles.
 *
 * `id` and `label` are two fields on purpose. The id is what an Entry stores
 * and it never changes, so renaming "Ocio" to "Caprichos" re-titles the group
 * instead of re-filing every row under it — and a renamed category still lines
 * up with itself across scenarios in Comparar.
 */
export interface Taxon {
  id: string;
  label: string;
}

/**
 * The id of a Taxon in `SavedState.categories`.
 *
 * Deliberately *not* a closed union any more: the category list is a blank
 * canvas the user builds, so the strongest promise a type can make is "some
 * id". The promise that it is a **live** id is kept by `storage.ts` instead,
 * which re-files anything dangling onto `FALLBACK_CATEGORY` on every read.
 */
export type Category = string;

/**
 * The one category that cannot be deleted. Binning any other category re-files
 * its conceptos here, so a delete never orphans a row and never loses data.
 */
export const FALLBACK_CATEGORY = 'otros';

/**
 * What a fresh install starts with. Ids are code and live here; their Spanish
 * labels are UI copy and live in `src/i18n/es.ts` (IND008). Every one of these
 * is deletable and renameable — they are a starting point, not a schema.
 */
export const DEFAULT_CATEGORY_IDS = [
  'vivienda',
  'suministros',
  'consumibles',
  'alimentacion',
  'transporte',
  'ocio',
  'impuestos',
  'ingresos',
  'mobiliario',
  FALLBACK_CATEGORY,
] as const;
export type DefaultCategoryId = (typeof DEFAULT_CATEGORY_IDS)[number];

export const FREQUENCIES = ['mensual', 'bimestral', 'trimestral', 'anual', 'unico'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const PRIORITIES = ['esencial', 'deseable'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ['activo', 'pausado', 'pendiente', 'pagado'] as const;
export type Status = (typeof STATUSES)[number];

/** The id of a Taxon in `SavedState.rooms`. Open for the same reason Category is. */
export type Room = string;

/** The room a binned room's articles fall back to. Undeletable, like Otros. */
export const FALLBACK_ROOM = 'otros';

export const DEFAULT_ROOM_IDS = ['cocina', 'salon', 'dormitorio', 'bano', FALLBACK_ROOM] as const;
export type DefaultRoomId = (typeof DEFAULT_ROOM_IDS)[number];

export const SITUACIONES = ['estudiante', 'becario', 'empleado', 'autonomo'] as const;
export type Situacion = (typeof SITUACIONES)[number];

/**
 * One revision of an estimate. Append-only: revising pushes, never mutates
 * (IND002). The changelog is the feature.
 */
export interface Revision {
  date: IsoDate;
  amountCents: Cents;
  note?: string;
}

/**
 * The universal unit. Income, costs, taxes and furniture are all Entry, so
 * frequency handling, price history and totalling are written once.
 */
export interface Entry {
  id: string;
  label: string;
  direction: Direction;
  /** A live id from `SavedState.categories` — never a label. */
  category: Category;
  /** The *real* frequency. Normalised only at totalling time (IND004). */
  frequency: Frequency;
  priority: Priority;
  status: Status;
  /** Always positive. The sign comes from `direction` (IND005). */
  amountCents: Cents;
  /** `null` means "no estimate yet" — which is not the same as zero. */
  hasAmount: boolean;
  /** Append-only, oldest first. */
  history: Revision[];
  /** Furniture only, and what *makes* it furniture. A live id from `SavedState.rooms`. */
  room?: Room;
  /** Links to a PurchaseProject. */
  projectId?: string;
  note?: string;
  /**
   * Money that comes back — the fianza. Counts toward `upfrontCash` and never
   * toward `actualSpend`. Runway must not treat it as burned.
   */
  refundable?: boolean;
  /**
   * A charge that exists to be *seen* rather than paid: agency fees are the
   * landlord's by law since the 2023 Ley de Vivienda. The row renders struck
   * through at zero and never enters a total.
   */
  shouldNotPay?: boolean;
}

/**
 * One thing actually bought, on one day — the shopping log.
 *
 * Deliberately *not* an Entry, and the one place in the app that records money
 * already spent rather than money someone expects to spend. An Entry answers
 * "what will this cost me every month"; a Purchase answers "what did I pay for
 * milk on Tuesday". Giving it a frequency, a priority or a status would be
 * modelling a receipt as a forecast — none of the three mean anything once the
 * money has left the account, and `history` least of all: a price you paid is
 * not an estimate you can revise.
 *
 * What the two share is the category axis, because that is what lets the log
 * land in the same breakdown as the estimates it is measured against.
 */
export interface Purchase {
  id: string;
  /** The day it was bought. Local calendar day, and what the window is measured over. */
  date: IsoDate;
  /** What was bought: "Leche", "Detergente". Grouped by name in the rollup. */
  product: string;
  /**
   * Always positive, like every other amount (IND005). Purchases are salidas by
   * definition, so there is no `direction` to take a sign from.
   *
   * There is no `hasAmount` here on purpose. A blank estimate is a normal,
   * lasting state — the checklist ships without prices — but a blank *purchase*
   * only exists for the second between adding the row and typing what you paid,
   * and zero is the one amount a real purchase cannot be. So zero reads as "not
   * typed yet", is rendered as the same dashed blank an Entry gets, and is
   * counted as missing rather than as a free lunch.
   */
  amountCents: Cents;
  /** A live id from `SavedState.categories`, exactly as on an Entry. */
  category: Category;
  note?: string;
}

/** A named multi-item goal — "Amueblar salón" — with its own budget and date. */
export interface PurchaseProject {
  id: string;
  name: string;
  budgetCents: Cents;
  /** When the project opened; the elapsed bar measures from here. */
  startDate: IsoDate;
  targetDate: IsoDate;
  note?: string;
}

/**
 * The emergency reserve you want behind you.
 *
 * Only the target lives here. The contributions that build it — the reserve
 * itself and the appliance sinking fund — are ordinary monthly Entries, so
 * they normalise, total, chart and drift like every other line instead of
 * needing a second code path (IND004, IND007). That is the whole point of
 * Entry being the universal unit.
 */
export interface Buffer {
  targetCents: Cents;
}

/** A complete named budget. Scenarios exist side by side and are comparable. */
export interface Scenario {
  id: string;
  name: string;
  situacion: Situacion;
  createdAt: IsoDate;
  /** Savings available today, before moving in. */
  savingsCents: Cents;
  buffer: Buffer;
  entries: Entry[];
  projects: PurchaseProject[];
  /**
   * The shopping log. Per scenario rather than app-wide, unlike the two
   * taxonomies: what you spend on the weekly shop is part of what living in
   * *this* flat costs, and Comparar is allowed to answer "what if I shopped
   * differently" with two scenarios rather than one.
   */
  purchases: Purchase[];
  note?: string;
}

/** App-level preferences. Not per-scenario, because they are not part of a budget. */
export interface Settings {
  /**
   * The max-rent rule of thumb, in percent of monthly income. The only
   * constant in the app, which is why it is an editable field and not a
   * literal in the code (CLAUDE.md § Taxes & local charges).
   */
  maxRentPercent: number;
}

/** The saved payload. `version` is what read-time backfill keys off (IND003). */
export interface SavedState {
  version: number;
  scenarios: Scenario[];
  activeScenarioId: string;
  compareIds: string[];
  settings: Settings;
  /**
   * The two grouping axes, app-wide rather than per-scenario.
   *
   * Shared on purpose: Comparar puts scenarios side by side, and a breakdown
   * can only be compared against another one drawn on the same axis. If each
   * scenario carried its own list, "Vivienda" in one would be a different
   * thing from "Vivienda" in the next and the comparison would quietly stop
   * meaning anything.
   */
  categories: Taxon[];
  rooms: Taxon[];
}
