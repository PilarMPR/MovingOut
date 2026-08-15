/**
 * The Presupuesto template — the user's own spreadsheet, turned into a scenario.
 *
 * `seed.ts` next door is the opposite move: a checklist of *what to think
 * about*, deliberately without prices. This is a *worked budget* — the
 * "PRESUPUESTO MENSUAL · Madrid" sheet, with its figures, its notes and its
 * three groups intact — so the app can answer the question the sheet already
 * answers, and keep answering it as the numbers move.
 *
 * **This is the one module in the repo that carries amounts, and that is a
 * deliberate exception rather than a precedent.** The rule the others live
 * under (CLAUDE.md § Taxes & local charges) is about *published* figures —
 * rates, caps, official prices — which go stale every year and read as
 * authoritative anyway. These are the user's own estimates for their own
 * budget. Each one arrives as the first `history` revision of its row, which is
 * what makes revising it later measurable as drift instead of silently
 * rewriting the original (IND002).
 *
 * Three decisions worth knowing before editing this:
 *
 *   · **The category axis is mixed on purpose.** Every fixed cost has a real
 *     domestic home, so alquiler files under `vivienda` and comida under
 *     `alimentacion`, exactly where they would land if you typed them. The two
 *     groupings the shipped list has no home for — the prorated irregulars and
 *     the emergency fund — become two new categories, because otherwise twelve
 *     rows collapse into Otros and the breakdown stops saying anything.
 *
 *   · **The esporádicos are monthly provisions, and their notes say so.** The
 *     sheet column is headed "media mensual": 30 €/mes of clothes is a yearly
 *     spend divided by twelve, not a monthly bill. `mensual` is therefore the
 *     real frequency *of the provision*. IND004 forbids summing a bimonthly
 *     water bill as though it were monthly; there is no such row here.
 *
 *   · **The five contingencies arrive `pausado`.** They are the arithmetic
 *     behind the buffer target, not costs. Entered live they would be one-offs
 *     and land in `upfrontCash`, claiming you need 8.400 € before you can sleep
 *     there. Paused, they stay visible as the reasoning and count toward
 *     nothing — which is exactly what `pausado` is for.
 */
import type {
  Category,
  Cents,
  Direction,
  Entry,
  Frequency,
  IsoDate,
  Priority,
  Scenario,
  Status,
  Taxon,
} from '../types';
import { es } from '../i18n/es';
import { today } from './history';
import { newId } from './id';
import { defaultCategories } from './taxonomy';

/** Every figure in the sheet is a whole euro. This is the only place they convert (IND001). */
const CENTS_PER_EURO = 100;

/**
 * The two groupings the shipped category list has no home for. Plain slugs
 * rather than generated ids, like the shipped set: ids are permanent, and a
 * readable one is easier to recognise in an exported JSON. Both are ordinary
 * categories once they land — renameable, and deletable in Ajustes.
 */
const SPORADIC: Category = 'esporadicos';
const EMERGENCY: Category = 'catastrofe';

interface Row {
  /** Key into `es.template.rows`. The label and note are copy, never code (IND008). */
  key: string;
  direction: Direction;
  category: Category;
  frequency: Frequency;
  priority: Priority;
  status: Status;
  /** The sheet's figure, in whole euros. */
  euros: number;
}

/** A live monthly cost. */
const monthly = (
  key: string,
  category: Category,
  euros: number,
  priority: Priority = 'esencial',
): Row => ({
  key,
  direction: 'salida',
  category,
  frequency: 'mensual',
  priority,
  status: 'activo',
  euros,
});

const income = (key: string, euros: number): Row => ({
  key,
  direction: 'entrada',
  category: 'ingresos',
  frequency: 'mensual',
  priority: 'esencial',
  status: 'activo',
  euros,
});

/** One line of the sheet's catástrofe column: what the fund is *for*. Never a total. */
const contingency = (key: string, euros: number): Row => ({
  key,
  direction: 'salida',
  category: EMERGENCY,
  frequency: 'unico',
  priority: 'esencial',
  status: 'pausado',
  euros,
});

// ── the sheet, column by column ──────────────────────────────────────────

const ENTRADAS: Row[] = [income('ingresoNeto', 1570)];

/** GASTOS FIJOS. Filed by domain, because every one of these has one. */
const FIJOS: Row[] = [
  monthly('alquiler', 'vivienda', 650),
  monthly('comida', 'alimentacion', 290),
  monthly('transporte', 'transporte', 20),
  monthly('suministros', 'suministros', 70),
  monthly('internet', 'suministros', 12, 'deseable'),
  monthly('movil', 'suministros', 10),
  monthly('medicina', 'consumibles', 1),
  monthly('suscripciones', 'ocio', 0, 'deseable'),
];

