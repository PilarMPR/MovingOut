import { useState } from 'react';
import { AddRow } from '../components/AddRow';
import { EditableAmount, EditableText } from '../components/EditableCell';
import { Chip, FilterBar, FilterLabel } from '../components/FilterBar';
import { Insight } from '../components/Insight';
import { KpiCard } from '../components/KpiCard';
import { Panel } from '../components/Panel';
import { Select } from '../components/Select';
import { es, plural } from '../i18n/es';
import { formatDate } from '../lib/history';
import { formatEUR, formatPercent } from '../lib/money';
import { MONTH_DAYS_LABEL, byProduct, hasAmount, monthOf, sumAmounts } from '../lib/purchases';
import { idsOf, labelOf, labelsOf } from '../lib/taxonomy';
import type { Store } from '../state/store';
import type { Category, Purchase } from '../types';

type View = 'all' | 'month';

/**
 * The shopping log: what was actually bought, by product, and what that works
 * out at per month.
 *
 * It is the only screen in the app that records spending rather than
 * estimating it, and everything on it is arranged around the one risk that
 * creates — that the same food ends up counted twice, once here and once as a
 * "Compra semanal" estimate in Costes. The warning for that sits above the
 * table rather than below it, because by the time you have scrolled past the
 * grid you have already stopped reading.
 */
function OverlapWarning({ store }: { store: Store }) {
  const { overlaps } = store.derived;
  if (overlaps.length === 0) return null;

  return (
    <Insight label={es.compras.overlapLabel} tone="amber">
      {overlaps.map((overlap) => (
        <span key={overlap.category}>
          {es.compras.overlapPrefix} <b>{labelOf(store.state.categories, overlap.category)}</b>{' '}
          {es.compras.overlapMiddle} <b>{overlap.entryIds.length}</b>{' '}
          {plural(
            overlap.entryIds.length,
            es.compras.overlapEstimateOne,
            es.compras.overlapEstimateMany,
          )}{' '}
          {es.compras.overlapSuffix}{' '}
          <em>
            {formatEUR(overlap.loggedMonthlyCents)} {es.compras.overlapCompare}{' '}
            {formatEUR(overlap.estimateMonthlyCents)}
            {es.common.perMonth}.
          </em>{' '}
        </span>
      ))}
      <span className="row-actions" style={{ marginTop: 8 }}>
        <button
          type="button"
          className="btn sm"
          onClick={() => store.pauseEntries(overlaps.flatMap((overlap) => overlap.entryIds))}
        >
          {es.compras.overlapButton}
        </button>
        <span className="micro">{es.compras.overlapButtonNote}</span>
      </span>
    </Insight>
  );
}

interface RowProps {
  purchase: Purchase;
  store: Store;
  categoryIds: string[];
  categoryLabels: Record<string, string>;
}

function Row({ purchase, store, categoryIds, categoryLabels }: RowProps) {
  return (
    <tr>
      <td>
        {/* Renders in the *browser's* locale, not the document's — a known
            soft spot, and still worth the native picker on a phone. */}
        <input
          className="ie date"
          type="date"
          value={purchase.date}
          aria-label={es.compras.colDate}
          onChange={(event) => store.patchPurchase(purchase.id, { date: event.target.value })}
        />
      </td>
      <td>
        <EditableText
          value={purchase.product}
          ariaLabel={es.compras.colProduct}
          onChange={(product) => store.patchPurchase(purchase.id, { product })}
        />
      </td>
      <td>
        <Select
          value={purchase.category}
          options={categoryIds}
          labels={categoryLabels}
          ariaLabel={es.compras.colCategory}
          onChange={(category) => store.patchPurchase(purchase.id, { category })}
        />
      </td>
      <td>
        <div className="amount">
          {/* No revision is pushed: correcting what you paid is fixing a typo,
              not changing your mind about a forecast. Clearing the cell leaves
              a zero, which is the blank on a Purchase (types.ts).

              No trailing `.cur` span either, unlike the Costes grid: the cell
              at rest already renders `6,90 €` through formatEUR, and this
              column is wide enough to show all of it — so the unit beside it
              would read as a second euro sign rather than as a unit. */}
          <EditableAmount
            cents={purchase.amountCents}
            hasAmount={hasAmount(purchase)}
            emptyLabel={es.compras.empty}
            ariaLabel={es.compras.colAmount}
            onCommit={(cents) => store.patchPurchase(purchase.id, { amountCents: cents ?? 0 })}
          />
        </div>
      </td>
      <td>
        <div className="rowend">
          <EditableText
            value={purchase.note ?? ''}
            ariaLabel={es.compras.colNote}
            placeholder={es.compras.notePlaceholder}
            onChange={(note) => store.patchPurchase(purchase.id, { note })}
          />
          <button
            type="button"
            className="hist off"
            aria-label={es.compras.delete}
            onClick={() => store.removePurchase(purchase.id)}
          >
            ×
          </button>
        </div>
      </td>
    </tr>
  );
}

