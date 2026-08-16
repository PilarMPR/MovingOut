import { useState } from 'react';
import { AddRow } from '../components/AddRow';
import { EditableAmount, EditableText } from '../components/EditableCell';
import { Chip, FilterBar, FilterLabel } from '../components/FilterBar';
import { Panel } from '../components/Panel';
import { Colchon } from './Colchon';
import { DirectionSelect, Select, StatusSelect } from '../components/Select';
import { es, plural } from '../i18n/es';
import { toMonthly } from '../lib/frequency';
import { delta, formatDate } from '../lib/history';
import { formatEUR, formatSignedEUR, formatSignedPercent } from '../lib/money';
import { idsOf, labelsOf } from '../lib/taxonomy';
import type { Store } from '../state/store';
import {
  DIRECTIONS,
  ENTRY_KINDS,
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

export function isFiltered(f: Filters): boolean {
  return (
    f.direction !== 'all' ||
    f.priority !== 'all' ||
    f.status !== 'all' ||
    f.category !== 'all' ||
    f.missingOnly
  );
}

/**
 * The monthly-equivalent cell. Four different answers, and only one of them is
 * a number — which is the point: `pausado` and `único` are decisions, and
 * printing a monthly figure for either would be a lie.
 *
 * The line under it says which real frequency the figure was normalised from,
 * because a bimonthly bill divided by two looks exactly like a monthly one.
 */
function MonthlyEquivalent({ entry }: { entry: Entry }) {
  if (!entry.hasAmount) return <span className="eq none">{es.costes.empty}</span>;
  if (entry.status === 'pausado') return <span className="eq none">{es.costes.noCount}</span>;

  const monthly = toMonthly(entry.amountCents, entry.frequency);
  if (monthly === null) {
    return (
      <>
        <span className="eq oneoff">{formatEUR(entry.amountCents)}</span>
        <span className="eqnote">{es.costes.eqOneOff}</span>
      </>
    );
  }

  const incoming = entry.direction === 'entrada';
  return (
    <>
      <span className={incoming ? 'eq in' : 'eq'}>
        {incoming ? formatSignedEUR(monthly) : formatEUR(monthly)}
      </span>
      {entry.frequency !== 'mensual' && (
        <span className="eqnote">
          {es.costes.eqFrom} {es.frequency[entry.frequency]}
        </span>
      )}
    </>
  );
}

interface RowProps {
  entry: Entry;
  store: Store;
  /** The live category list, built once per render rather than once per row. */
  categoryIds: string[];
  categoryLabels: Record<string, string>;
  open: boolean;
  onToggle: () => void;
}

function Row({ entry, store, categoryIds, categoryLabels, open, onToggle }: RowProps) {
  const incoming = entry.direction === 'entrada';
  const revisions = entry.history.length;
  const d = delta(entry);

  // The counter is also the drawer's handle, and its tint is the direction of
  // the last revision — so the row keeps the at-a-glance "this moved" signal
  // that a bare count cannot carry, without spending a column on it.
  const histClass = [
    'hist',
    revisions < 2 ? 'off' : '',
    open ? 'on' : '',
    !open && d.vsPreviousCents !== null && d.vsPreviousCents > 0 ? 'up' : '',
    !open && d.vsPreviousCents !== null && d.vsPreviousCents < 0 ? 'down' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const rowClass = [entry.status === 'pausado' ? 'paused' : '', incoming ? 'in' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <tr className={rowClass === '' ? undefined : rowClass}>
        <td>
          <div className="concepto">
            <span className={incoming ? 'ddot in' : 'ddot'} />
            <EditableText
              value={entry.label}
              ariaLabel={es.costes.colConcept}
              onChange={(label) => store.patchEntry(entry.id, { label })}
            />
          </div>
        </td>
        <td>
          <DirectionSelect
            value={entry.direction}
            options={DIRECTIONS}
            labels={es.direction}
            ariaLabel={es.costes.colType}
            onChange={(direction) => store.patchEntry(entry.id, { direction })}
          />
        </td>
        <td>
          {/* Retagging a row `crítico` here makes it leave the grid and appear
              in the colchón below — the honest consequence of saying it has not
              happened, and reversible from the same control down there. */}
          <Select
            value={entry.kind}
            options={ENTRY_KINDS}
            labels={es.kind}
            ariaLabel={es.costes.colKind}
            variant={entry.kind === 'esporadico' ? 'plain' : 'strong'}
            onChange={(kind) => store.patchEntry(entry.id, { kind })}
          />
        </td>
        <td>
          <Select
            value={entry.category}
            options={categoryIds}
            labels={categoryLabels}
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
            variant={entry.frequency === 'unico' ? 'oneoff' : 'plain'}
            onChange={(frequency) => store.patchEntry(entry.id, { frequency })}
          />
        </td>
        <td>
          <Select
            value={entry.priority}
            options={PRIORITIES}
            labels={es.priority}
            ariaLabel={es.costes.colPriority}
            variant={entry.priority === 'esencial' ? 'strong' : 'plain'}
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
        <td>
          <div className="amount">
            <EditableAmount
              cents={entry.amountCents}
              hasAmount={entry.hasAmount}
              emptyLabel={es.costes.empty}
              ariaLabel={es.costes.colAmount}
              onCommit={(cents) => store.reviseAmount(entry.id, cents)}
            />
            <span className="cur">{es.common.euro}</span>
          </div>
        </td>
        <td className="r">
          <MonthlyEquivalent entry={entry} />
        </td>
        <td>
          <div className="rowend">
            <EditableText
              value={entry.note ?? ''}
              ariaLabel={es.costes.colNote}
              placeholder={es.costes.notePlaceholder}
              onChange={(note) => store.patchEntry(entry.id, { note })}
            />
            <button
              type="button"
              className={histClass}
              disabled={revisions < 2}
              aria-label={open ? es.costes.historyClose : es.costes.historyOpen}
              aria-expanded={open}
              title={es.costes.historyTitle}
              onClick={onToggle}
            >
              {revisions < 2 ? '·' : revisions}
            </button>
            <button
              type="button"
              className="hist off"
              aria-label={es.costes.delete}
              onClick={() => store.removeEntry(entry.id)}
            >
              ×
            </button>
          </div>
        </td>
      </tr>

      {open && (
        <tr className="drawer">
          <td colSpan={10}>
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
  const { costes, coverage, totals, verdict } = store.derived;
  const categoryIds = idsOf(store.state.categories);
  const categoryLabels = labelsOf(store.state.categories);

  // A category filter can outlive the category it points at — bin "Ocio" while
  // filtering by it and the grid would go blank with no way back. Treat a dead
  // filter as no filter rather than as an empty result.
  const live: Filters =
    filters.category === 'all' || categoryLabels[filters.category] !== undefined
      ? filters
      : { ...filters, category: 'all' };

  const rows = applyFilters(costes, live);
  const missing = coverage.total - coverage.withAmount;

  const set = (patch: Partial<Filters>) => onFilters({ ...live, ...patch });

  const balanceTone =
    verdict === 'falta' ? 'neg' : verdict === 'justo' ? 'warn' : verdict === 'ok' ? 'pos' : 'quiet';

  // Two sections of one screen: what will cost money, then what might. The
  // stack is what stops them reading as one list — see tabs/Colchon.tsx.
  return (
    <div className="stack">
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
          value={live.category}
          aria-label={es.costes.colCategory}
          onChange={(event) => set({ category: event.target.value as Category | 'all' })}
        >
          <option value="all">{es.costes.colCategory}</option>
          {store.state.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </FilterBar>

      <div className="tblwrap">
        <table className="tbl-costes">
          <thead>
            <tr>
              <th>{es.costes.colConcept}</th>
              <th>{es.costes.colType}</th>
              <th>{es.costes.colKind}</th>
              <th>{es.costes.colCategory}</th>
              <th>{es.costes.colFrequency}</th>
              <th>{es.costes.colPriority}</th>
              <th>{es.costes.colStatus}</th>
              <th className="r">{es.costes.colAmount}</th>
              <th className="r">{es.costes.colMonthly}</th>
              <th>{es.costes.colNote}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <Row
                key={entry.id}
                entry={entry}
                store={store}
                categoryIds={categoryIds}
                categoryLabels={categoryLabels}
                open={open === entry.id}
                onToggle={() => setOpen(open === entry.id ? null : entry.id)}
              />
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={10}>
                  {/* An empty scenario and an over-filtered one look identical
                      and mean opposite things, so they say different words. */}
                  <div className="empty-note">
                    {costes.length === 0 ? es.costes.emptyScenario : es.costes.emptyList}
                  </div>
                </td>
              </tr>
            )}

            {/* The three figures the grid exists to produce, at the foot of the
                grid that produced them — normalised to the month, always. */}
            <tr className="tot">
              <td colSpan={10}>
                <div className="totstrip">
                  <span>
                    {es.costes.totalRow} ·{' '}
                    {isFiltered(live) ? es.costes.totalFiltered : es.costes.totalAll} ·{' '}
                    {rows.length}{' '}
                    {plural(rows.length, es.costes.totalConcept, es.costes.totalConcepts)}
                  </span>
                  <div className="tgap" />
                  <div className="tcol">
                    {es.costes.filterIn}
                    <span className="tv pos">{formatEUR(totals.inCents)}</span>
                  </div>
                  <div className="tcol">
                    {es.costes.filterOut}
                    <span className="tv neg">{formatEUR(totals.outCents)}</span>
                  </div>
                  <div className="tcol">
                    {es.costes.totalBalance}
                    <span className={`tv ${balanceTone}`}>
                      {formatSignedEUR(totals.balanceCents)}
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <AddRow label={es.costes.add} onClick={() => store.addEntry({ label: es.costes.newLabel })} />
      </Panel>

      <Colchon store={store} />
    </div>
  );
}
