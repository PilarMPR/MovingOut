import { useState } from 'react';
import { AddRow } from '../components/AddRow';
import { EditableAmount, EditableText } from '../components/EditableCell';
import { Chip, FilterBar, FilterLabel } from '../components/FilterBar';
import { Panel } from '../components/Panel';
import { Select, StatusSelect } from '../components/Select';
import { es, plural } from '../i18n/es';
import { divisorLabel, toMonthly } from '../lib/frequency';
import { delta, formatDate } from '../lib/history';
import { formatEUR, formatPercent, formatSignedEUR, formatSignedPercent } from '../lib/money';
import type { Store } from '../state/store';
import {
  CATEGORIES,
  DIRECTIONS,
  FREQUENCIES,
  PRIORITIES,
  STATUSES,
  type Category,
  type Entry,
} from '../types';

export type DirectionFilter = 'all' | 'entrada' | 'salida';
export type PriorityFilter = 'all' | 'esencial' | 'deseable';
export type StatusFilter = 'all' | 'activo' | 'pausado' | 'pendiente';

export interface Filters {
  direction: DirectionFilter;
  priority: PriorityFilter;
  status: StatusFilter;
  category: Category | 'all';
  missingOnly: boolean;
}

export const NO_FILTERS: Filters = {
  direction: 'all',
  priority: 'all',
  status: 'all',
  category: 'all',
  missingOnly: false,
};

/** Filtering is a view concern, so it stays here rather than in src/lib. */
export function applyFilters(entries: Entry[], f: Filters): Entry[] {
  return entries.filter((entry) => {
    if (f.direction !== 'all' && entry.direction !== f.direction) return false;
    if (f.priority !== 'all' && entry.priority !== f.priority) return false;
    if (f.status !== 'all' && entry.status !== f.status) return false;
    if (f.category !== 'all' && entry.category !== f.category) return false;
    if (f.missingOnly && entry.hasAmount) return false;
    return true;
  });
}

/**
 * The monthly-equivalent cell. Four different answers, and only one of them is
 * a number — which is the point: `pausado` and `único` are decisions, and
 * printing a monthly figure for either would be a lie.
 */
function MonthlyEquivalent({ entry }: { entry: Entry }) {
  if (!entry.hasAmount) return <span className="eq none">{es.costes.empty}</span>;
  if (entry.status === 'pausado') return <span className="eq none">{es.costes.noCount}</span>;

  const monthly = toMonthly(entry.amountCents, entry.frequency);
  if (monthly === null) return <span className="eq none">{es.costes.oneOff}</span>;

  const divisor = divisorLabel(entry.frequency);
  const incoming = entry.direction === 'entrada';
  return (
    <span className={incoming ? 'eq in' : 'eq'}>
      {divisor !== '' && <span className="div">{divisor}</span>}
      {incoming ? formatSignedEUR(monthly) : formatEUR(monthly)}
    </span>
  );
}

interface RowProps {
  entry: Entry;
  store: Store;
  open: boolean;
  onToggle: () => void;
}