export function Compras({ store }: { store: Store }) {
  const [view, setView] = useState<View>('all');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const { scenario, derived } = store;
  const { spend } = derived;

  const categoryIds = idsOf(store.state.categories);
  const categoryLabels = labelsOf(store.state.categories);
  const currentMonth = monthOf(store.todayDate);

  // Newest first, and a copy before sorting: the stored order is the order rows
  // were added, and the grid is not allowed to rewrite it.
  const rows = [...scenario.purchases]
    .filter((purchase) => {
      if (view === 'month' && monthOf(purchase.date) !== currentMonth) return false;
      if (category !== 'all' && purchase.category !== category) return false;
      return true;
    })
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));

  const shown = sumAmounts(rows);
  const products = byProduct(scenario.purchases, store.todayDate);

  return (
    <div className="stack">
      <div className="kgrid k4">
        <KpiCard
          label={es.compras.kpiMonthly}
          cents={spend.count === 0 ? undefined : spend.monthlyCents}
          value={spend.count === 0 ? es.common.none : undefined}
          tone={spend.count === 0 ? 'plain' : 'neg'}
          sub={
            spend.count === 0 ? (
              es.compras.kpiMonthlyEmpty
            ) : (
              <>
                {es.compras.kpiMonthlySub} {MONTH_DAYS_LABEL}
                {spend.provisional && (
                  <>
                    <br />
                    {es.compras.kpiMonthlyProvisional}
                  </>
                )}
              </>
            )
          }
        />
        <KpiCard
          label={es.compras.kpiPerDay}
          cents={spend.count === 0 ? undefined : spend.perDayCents}
          value={spend.count === 0 ? es.common.none : undefined}
          sub={
            spend.firstDate === null ? (
              es.compras.kpiPerDayEmpty
            ) : (
              <>
                {spend.days} {es.compras.kpiPerDaySubPrefix} {formatDate(spend.firstDate)}
              </>
            )
          }
        />
        <KpiCard
          label={es.compras.kpiTotal}
          cents={spend.totalCents}
          sub={
            <>
              {spend.count} {plural(spend.count, es.compras.kpiTotalSubOne, es.compras.kpiTotalSub)}
              {spend.missingCount > 0 && ` · ${spend.missingCount} ${es.compras.kpiMissingSuffix}`}
              <br />
              {spend.productCount}{' '}
              {plural(spend.productCount, es.compras.kpiTotalProduct, es.compras.kpiTotalProducts)}
            </>
          }
        />
        <KpiCard
          label={es.compras.kpiThisMonth}
          cents={spend.thisMonthCents}
          tone="info"
          sub={es.compras.kpiThisMonthSub}
        />
      </div>

      <OverlapWarning store={store} />

      <Panel
        label={`${es.compras.panel} · ${scenario.purchases.length}`}
        tone="blue"
        actions={<span>{es.compras.noteShort}</span>}
      >
        <FilterBar>
          <FilterLabel>{es.compras.filterView}</FilterLabel>
          <Chip on={view === 'all'} onClick={() => setView('all')}>
            {es.compras.filterAll}
          </Chip>
          <Chip on={view === 'month'} onClick={() => setView('month')}>
            {es.compras.filterMonth}
          </Chip>
          <select
            className="chip spacer"
            value={category}
            aria-label={es.compras.colCategory}
            onChange={(event) => setCategory(event.target.value as Category | 'all')}
          >
            <option value="all">{es.compras.colCategory}</option>
            {store.state.categories.map((taxon) => (
              <option key={taxon.id} value={taxon.id}>
                {taxon.label}
              </option>
            ))}
          </select>
        </FilterBar>

        <div className="tblwrap">
          <table className="tbl-compras">
            <thead>
              <tr>
                <th>{es.compras.colDate}</th>
                <th>{es.compras.colProduct}</th>
                <th>{es.compras.colCategory}</th>
                <th className="r">{es.compras.colAmount}</th>
                <th>{es.compras.colNote}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((purchase) => (
                <Row
                  key={purchase.id}
                  purchase={purchase}
                  store={store}
                  categoryIds={categoryIds}
                  categoryLabels={categoryLabels}
                />
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-note">
                      {scenario.purchases.length === 0 ? es.compras.emptyLog : es.compras.emptyMonth}
                    </div>
                  </td>
                </tr>
              )}

              <tr className="tot">
                <td colSpan={5}>
                  <div className="totstrip">
                    <span>
                      {es.compras.totalRow} · {rows.length}{' '}
                      {plural(rows.length, es.compras.kpiTotalSubOne, es.compras.kpiTotalSub)}
                    </span>
                    <div className="tgap" />
                    <div className="tcol">
                      {es.compras.colTotal}
                      <span className="tv neg">{formatEUR(shown)}</span>
                    </div>
                    <div className="tcol">
                      {es.compras.colMonthly}
                      <span className="tv quiet">{formatEUR(spend.monthlyCents)}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <AddRow
          label={es.compras.add}
          onClick={() => store.addPurchase({ product: es.compras.newProduct })}
        />
      </Panel>

      <Panel
        label={es.compras.panelProducts}
        actions={<span>{es.compras.panelProductsNote}</span>}
        body={products.length === 0 ? <div className="empty-note">{es.compras.emptyProducts}</div> : undefined}
      >
        {products.length > 0 && (
          <div className="tblwrap">
            <table className="tbl-prod">
              <thead>
                <tr>
                  <th>{es.compras.colProduct}</th>
                  <th className="r">{es.compras.colTimes}</th>
                  <th className="r">{es.compras.colTotal}</th>
                  <th className="r">{es.compras.colAverage}</th>
                  <th className="r">{es.compras.colMonthly}</th>
                  <th className="r">{es.compras.colShare}</th>
                  <th>{es.compras.colLast}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((line) => (
                  <tr key={line.key}>
                    <td>{line.product}</td>
                    <td className="r cell-mono">{line.count}</td>
                    <td className="r cell-mono">{formatEUR(line.totalCents)}</td>
                    <td className="r cell-mono">{formatEUR(line.averageCents)}</td>
                    <td className="r cell-mono">{formatEUR(line.monthlyCents)}</td>
                    <td className="r cell-mono">
                      {line.percent === null ? es.common.none : formatPercent(line.percent)}
                    </td>
                    <td className="cell-note">{formatDate(line.lastDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="micro">{es.compras.note}</p>
      <p className="micro">{es.compras.windowNote}</p>
    </div>
  );
}
