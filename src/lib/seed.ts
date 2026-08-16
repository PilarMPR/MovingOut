/**
 * The checklist — docs/COST-CHECKLIST.md turned into entries.
 *
 * Deliberately no prices. Every row ships with a direction, a category, a real
 * frequency and a blank amount, because a number baked into a repo is stale
 * within a year and reads as authoritative anyway. The first time the user
 * fills one in, that becomes the first `history` revision, and everything
 * after it is a revision the Historial tab can show (IND002).
 *
 * The failure mode this list exists to prevent: a budget that looks fine, and
 * then month one costs 400 € more than planned because every item here is
 * individually too small to think about.
 *
 * **It is no longer poured into every new scenario.** A scenario starts blank
 * and this is a button in Ajustes, because the list is a prediction from a
 * document and the rows the user actually types are the real budget. Arriving
 * to 75 pre-written rows makes deleting the wrong ones the first task.
 */
import type { Category, Direction, Entry, Frequency, Priority, Room, Status, Taxon } from '../types';
import { es } from '../i18n/es';
import { newId } from './id';
import { defaultCategories, defaultRooms } from './taxonomy';

interface SeedSpec {
  key: string;
  direction: Direction;
  category: Category;
  frequency: Frequency;
  priority: Priority;
  status: Status;
  room?: Room;
  refundable?: boolean;
  shouldNotPay?: boolean;
}

const S = (
  key: string,
  category: Category,
  frequency: Frequency,
  priority: Priority,
  status: Status = 'activo',
  extra: Partial<SeedSpec> = {},
): SeedSpec => ({ key, direction: 'salida', category, frequency, priority, status, ...extra });

const IN = (key: string, frequency: Frequency): SeedSpec => ({
  key,
  direction: 'entrada',
  category: 'ingresos',
  frequency,
  priority: 'esencial',
  status: 'activo',
});

const COSTES: SeedSpec[] = [
  // ── vivienda ──
  S('alquiler', 'vivienda', 'mensual', 'esencial'),
  S('comunidad', 'vivienda', 'mensual', 'esencial'),
  S('fianza', 'vivienda', 'unico', 'esencial', 'pendiente', { refundable: true }),
  S('mesAnticipado', 'vivienda', 'unico', 'esencial', 'pendiente'),
  S('agencia', 'vivienda', 'unico', 'deseable', 'pendiente', { shouldNotPay: true }),
  S('aval', 'vivienda', 'unico', 'deseable', 'pendiente'),

  // ── impuestos y cargas ──
  S('seguroHogar', 'impuestos', 'anual', 'esencial', 'pendiente'),
  S('tasaBasuras', 'impuestos', 'anual', 'esencial', 'pendiente'),
  S('ibi', 'impuestos', 'anual', 'deseable', 'pausado'),

  // ── suministros ──
  S('luz', 'suministros', 'mensual', 'esencial'),
  S('agua', 'suministros', 'bimestral', 'esencial'),
  S('gas', 'suministros', 'bimestral', 'deseable'),
  S('internet', 'suministros', 'mensual', 'deseable'),
  S('movil', 'suministros', 'mensual', 'esencial'),
  S('revisionCaldera', 'suministros', 'anual', 'esencial', 'pendiente'),
  S('altasSuministros', 'suministros', 'unico', 'esencial', 'pendiente'),
  S('boletinElectrico', 'suministros', 'unico', 'deseable', 'pendiente'),

  // ── consumibles ──
  S('consumibles', 'consumibles', 'mensual', 'esencial'),
  S('higiene', 'consumibles', 'mensual', 'esencial'),
  S('botiquin', 'consumibles', 'anual', 'esencial', 'pendiente'),

  // ── alimentación ──
  S('compraSemanal', 'alimentacion', 'mensual', 'esencial'),
  S('primeraCompra', 'alimentacion', 'unico', 'esencial', 'pendiente'),
  S('comerFuera', 'alimentacion', 'mensual', 'deseable'),

  // ── transporte ──
  S('abonoTransporte', 'transporte', 'mensual', 'esencial'),
  S('viajesCasa', 'transporte', 'trimestral', 'deseable'),

  // ── ocio ──
  S('ocio', 'ocio', 'mensual', 'deseable'),
  S('suscripciones', 'ocio', 'anual', 'deseable'),
  S('gimnasio', 'ocio', 'mensual', 'deseable', 'pausado'),

  // ── fondos y otros ──
  S('colchonEmergencia', 'otros', 'mensual', 'esencial'),
  S('fondoElectrodomesticos', 'otros', 'mensual', 'esencial'),
  S('reparaciones', 'otros', 'mensual', 'esencial'),
  S('renovacionMovil', 'otros', 'mensual', 'deseable'),
  S('ropaCalzado', 'otros', 'trimestral', 'deseable'),
  S('peluqueria', 'otros', 'trimestral', 'deseable'),
  S('dentistaOptica', 'otros', 'anual', 'deseable', 'pendiente'),
  S('regalos', 'otros', 'anual', 'deseable'),
  S('empadronamiento', 'otros', 'unico', 'esencial', 'pendiente'),
  S('duplicadoLlaves', 'otros', 'unico', 'esencial', 'pendiente'),
  S('cambioCerradura', 'otros', 'unico', 'deseable', 'pendiente'),
  S('mudanza', 'otros', 'unico', 'esencial', 'pendiente'),
  S('cambioDomicilio', 'otros', 'unico', 'deseable', 'pendiente'),

  // ── entradas — lumpy on purpose, and the copy says so ──
  IN('beca', 'mensual'),
  IN('ayudaFamiliar', 'mensual'),
  IN('trabajoOcasional', 'mensual'),
];

