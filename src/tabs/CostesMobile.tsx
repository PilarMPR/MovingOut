import { useState } from 'react';
import { AddRow } from '../components/AddRow';
import { Button } from '../components/Button';
import { EditableAmount, EditableText } from '../components/EditableCell';
import { Chip } from '../components/FilterBar';
import { Select, StatusSelect } from '../components/Select';
import { es } from '../i18n/es';
import { divisorLabel, toMonthly } from '../lib/frequency';
import { delta } from '../lib/history';
import { formatEUR, formatSignedEUR, formatSignedPercent } from '../lib/money';
import type { Store } from '../state/store';
import {
  CATEGORIES,
  DIRECTIONS,
  FREQUENCIES,
  PRIORITIES,
  STATUSES,
  type Entry,
} from '../types';
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

function secondLine(entry: Entry): string {
  const category = es.category[entry.category];
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
  open: boolean;
  onToggle: () => void;
}

function Card({ entry, store, open, onToggle }: CardProps) {
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
        <span>{secondLine(entry)}</span>
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
            <Select
              value={entry.direction}
              options={DIRECTIONS}
              labels={es.direction}
              ariaLabel={es.costes.colType}
              incoming={entry.direction === 'entrada'}
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
              value={entry.category}
              options={CATEGORIES}
              labels={es.category}
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
  const { costes, totals } = store.derived;
  const rows = applyFilters(costes, filters);
  const set = (patch: Partial<Filters>) => onFilters({ ...filters, ...patch });

  return (
    <>
      <div className="mbar">
        <Chip
          on={filters.direction === 'all' && !filters.missingOnly && filters.priority === 'all'}
          onClick={() => onFilters({ ...filters, direction: 'all', priority: 'all', missingOnly: false })}
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

      {rows.length === 0 && <div className="empty-note">{es.costes.emptyList}</div>}

      {rows.map((entry) => (
        <Card
          key={entry.id}
          entry={entry}
          store={store}
          open={open === entry.id}
          onToggle={() => setOpen(open === entry.id ? null : entry.id)}
        />
      ))}

      <div className="mfoot">
        <b>{es.resumen.kpiBalance}</b>
        <span className={totals.balanceCents >= 0 ? 'pos' : 'neg'}>
          {formatSignedEUR(totals.balanceCents)}
          {es.common.perMonth}
        </span>
      </div>

      <AddRow label={es.costes.add} onClick={() => store.addEntry({ label: es.costes.newLabel })} />
    </>
  );
}
