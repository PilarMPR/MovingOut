import { useState } from 'react';
import { AddRow } from '../components/AddRow';
import { Button } from '../components/Button';
import { EditableAmount, EditableText } from '../components/EditableCell';
import { Chip } from '../components/FilterBar';
import { DirectionSelect, Select, StatusSelect } from '../components/Select';
import { es } from '../i18n/es';
import { divisorLabel, toMonthly } from '../lib/frequency';
import { delta } from '../lib/history';
import { formatEUR, formatSignedEUR, formatSignedPercent } from '../lib/money';
import { idsOf, labelsOf } from '../lib/taxonomy';
import type { Store } from '../state/store';
import {
  DIRECTIONS,
  ENTRY_KINDS,
  FREQUENCIES,
  PRIORITIES,
  STATUSES,
  type Entry,
} from '../types';
import { Colchon } from './Colchon';
import { applyFilters, type Filters } from './Costes';

/**
 * The mobile fork — a different component from the same `Entry[]`, not a
 * responsive table (DESIGN-SYSTEM.md §6).
 *
 * Horizontal scroll with a frozen concepto column was the obvious answer and
 * it is the wrong one: on a phone the user is standing in a flat they are
 * viewing, checking one number. Two lines per card, everything else on tap,
 * status as a 3 px left edge, totals in a sticky footer.
 */

function secondLine(entry: Entry, categoryLabels: Record<string, string>): string {
  const category = categoryLabels[entry.category] ?? entry.category;
  const frequency = es.frequency[entry.frequency];
  return `${category} · ${frequency}`;
}

function MonthlyText({ entry }: { entry: Entry }) {
  if (!entry.hasAmount) return <span>{es.costes.filterNoAmount.toLowerCase()}</span>;
  if (entry.status === 'pausado') return <span>{es.costes.noCount}</span>;
  const monthly = toMonthly(entry.amountCents, entry.frequency);
  if (monthly === null) return <span>{es.costes.oneOff}</span>;
  const divisor = divisorLabel(entry.frequency);
  const incoming = entry.direction === 'entrada';
  return (
    <span>
      {divisor !== '' && <span className="div">{divisor} </span>}
      {'= '}
      {incoming ? formatSignedEUR(monthly) : formatEUR(monthly)}
      {es.common.perMonth}
    </span>
  );
}

interface CardProps {
  entry: Entry;
  store: Store;
  categoryIds: string[];
  categoryLabels: Record<string, string>;
  open: boolean;
  onToggle: () => void;
}

