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

export const CATEGORIES = [
  'vivienda',
  'suministros',
  'consumibles',
  'alimentacion',
  'transporte',
  'ocio',
  'impuestos',
  'ingresos',
  'mobiliario',
  'otros',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const FREQUENCIES = ['mensual', 'bimestral', 'trimestral', 'anual', 'unico'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const PRIORITIES = ['esencial', 'deseable'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ['activo', 'pausado', 'pendiente', 'pagado'] as const;
export type Status = (typeof STATUSES)[number];

export const ROOMS = ['cocina', 'salon', 'dormitorio', 'bano', 'otros'] as const;
export type Room = (typeof ROOMS)[number];

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
  /** Furniture only. */
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
}