/**
 * GASTOS ESPORÁDICOS — the sheet's prorated averages. `ocio` keeps its own
 * category because the app already has one that fits; the rest have no home
 * outside Otros, which is what the new category is for.
 */
const ESPORADICOS: Row[] = [
  monthly('ropa', SPORADIC, 30, 'deseable'),
  monthly('ocio', 'ocio', 60, 'deseable'),
  monthly('regalos', SPORADIC, 20, 'deseable'),
  monthly('peluqueria', SPORADIC, 15, 'deseable'),
  monthly('mantenimiento', SPORADIC, 15),
  monthly('viajes', SPORADIC, 50, 'deseable'),
  monthly('materialTecnico', SPORADIC, 0, 'deseable'),
];

/** GASTOS CATÁSTROFE. One live row builds the fund; five paused ones size it. */
const FONDO: Row[] = [monthly('aportacionFondo', EMERGENCY, 100)];

const CONTINGENCIAS: Row[] = [
  contingency('portatil', 2100),
  contingency('electrodomestico', 400),
  contingency('urgenciaMedica', 500),
  contingency('perdidaTrabajo', 5000),
  contingency('reparacionImprevista', 400),
];

const ROWS: Row[] = [...ENTRADAS, ...FIJOS, ...ESPORADICOS, ...FONDO, ...CONTINGENCIAS];

// ── building the scenario ────────────────────────────────────────────────

function toEntry(row: Row, date: IsoDate): Entry {
  const copy = es.template.rows[row.key];
  const amountCents = row.euros * CENTS_PER_EURO;
  const entry: Entry = {
    id: newId('e'),
    label: copy === undefined ? row.key : copy.label,
    direction: row.direction,
    category: row.category,
    frequency: row.frequency,
    priority: row.priority,
    status: row.status,
    amountCents,
    hasAmount: true,
    // The figure the template arrives with *is* the original estimate, so it
    // has to be in the log from the start. Without it, the user's first edit
    // would be recorded as the original and the drift against the sheet would
    // be lost the moment it became interesting.
    history: [{ date, amountCents, note: es.template.revisionNote }],
  };
  if (copy?.note !== undefined) entry.note = copy.note;
  return entry;
}

/**
 * The colchón target: the five contingencies added up, rather than the 8.400 €
 * the sheet prints. Same number, but derived — so editing a contingency can
 * never leave the target quietly disagreeing with its own arithmetic.
 */
export function templateBufferTargetCents(): Cents {
  let total = 0;
  for (const row of CONTINGENCIAS) total += row.euros * CENTS_PER_EURO;
  return total;
}

/**
 * Every category the template files under, including the ones it invents.
 *
 * Merged rather than replaced by the caller: a category the user has since
 * binned has to come back, or a third of these rows would land in Otros on the
 * next read. Categories that survive keep the label they have now — restoring
 * a list is not a reason to undo a rename. Same contract as `seedTaxonomy()`.
 */
export function templateCategories(): Taxon[] {
  const used = new Set(ROWS.map((row) => row.category));
  const invented: Taxon[] = [
    { id: SPORADIC, label: es.template.category.esporadicos },
    { id: EMERGENCY, label: es.template.category.catastrofe },
  ];
  return [
    ...defaultCategories().filter((taxon) => used.has(taxon.id)),
    ...invented.filter((taxon) => used.has(taxon.id)),
  ];
}

/**
 * A whole scenario, not a pile of rows poured into the open one.
 *
 * The sheet carries a situación, a savings position and a colchón target as
 * well as its conceptos, and those are scenario-level fields — pouring the rows
 * into whatever is open would either overwrite them or leave the figures
 * describing somebody else's budget.
 */
export function templateScenario(name: string): Scenario {
  const date = today();
  return {
    id: newId('s'),
    name,
    // The sheet is built on a net salary, which is the whole point of situación
    // being a property of the scenario: "what if I get a job" is another one.
    situacion: 'empleado',
    createdAt: date,
    // The sheet's projection starts from zero and accumulates the free saving.
    savingsCents: 0,
    buffer: { targetCents: templateBufferTargetCents() },
    entries: ROWS.map((row) => toEntry(row, date)),
    projects: [],
  };
}

/** How many rows the button is about to create, for the copy that warns about it. */
export function templateCount(): number {
  return ROWS.length;
}