function Row({ entry, store, open, onToggle }: RowProps) {
  const incoming = entry.direction === 'entrada';
  const revisions = entry.history.length;
  const d = delta(entry);

  return (
    <>
      <tr className={entry.status === 'pausado' ? 'paused' : undefined}>
        <td>
          {revisions > 1 && (
            <button
              type="button"
              className="caret"
              aria-label={open ? es.costes.historyClose : es.costes.historyOpen}
              aria-expanded={open}
              onClick={onToggle}
            >
              {open ? '▾' : '▸'}
            </button>
          )}
        </td>
        <td>
          <EditableText
            value={entry.label}
            ariaLabel={es.costes.colConcept}
            onChange={(label) => store.patchEntry(entry.id, { label })}
          />
        </td>
        <td>
          <Select
            value={entry.direction}
            options={DIRECTIONS}
            labels={es.direction}
            ariaLabel={es.costes.colType}
            incoming={incoming}
            onChange={(direction) => store.patchEntry(entry.id, { direction })}
          />
        </td>
        <td>
          <Select
            value={entry.category}
            options={CATEGORIES}
            labels={es.category}
            ariaLabel={es.costes.colCategory}
            onChange={(category) => store.patchEntry(entry.id, { category })}
          />
        </td>
        <td>
          <Select
            value={entry.frequency}
            options={FREQUENCIES}
            labels={es.frequency}
            ariaLabel={es.costes.colFrequency}
            onChange={(frequency) => store.patchEntry(entry.id, { frequency })}
          />
        </td>
        <td>
          <Select
            value={entry.priority}
            options={PRIORITIES}
            labels={es.priority}
            ariaLabel={es.costes.colPriority}
            onChange={(priority) => store.patchEntry(entry.id, { priority })}
          />
        </td>
        <td>
          <StatusSelect
            value={entry.status}
            options={STATUSES}
            labels={es.status}
            ariaLabel={es.costes.colStatus}
            onChange={(status) => store.patchEntry(entry.id, { status })}
          />
        </td>
        <td className="r">
          <div className="amount">
            <EditableAmount
              cents={entry.amountCents}
              hasAmount={entry.hasAmount}
              emptyLabel={es.costes.empty}
              ariaLabel={es.costes.colAmount}
              onCommit={(cents) => store.reviseAmount(entry.id, cents)}
            />
            {d.vsOriginalPercent !== null && d.vsOriginalPercent !== 0 && (
              <span className={d.vsOriginalPercent > 0 ? 'delta up' : 'delta down'}>
                {(d.vsOriginalPercent > 0 ? '▲ ' : '▼ ') + formatPercent(Math.abs(d.vsOriginalPercent))}
              </span>
            )}
          </div>
        </td>
        <td className="r">
          <MonthlyEquivalent entry={entry} />
        </td>
        <td>
          <EditableText
            value={entry.note ?? ''}
            ariaLabel={es.costes.colNote}
            placeholder={es.costes.notePlaceholder}
            onChange={(note) => store.patchEntry(entry.id, { note })}
          />
        </td>
        <td>
          <button
            type="button"
            className="caret"
            aria-label={es.costes.delete}
            onClick={() => store.removeEntry(entry.id)}
          >
            ×
          </button>
        </td>
      </tr>

      {open && (
        <tr className="drawer">
          <td colSpan={11}>
            <div className="drawer-in">
              <div className="dh">
                {es.costes.historyTitle} · {revisions} {es.costes.historyRevisions}
              </div>
              {[...entry.history].reverse().map((revision, i) => {
                const index = revisions - 1 - i;
                const before = index > 0 ? entry.history[index - 1] : null;
                const first = entry.history[0];
                const vsPrev = before === null ? null : revision.amountCents - before.amountCents;
                const vsOrig =
                  index === 0 || first.amountCents === 0
                    ? null
                    : ((revision.amountCents - first.amountCents) / first.amountCents) * 100;
                return (
                  <div className="dl" key={`${revision.date}-${index}`}>
                    <span>{formatDate(revision.date)}</span>
                    <b>{formatEUR(revision.amountCents)}</b>
                    <span>
                      {vsPrev === null
                        ? es.costes.firstEstimate
                        : `${formatSignedEUR(vsPrev)} ${es.costes.vsPrevious}`}
                      {vsOrig !== null && ` · ${formatSignedPercent(vsOrig)} ${es.costes.vsOriginal}`}
                      {revision.note !== undefined && ` · ${revision.note}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

interface Props {
  store: Store;
  filters: Filters;
  onFilters: (filters: Filters) => void;
}

export function Costes({ store, filters, onFilters }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const { costes, coverage, totals } = store.derived;
  const rows = applyFilters(costes, filters);
  const missing = coverage.total - coverage.withAmount;

  const set = (patch: Partial<Filters>) => onFilters({ ...filters, ...patch });

  return (
    <Panel
      label={`${es.costes.panel} · ${costes.length}`}
      tone={missing > 0 ? 'amber' : 'green'}
      actions={
        <span>
          {coverage.withAmount} / {coverage.total} {es.costes.coverage}
          {missing > 0 && ` · ${missing} ${es.costes.coverageMissing}`}
        </span>
      }
    >
      <FilterBar>
        <FilterLabel>{es.costes.filterDirection}</FilterLabel>
        <Chip on={filters.direction === 'all'} onClick={() => set({ direction: 'all' })}>
          {es.costes.filterAll}
        </Chip>
        <Chip on={filters.direction === 'entrada'} onClick={() => set({ direction: 'entrada' })}>
          {es.costes.filterIn}
        </Chip>
        <Chip on={filters.direction === 'salida'} onClick={() => set({ direction: 'salida' })}>
          {es.costes.filterOut}
        </Chip>

        <FilterLabel gap>{es.costes.filterPriority}</FilterLabel>
        <Chip
          on={filters.priority === 'esencial'}
          onClick={() => set({ priority: filters.priority === 'esencial' ? 'all' : 'esencial' })}
        >
          {es.priority.esencial}
        </Chip>
        <Chip
          on={filters.priority === 'deseable'}
          onClick={() => set({ priority: filters.priority === 'deseable' ? 'all' : 'deseable' })}
        >
          {es.priority.deseable}
        </Chip>

        <FilterLabel gap>{es.costes.filterStatus}</FilterLabel>
        <Chip
          on={filters.status === 'activo'}
          onClick={() => set({ status: filters.status === 'activo' ? 'all' : 'activo' })}
        >
          {es.status.activo}
        </Chip>
        <Chip
          on={filters.status === 'pausado'}
          onClick={() => set({ status: filters.status === 'pausado' ? 'all' : 'pausado' })}
        >
          {es.status.pausado}
        </Chip>
        <Chip
          on={filters.status === 'pendiente'}
          onClick={() => set({ status: filters.status === 'pendiente' ? 'all' : 'pendiente' })}
        >
          {es.status.pendiente}
        </Chip>
        <Chip on={filters.missingOnly} onClick={() => set({ missingOnly: !filters.missingOnly })}>
          {es.costes.filterNoAmount}
        </Chip>

        <select
          className="chip spacer"
          value={filters.category}
          aria-label={es.costes.colCategory}
          onChange={(event) => set({ category: event.target.value as Category | 'all' })}
        >
          <option value="all">{es.costes.colCategory}</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {es.category[category]}
            </option>
          ))}
        </select>
      </FilterBar>

      <div className="tblwrap">
        <table className="tbl-costes">
          <thead>
            <tr>
              <th style={{ width: 20 }} />
              <th>{es.costes.colConcept}</th>
              <th>{es.costes.colType}</th>
              <th>{es.costes.colCategory}</th>
              <th>{es.costes.colFrequency}</th>
              <th>{es.costes.colPriority}</th>
              <th>{es.costes.colStatus}</th>
              <th className="r">{es.costes.colAmount}</th>
              <th className="r">{es.costes.colMonthly}</th>
              <th>{es.costes.colNote}</th>
              <th style={{ width: 20 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <Row
                key={entry.id}
                entry={entry}
                store={store}
                open={open === entry.id}
                onToggle={() => setOpen(open === entry.id ? null : entry.id)}
              />
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={11}>
                  <div className="empty-note">{es.costes.emptyList}</div>
                </td>
              </tr>
            )}

            <tr className="tot">
              <td colSpan={7}>{es.costes.totalRow}</td>
              <td className="r">
                {rows.length} {plural(rows.length, es.costes.totalConcept, es.costes.totalConcepts)}
              </td>
              <td className="r">
                <span className="eq in">{formatSignedEUR(totals.inCents)}</span>{' '}
                <span className="eq out">{formatSignedEUR(-totals.outCents)}</span>
              </td>
              <td>
                <span className={totals.balanceCents >= 0 ? 'eq in' : 'eq out'}>
                  = {formatSignedEUR(totals.balanceCents)}
                  {es.common.perMonth}
                </span>
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <AddRow label={es.costes.add} onClick={() => store.addEntry({ label: es.costes.newLabel })} />
    </Panel>
  );
}