function Card({ entry, store, categoryIds, categoryLabels, open, onToggle }: CardProps) {
  const d = delta(entry);
  const dim = entry.status === 'pausado';

  return (
    <div className={`mcard s-${entry.status}${open ? ' open' : ''}${dim ? ' dim' : ''}`}>
      <button
        type="button"
        className="m1"
        onClick={onToggle}
        aria-expanded={open}
        style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', width: '100%' }}
      >
        <b>{entry.label}</b>
        <span className={entry.hasAmount ? undefined : 'empty'}>
          {entry.hasAmount ? formatEUR(entry.amountCents) : es.costes.empty}
        </span>
      </button>

      <div className="m2">
        <span>{secondLine(entry, categoryLabels)}</span>
        <span>
          <MonthlyText entry={entry} />
          {d.vsOriginalPercent !== null && d.vsOriginalPercent !== 0 && (
            <span className={d.vsOriginalPercent > 0 ? 'delta up' : 'delta down'}>
              {(d.vsOriginalPercent > 0 ? '▲ ' : '▼ ') + formatSignedPercent(d.vsOriginalPercent)}
            </span>
          )}
        </span>
      </div>

      {open && (
        <div className="mopen">
          <div className="mrow">
            <EditableText
              value={entry.label}
              ariaLabel={es.costes.colConcept}
              onChange={(label) => store.patchEntry(entry.id, { label })}
            />
          </div>
          <div className="mrow">
            <EditableAmount
              cents={entry.amountCents}
              hasAmount={entry.hasAmount}
              emptyLabel={es.costes.empty}
              ariaLabel={es.costes.colAmount}
              onCommit={(cents) => store.reviseAmount(entry.id, cents)}
            />
          </div>
          <div className="mrow">
            <StatusSelect
              value={entry.status}
              options={STATUSES}
              labels={es.status}
              ariaLabel={es.costes.colStatus}
              onChange={(status) => store.patchEntry(entry.id, { status })}
            />
            <DirectionSelect
              value={entry.direction}
              options={DIRECTIONS}
              labels={es.direction}
              ariaLabel={es.costes.colType}
              onChange={(direction) => store.patchEntry(entry.id, { direction })}
            />
            <Select
              value={entry.frequency}
              options={FREQUENCIES}
              labels={es.frequency}
              ariaLabel={es.costes.colFrequency}
              onChange={(frequency) => store.patchEntry(entry.id, { frequency })}
            />
            <Select
              value={entry.kind}
              options={ENTRY_KINDS}
              labels={es.kind}
              ariaLabel={es.costes.colKind}
              onChange={(kind) => store.patchEntry(entry.id, { kind })}
            />
            <Select
              value={entry.category}
              options={categoryIds}
              labels={categoryLabels}
              ariaLabel={es.costes.colCategory}
              onChange={(category) => store.patchEntry(entry.id, { category })}
            />
            <Select
              value={entry.priority}
              options={PRIORITIES}
              labels={es.priority}
              ariaLabel={es.costes.colPriority}
              onChange={(priority) => store.patchEntry(entry.id, { priority })}
            />
          </div>
          <div className="mrow">
            <EditableText
              value={entry.note ?? ''}
              ariaLabel={es.costes.colNote}
              placeholder={es.costes.notePlaceholder}
              onChange={(note) => store.patchEntry(entry.id, { note })}
            />
          </div>
          {entry.history.length > 1 && (
            <div className="micro">
              {es.costes.historyTitle} · {entry.history.length} {es.costes.historyRevisions}
            </div>
          )}
          <div className="mrow">
            <Button small danger onClick={() => store.removeEntry(entry.id)}>
              {es.costes.delete}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  store: Store;
  filters: Filters;
  onFilters: (filters: Filters) => void;
}

export function CostesMobile({ store, filters, onFilters }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const { costes, totals, verdict } = store.derived;
  const categoryIds = idsOf(store.state.categories);
  const categoryLabels = labelsOf(store.state.categories);

  // There is no category chip on a phone, so a category filter set on the
  // desktop grid could hide everything here with nothing on screen to undo it.
  const live: Filters =
    filters.category === 'all' || categoryLabels[filters.category] !== undefined
      ? filters
      : { ...filters, category: 'all' };

  const rows = applyFilters(costes, live);
  const set = (patch: Partial<Filters>) => onFilters({ ...live, ...patch });

  // The footer figure takes the verdict's colour, not the raw sign: a balance
  // of +8 € is positive and still not a yes.
  const footTone = verdict === 'falta' ? 'neg' : verdict === 'justo' ? 'warn' : verdict === 'ok' ? 'pos' : '';

  return (
    <>
      <div className="mbar">
        <Chip
          on={filters.direction === 'all' && !filters.missingOnly && filters.priority === 'all'}
          onClick={() => onFilters({ ...live, direction: 'all', priority: 'all', missingOnly: false })}
        >
          {es.costes.filterAll}
        </Chip>
        <Chip on={filters.direction === 'salida'} onClick={() => set({ direction: 'salida' })}>
          {es.costes.filterOut}
        </Chip>
        <Chip on={filters.direction === 'entrada'} onClick={() => set({ direction: 'entrada' })}>
          {es.costes.filterIn}
        </Chip>
        <Chip
          on={filters.priority === 'esencial'}
          onClick={() => set({ priority: filters.priority === 'esencial' ? 'all' : 'esencial' })}
        >
          {es.priority.esencial}
        </Chip>
        <Chip on={filters.missingOnly} onClick={() => set({ missingOnly: !filters.missingOnly })}>
          {es.costes.filterNoAmount}
        </Chip>
      </div>

      {rows.length === 0 && (
        <div className="empty-note">
          {costes.length === 0 ? es.costes.emptyScenario : es.costes.emptyList}
        </div>
      )}

      {rows.map((entry) => (
        <Card
          key={entry.id}
          entry={entry}
          store={store}
          categoryIds={categoryIds}
          categoryLabels={categoryLabels}
          open={open === entry.id}
          onToggle={() => setOpen(open === entry.id ? null : entry.id)}
        />
      ))}

      <div className="mfoot">
        <b>{es.resumen.kpiBalance}</b>
        <span className={footTone === '' ? undefined : footTone}>
          {formatSignedEUR(totals.balanceCents)}
          {es.common.perMonth}
        </span>
      </div>

      <AddRow label={es.costes.add} onClick={() => store.addEntry({ label: es.costes.newLabel })} />

      {/* The cushion is part of Costes on a phone too. It sits after the add-row
          because it is the second thing you write, not the second thing you
          read: possibilities are noted once and revisited rarely. */}
      <div className="pad">
        <Colchon store={store} />
      </div>
    </>
  );
}