const F = (key: string, room: Room, priority: Priority): SeedSpec => ({
  key,
  direction: 'salida',
  category: 'mobiliario',
  frequency: 'unico',
  priority,
  status: 'pendiente',
  room,
});

const MUEBLES: SeedSpec[] = [
  F('sartenesOllas', 'cocina', 'esencial'),
  F('cuchillosTabla', 'cocina', 'esencial'),
  F('vajilla', 'cocina', 'esencial'),
  F('escurreplatos', 'cocina', 'esencial'),
  F('tuppers', 'cocina', 'esencial'),
  F('microondas', 'cocina', 'esencial'),
  F('nevera', 'cocina', 'esencial'),
  F('lavadora', 'cocina', 'esencial'),
  F('cafetera', 'cocina', 'deseable'),
  F('mesaSillasCocina', 'cocina', 'deseable'),

  F('lamparaSalon', 'salon', 'esencial'),
  F('sofa', 'salon', 'deseable'),
  F('mesaComedor', 'salon', 'deseable'),
  F('sillas', 'salon', 'deseable'),
  F('estanteria', 'salon', 'deseable'),
  F('cortinas', 'salon', 'deseable'),

  F('colchon', 'dormitorio', 'esencial'),
  F('somier', 'dormitorio', 'esencial'),
  F('sabanas', 'dormitorio', 'esencial'),
  F('nordico', 'dormitorio', 'esencial'),
  F('almohadas', 'dormitorio', 'esencial'),
  F('armario', 'dormitorio', 'esencial'),
  F('mesillaLampara', 'dormitorio', 'deseable'),

  F('toallas', 'bano', 'esencial'),
  F('cortinaDucha', 'bano', 'esencial'),
  F('espejoBano', 'bano', 'deseable'),
  F('muebleBano', 'bano', 'deseable'),

  F('escobaFregona', 'otros', 'esencial'),
  F('tendedero', 'otros', 'esencial'),
  F('cestoRopa', 'otros', 'deseable'),
  F('aspiradora', 'otros', 'deseable'),
  F('planchaTabla', 'otros', 'deseable'),
  F('alfombras', 'otros', 'deseable'),
];

function toEntry(spec: SeedSpec, copy: Record<string, { label: string; note?: string }>): Entry {
  const text = copy[spec.key];
  const entry: Entry = {
    id: newId('e'),
    label: text === undefined ? spec.key : text.label,
    direction: spec.direction,
    category: spec.category,
    frequency: spec.frequency,
    priority: spec.priority,
    status: spec.status,
    // The checklist is a list of costs you *will* have, so every row is fijo.
    // Nothing in it is a possibility: the things that might happen are yours to
    // write in the colchón, and a shipped guess at your catastrophes would be
    // the same overreach as shipping prices.
    kind: 'fijo',
    // Blank, not zero: a zero is a claim, a dash is an admission.
    amountCents: 0,
    hasAmount: false,
    history: [],
  };
  if (spec.room !== undefined) entry.room = spec.room;
  if (spec.refundable === true) entry.refundable = true;
  if (spec.shouldNotPay === true) entry.shouldNotPay = true;
  if (text?.note !== undefined) entry.note = text.note;
  return entry;
}

/** Every checklist row: conceptos first, then furniture. */
export function seedEntries(): Entry[] {
  return [
    ...COSTES.map((spec) => toEntry(spec, es.seed)),
    ...MUEBLES.map((spec) => toEntry(spec, es.seedFurniture)),
  ];
}

/** How many rows the button is about to add, for the copy that warns about it. */
export function seedCount(): number {
  return COSTES.length + MUEBLES.length;
}

/**
 * The categories and rooms the checklist files itself under.
 *
 * Loading the checklist restores any of these that have since been binned:
 * without that, a row filed under a deleted category would land in Otros on
 * the next read, and thirty rows would arrive already collapsed into one heap.
 * Taxa that still exist keep the label they have now — restoring a list is not
 * a reason to undo a rename.
 */
export function seedTaxonomy(): { categories: Taxon[]; rooms: Taxon[] } {
  const categoryIds = new Set<Category>([...COSTES, ...MUEBLES].map((spec) => spec.category));
  const roomIds = new Set<Room>(
    MUEBLES.map((spec) => spec.room).filter((room): room is Room => room !== undefined),
  );
  return {
    categories: defaultCategories().filter((taxon) => categoryIds.has(taxon.id)),
    rooms: defaultRooms().filter((taxon) => roomIds.has(taxon.id)),
  };
}
